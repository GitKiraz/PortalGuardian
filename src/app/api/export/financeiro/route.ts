import { getActiveUser } from "@/lib/auth";
import { csvResponse, decimal } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { summarize } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { isCoordination } from "@/lib/permissions";

/** ?ano=2026[&mes=9] */
export async function GET(request: Request) {
  const user = await getActiveUser();
  if (!user || !isCoordination(user)) return new Response("Sem permissão", { status: 403 });

  const params = new URL(request.url).searchParams;
  const year = Number(params.get("ano")) || new Date().getFullYear();
  const monthParam = Number(params.get("mes"));
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam : null;
  const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const to = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));

  const [entries, before] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { date: { gte: from, lt: to } },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.financeEntry.groupBy({ by: ["type"], where: { date: { lt: from } }, _sum: { amount: true } }),
  ]);

  let balance = summarize(before).balance;
  const rows = entries.map((e) => {
    const signed = (e.type === "ENTRADA" ? 1 : -1) * Number(e.amount);
    balance += signed;
    return [
      formatDate(e.date),
      e.type === "ENTRADA" ? "Entrada" : "Saída",
      e.category,
      e.description,
      decimal(signed),
      decimal(balance),
      e.createdBy.name,
      e.notes,
    ];
  });

  const label = month ? `${year}-${String(month).padStart(2, "0")}` : String(year);
  return csvResponse(
    `financeiro_${label}.csv`,
    ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)", "Saldo (R$)", "Lançado por", "Observações"],
    rows,
  );
}
