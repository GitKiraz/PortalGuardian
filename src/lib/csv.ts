type Cell = string | number | boolean | null | undefined;

function escape(cell: Cell) {
  const text = cell === null || cell === undefined ? "" : String(cell);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Número com vírgula decimal (Excel pt-BR). */
export const decimal = (value: number) => value.toFixed(2).replace(".", ",");

/** CSV com ";" e BOM — abre direto no Excel / Google Sheets em pt-BR. */
export function csvResponse(filename: string, header: string[], rows: Cell[][]) {
  const body = [header, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
  return new Response(`\uFEFF${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
