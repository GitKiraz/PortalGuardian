// Tipos de pergunta dos formulários dinâmicos. Sem zod: é importado pelo FormBuilder (cliente),
// e o zod no navegador aumentaria o bundle e dispararia o teste de `new Function` barrado pelo CSP.
export const FIELD_TYPES = ["text", "textarea", "number", "select", "checkbox"] as const;

export const FIELD_TYPE_LABELS: Record<(typeof FIELD_TYPES)[number], string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  number: "Número",
  select: "Múltipla escolha",
  checkbox: "Caixa de seleção (sim/não)",
};
