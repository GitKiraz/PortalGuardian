import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FINANCE_CATEGORIES, summarize } from "@/lib/finance";
import { formatBRL, formatDate, todayInput, toNumber } from "@/lib/format";
import { createFinanceEntry, deleteFinanceEntry } from "../actions";

export const metadata: Metadata = { title: "Financeiro" };

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function FinancePage({ searchParams }: PageProps<"/coordenacao/financeiro">) {
  await requireCoordination();
  const params = await searchParams;
  const today = todayInput();
  const year = Number(params.ano) || Number(today.slice(0, 4));
  const month = Number(params.mes) >= 1 && Number(params.mes) <= 12 ? Number(params.mes) : null;

  const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const to = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));

  const [entries, before, overall] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { date: { gte: from, lt: to } },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.financeEntry.groupBy({ by: ["type"], where: { date: { lt: from } }, _sum: { amount: true } }),
    prisma.financeEntry.groupBy({ by: ["type"], _sum: { amount: true } }),
  ]);

  const opening = summarize(before).balance;
  const rows = entries.reduce<{ entry: (typeof entries)[number]; balance: number }[]>((acc, entry) => {
    const previous = acc.at(-1)?.balance ?? opening;
    acc.push({ entry, balance: previous + (entry.type === "ENTRADA" ? 1 : -1) * toNumber(entry.amount) });
    return acc;
  }, []);
  const income = entries.filter((e) => e.type === "ENTRADA").reduce((s, e) => s + toNumber(e.amount), 0);
  const expense = entries.filter((e) => e.type === "SAIDA").reduce((s, e) => s + toNumber(e.amount), 0);
  const periodLabel = month ? `${MONTHS[month - 1]}/${year}` : String(year);
  const query = new URLSearchParams({ ano: String(year), ...(month ? { mes: String(month) } : {}) });

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Planilha de entradas e saídas da entidade."
        actions={
          <a href={`/api/export/financeiro?${query}`} className="btn btn-ghost">
            ⬇ Exportar CSV
          </a>
        }
      />

      <form className="card mb-6 flex flex-wrap items-end gap-3">
        <Field label="Ano">
          <input className="input w-28" type="number" name="ano" defaultValue={year} min={2000} max={2100} />
        </Field>
        <Field label="Mês">
          <select className="input w-40" name="mes" defaultValue={month ?? ""}>
            <option value="">Ano inteiro</option>
            {MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn btn-primary">Filtrar</button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Entradas · ${periodLabel}`} value={<span className="text-emerald-300">{formatBRL(income)}</span>} />
        <Stat label={`Saídas · ${periodLabel}`} value={<span className="text-red-300">{formatBRL(expense)}</span>} />
        <Stat label={`Resultado · ${periodLabel}`} value={formatBRL(income - expense)} />
        <Stat label="Saldo atual em caixa" value={formatBRL(summarize(overall).balance)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {rows.length === 0 ? (
            <Empty>Nenhum lançamento em {periodLabel}.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">Saldo</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="text-xs text-muted">
                      Saldo anterior
                    </td>
                    <td className="text-right tabular-nums text-muted">{formatBRL(opening)}</td>
                    <td />
                  </tr>
                  {rows.map(({ entry, balance }) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td>
                        <p>{entry.description}</p>
                        <p className="text-xs text-muted">
                          {entry.createdBy.name}
                          {entry.notes ? ` · ${entry.notes}` : ""}
                        </p>
                      </td>
                      <td>
                        <Badge>{entry.category}</Badge>
                      </td>
                      <td
                        className={`whitespace-nowrap text-right tabular-nums ${
                          entry.type === "ENTRADA" ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {entry.type === "ENTRADA" ? "+" : "−"} {formatBRL(entry.amount)}
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">{formatBRL(balance)}</td>
                      <td>
                        <form action={deleteFinanceEntry.bind(null, entry.id)}>
                          <SubmitButton className="btn btn-ghost btn-sm" confirm="Excluir este lançamento?" icon="trash" label="Excluir" />
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Card title="Novo lançamento" className="h-fit">
          <ActionForm action={createFinanceEntry} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de lançamento">
              <label className="flex items-center justify-center gap-2 rounded-lg border border-line p-2 text-sm has-checked:border-emerald-400/50 has-checked:bg-emerald-400/10">
                <input type="radio" name="type" value="ENTRADA" required /> Entrada
              </label>
              <label className="flex items-center justify-center gap-2 rounded-lg border border-line p-2 text-sm has-checked:border-red-400/50 has-checked:bg-red-400/10">
                <input type="radio" name="type" value="SAIDA" required /> Saída
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <input className="input" type="date" name="date" defaultValue={today} required />
              </Field>
              <Field label="Valor (R$)">
                <input className="input" name="amount" inputMode="decimal" placeholder="0,00" required />
              </Field>
            </div>
            <Field label="Descrição">
              <input className="input" name="description" required placeholder="Ex.: Pizza da CTF Night" />
            </Field>
            <Field label="Categoria (opcional)">
              <input className="input" name="category" list="finance-categories" placeholder="Outros" />
              <datalist id="finance-categories">
                {FINANCE_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Observações (opcional)">
              <textarea className="input" name="notes" rows={2} />
            </Field>
            <button className="btn btn-primary">Lançar</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
