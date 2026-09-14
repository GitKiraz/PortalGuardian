const TZ = "America/Sao_Paulo";

type DecimalLike = number | string | { toString(): string };

export const toNumber = (value: DecimalLike) => Number(value.toString());

/** "1 membro" / "3 membros". */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export function formatDate(date: Date) {
  // Campos @db.Date chegam como meia-noite UTC; exibir em UTC evita voltar um dia.
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHours(value: DecimalLike) {
  const n = toNumber(value);
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h`;
}

export function formatBRL(value: DecimalLike) {
  return toNumber(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** "YYYY-MM-DD" de hoje no fuso de São Paulo. */
export function todayInput() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Converte "YYYY-MM-DD" em Date UTC (para colunas @db.Date). */
export function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Converte valor de <input type="datetime-local"> (horário de Brasília) em Date. */
export function parseDateTimeInput(value: string) {
  return new Date(`${value}:00-03:00`);
}

/** Date → valor para <input type="datetime-local"> no horário de Brasília. */
export function toDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
