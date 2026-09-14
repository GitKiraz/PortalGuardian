import { getActiveUser } from "@/lib/auth";
import { csvResponse, decimal } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { formatDate, parseDateInput, todayInput } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import { isCoordination } from "@/lib/permissions";

const isDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** ?de=YYYY-MM-DD&ate=YYYY-MM-DD&area=id[&detalhado=1] */
export async function GET(request: Request) {
  const user = await getActiveUser();
  if (!user || !isCoordination(user)) return new Response("Sem permissão", { status: 403 });

  const params = new URL(request.url).searchParams;
  const today = todayInput();
  const from = isDate(params.get("de")) ? params.get("de")! : `${today.slice(0, 7)}-01`;
  const to = isDate(params.get("ate")) ? params.get("ate")! : today;
  const areaId = params.get("area") || undefined;
  const date = { gte: parseDateInput(from), lte: parseDateInput(to) };

  if (params.get("detalhado")) {
    const entries = await prisma.hourEntry.findMany({
      where: { date, ...(areaId ? { areaId } : {}) },
      include: { user: { select: { name: true, email: true } }, area: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    return csvResponse(
      `registros-horas_${from}_${to}.csv`,
      ["Data", "Aluno", "Email", "Área", "Horas", "Atividade", "Status"],
      entries.map((e) => [
        formatDate(e.date),
        e.user.name,
        e.user.email,
        e.area?.name ?? "Geral",
        decimal(Number(e.hours)),
        e.activity,
        e.status === "VALIDO" ? "Válido" : "Invalidado",
      ]),
    );
  }

  const [users, period, totals] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ATIVO" },
      include: { coordinatedArea: { select: { name: true } }, areaMemberships: { include: { area: { select: { name: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.hourEntry.groupBy({
      by: ["userId"],
      where: { status: "VALIDO", date, ...(areaId ? { areaId } : {}) },
      _sum: { hours: true },
      _count: { _all: true },
    }),
    prisma.hourEntry.groupBy({ by: ["userId"], where: { status: "VALIDO" }, _sum: { hours: true } }),
  ]);

  return csvResponse(
    `planilha-horas_${from}_${to}.csv`,
    ["Aluno", "Email", "RA", "Curso", "Cargo", "Áreas", `Registros (${from} a ${to})`, `Horas (${from} a ${to})`, "Total geral"],
    users.map((u) => {
      const p = period.find((s) => s.userId === u.id);
      const t = totals.find((s) => s.userId === u.id);
      return [
        u.name,
        u.email,
        u.ra,
        u.course,
        roleLabel(u),
        u.areaMemberships.map((m) => m.area.name).join(", "),
        p?._count._all ?? 0,
        decimal(Number(p?._sum.hours ?? 0)),
        decimal(Number(t?._sum.hours ?? 0)),
      ];
    }),
  );
}
