import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatHours, parseDateInput, todayInput } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import { invalidateHourEntry, restoreHourEntry } from "../actions";

export const metadata: Metadata = { title: "Planilha de horas" };

const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export default async function HoursSheetPage({ searchParams }: PageProps<"/coordenacao/horas">) {
  await requireCoordination();
  const params = await searchParams;
  const today = todayInput();
  const from = isDate(params.de) ? params.de : `${today.slice(0, 7)}-01`;
  const to = isDate(params.ate) ? params.ate : today;
  const areaId = typeof params.area === "string" && params.area ? params.area : undefined;
  const selectedUserId = typeof params.aluno === "string" ? params.aluno : undefined;

  const periodWhere = {
    status: "VALIDO" as const,
    date: { gte: parseDateInput(from), lte: parseDateInput(to) },
    ...(areaId ? { areaId } : {}),
  };

  const [users, periodSums, totalSums, areas, selected] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ATIVO" },
      include: { coordinatedArea: { select: { name: true } }, areaMemberships: { include: { area: { select: { name: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.hourEntry.groupBy({ by: ["userId"], where: periodWhere, _sum: { hours: true }, _count: { _all: true } }),
    prisma.hourEntry.groupBy({ by: ["userId"], where: { status: "VALIDO" }, _sum: { hours: true } }),
    prisma.area.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    selectedUserId
      ? prisma.user.findUnique({
          where: { id: selectedUserId },
          include: {
            hourEntries: {
              where: { date: periodWhere.date, ...(areaId ? { areaId } : {}) },
              include: { area: { select: { name: true } }, reviewer: { select: { name: true } } },
              orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            },
          },
        })
      : null,
  ]);

  const period = new Map(periodSums.map((s) => [s.userId, { hours: Number(s._sum.hours ?? 0), count: s._count._all }]));
  const totals = new Map(totalSums.map((s) => [s.userId, Number(s._sum.hours ?? 0)]));
  const rows = users
    .map((u) => ({ user: u, period: period.get(u.id) ?? { hours: 0, count: 0 }, total: totals.get(u.id) ?? 0 }))
    .sort((a, b) => b.period.hours - a.period.hours || a.user.name.localeCompare(b.user.name));
  const periodTotal = rows.reduce((sum, r) => sum + r.period.hours, 0);
  const activeInPeriod = rows.filter((r) => r.period.hours > 0).length;

  const query = new URLSearchParams({ de: from, ate: to, ...(areaId ? { area: areaId } : {}) });

  return (
    <>
      <PageHeader
        title="Planilha de horas"
        subtitle="Banco de horas de todos os alunos, alimentado pelos registros de cada um."
        actions={
          <>
            <a href={`/api/export/horas?${query}`} className="btn btn-ghost">
              ⬇ Exportar planilha
            </a>
            <a href={`/api/export/horas?${query}&detalhado=1`} className="btn btn-ghost">
              ⬇ Exportar registros detalhados
            </a>
          </>
        }
      />

      <form className="card mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Field label="De">
          <input className="input" type="date" name="de" defaultValue={from} />
        </Field>
        <Field label="Até">
          <input className="input" type="date" name="ate" defaultValue={to} />
        </Field>
        <Field label="Área">
          <select className="input" name="area" defaultValue={areaId ?? ""}>
            <option value="">Todas (inclui Geral)</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn btn-primary">Filtrar</button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Horas no período" value={formatHours(periodTotal)} />
        <Stat label="Alunos com horas" value={`${activeInPeriod} / ${rows.length}`} />
        <Stat label="Média por aluno ativo" value={formatHours(activeInPeriod ? periodTotal / activeInPeriod : 0)} />
      </div>

      {selected && (
        <Card
          id="registros"
          title={`Registros de ${selected.name}`}
          className="mb-6 scroll-mt-6"
          actions={
            <Link href={`/coordenacao/horas?${query}`} className="btn btn-ghost btn-sm">
              Fechar
            </Link>
          }
        >
          {selected.hourEntries.length === 0 ? (
            <Empty>Nenhum registro no período.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horas</th>
                    <th>Área</th>
                    <th>Atividade</th>
                    <th>Validação</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.hourEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="whitespace-nowrap tabular-nums">{formatHours(entry.hours)}</td>
                      <td>{entry.area?.name ?? "Geral"}</td>
                      <td className="min-w-64 whitespace-pre-wrap">{entry.activity}</td>
                      <td className="min-w-64">
                        {entry.status === "VALIDO" ? (
                          <ActionForm action={invalidateHourEntry.bind(null, entry.id)} className="flex gap-2">
                            <input className="input" name="note" placeholder="Motivo" aria-label="Motivo da invalidação" />
                            <button className="btn btn-danger btn-sm">Invalidar</button>
                          </ActionForm>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge tone="danger">Invalidado</Badge>
                            <span className="text-xs text-muted">
                              {entry.reviewer?.name}
                              {entry.reviewNote ? `: ${entry.reviewNote}` : ""}
                            </span>
                            <form action={restoreHourEntry.bind(null, entry.id)}>
                              <SubmitButton className="btn btn-ghost btn-sm">Restaurar</SubmitButton>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Cargo</th>
              <th>Áreas</th>
              <th className="text-right">Registros</th>
              <th className="text-right">Horas no período</th>
              <th className="text-right">Total geral</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, period, total }) => (
              <tr key={user.id}>
                <td>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted">{user.ra ? `RA ${user.ra}` : user.email}</p>
                </td>
                <td className="whitespace-nowrap">{roleLabel(user)}</td>
                <td className="text-xs text-muted">{user.areaMemberships.map((m) => m.area.name).join(", ") || "—"}</td>
                <td className="text-right tabular-nums">{period.count}</td>
                <td className="text-right font-medium tabular-nums">{formatHours(period.hours)}</td>
                <td className="text-right tabular-nums text-muted">{formatHours(total)}</td>
                <td>
                  <Link href={`/coordenacao/horas?${query}&aluno=${user.id}#registros`} className="btn btn-ghost btn-sm">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
