import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatHours, parseDateInput, todayInput, toNumber } from "@/lib/format";
import { getAccessibleAreas } from "@/lib/queries";
import { createHourEntry, deleteHourEntry } from "./actions";

export const metadata: Metadata = { title: "Banco de horas" };

export default async function HoursPage() {
  const user = await requireUser();
  const today = todayInput();
  const monthStart = parseDateInput(`${today.slice(0, 7)}-01`);

  const [entries, areas] = await Promise.all([
    prisma.hourEntry.findMany({
      where: { userId: user.id },
      include: { area: { select: { name: true } }, reviewer: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    getAccessibleAreas(user),
  ]);

  const valid = entries.filter((e) => e.status === "VALIDO");
  const total = valid.reduce((sum, e) => sum + toNumber(e.hours), 0);
  const month = valid.filter((e) => e.date >= monthStart).reduce((sum, e) => sum + toNumber(e.hours), 0);

  return (
    <>
      <PageHeader
        title="Banco de horas"
        subtitle="Registre as horas dedicadas à Guardian. A coordenação acompanha o total de cada aluno."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total" value={formatHours(total)} />
        <Stat label="Este mês" value={formatHours(month)} />
        <Stat label="Registros" value={entries.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card title="Registrar horas" className="h-fit">
          <ActionForm action={createHourEntry} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <input className="input" type="date" name="date" defaultValue={today} max={today} required />
              </Field>
              <Field label="Horas">
                <input className="input" type="number" name="hours" min={0.25} max={24} step={0.25} required placeholder="2" />
              </Field>
            </div>
            <Field label="Área">
              <select className="input" name="areaId" defaultValue="">
                <option value="">Geral / entidade</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Atividade realizada">
              <textarea
                className="input"
                name="activity"
                rows={4}
                required
                minLength={5}
                placeholder="Ex.: Documentei o write-up da máquina X do TryHackMe"
              />
            </Field>
            <button className="btn btn-primary">Registrar</button>
          </ActionForm>
        </Card>

        <Card title="Meus registros">
          {entries.length === 0 ? (
            <Empty>Nenhuma hora registrada ainda.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horas</th>
                    <th>Área</th>
                    <th>Atividade</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className={entry.status === "INVALIDADO" ? "opacity-60" : ""}>
                      <td className="whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="whitespace-nowrap tabular-nums">{formatHours(entry.hours)}</td>
                      <td className="whitespace-nowrap">{entry.area?.name ?? "Geral"}</td>
                      <td className="min-w-64">
                        <p className="whitespace-pre-wrap">{entry.activity}</p>
                        {entry.status === "INVALIDADO" && (
                          <p className="mt-1 text-xs text-red-300">
                            <Badge tone="danger">Invalidado</Badge> {entry.reviewer?.name}
                            {entry.reviewNote ? `: ${entry.reviewNote}` : ""}
                          </p>
                        )}
                      </td>
                      <td>
                        {entry.status === "VALIDO" && (
                          <form action={deleteHourEntry.bind(null, entry.id)}>
                            <SubmitButton className="btn btn-ghost btn-sm" confirm="Excluir este registro?" icon="trash" label="Excluir" />
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
