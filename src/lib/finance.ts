import type { FinanceType } from "@/generated/prisma/enums";

type Group = { type: FinanceType; _sum: { amount: { toString(): string } | null } };

export function summarize(groups: Group[]) {
  const sum = (type: FinanceType) => Number(groups.find((g) => g.type === type)?._sum.amount ?? 0);
  const income = sum("ENTRADA");
  const expense = sum("SAIDA");
  return { income, expense, balance: income - expense };
}

export const FINANCE_CATEGORIES = [
  "Patrocínio",
  "Contribuição de membros",
  "Eventos",
  "Materiais",
  "Alimentação",
  "Infraestrutura",
  "Premiações",
  "Outros",
];

/** Aceita "1.234,56", "1234,56" ou "1234.56". */
export function parseAmount(value: string) {
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  return Number(normalized);
}
