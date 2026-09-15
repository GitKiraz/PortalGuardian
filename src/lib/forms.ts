import { z } from "zod";
import { FIELD_TYPES } from "./form-fields";

export { FIELD_TYPE_LABELS, FIELD_TYPES } from "./form-fields";

export const formFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, "Toda pergunta precisa de um título").max(300),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1)).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type Answers = Record<string, string | boolean>;

/** Lê o JSON de campos salvo no banco. */
export function parseStoredFields(raw: unknown): FormField[] {
  const parsed = z.array(formFieldSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function parseStoredAnswers(raw: unknown): Answers {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Answers) : {};
}

/** Lê o campo hidden "fields" enviado pelo FormBuilder. */
export function parseFieldsInput(value: FormDataEntryValue | null): { fields: FormField[] } | { error: string } {
  try {
    const parsed = z.array(formFieldSchema).safeParse(JSON.parse(String(value ?? "[]")));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Perguntas inválidas" };
    for (const field of parsed.data) {
      if (field.type === "select" && (!field.options || field.options.length < 2)) {
        return { error: `A pergunta "${field.label}" precisa de pelo menos 2 opções` };
      }
    }
    return { fields: parsed.data };
  } catch {
    return { error: "Perguntas inválidas" };
  }
}

export const fieldInputName = (field: FormField) => `field_${field.id}`;

/** Extrai e valida as respostas de um formulário renderizado com <FormFields>. */
export function collectAnswers(fields: FormField[], formData: FormData): { answers: Answers } | { error: string } {
  const answers: Answers = {};
  for (const field of fields) {
    const raw = formData.get(fieldInputName(field));
    if (field.type === "checkbox") {
      answers[field.id] = raw === "on";
      if (field.required && raw !== "on") return { error: `Marque "${field.label}"` };
      continue;
    }
    const value = String(raw ?? "").trim();
    if (field.required && !value) return { error: `Responda "${field.label}"` };
    if (value.length > 5000) return { error: `Resposta muito longa em "${field.label}"` };
    if (field.type === "select" && value && !field.options?.includes(value)) {
      return { error: `Opção inválida em "${field.label}"` };
    }
    if (field.type === "number" && value && Number.isNaN(Number(value))) {
      return { error: `"${field.label}" precisa ser um número` };
    }
    answers[field.id] = value;
  }
  return { answers };
}

export function answerText(field: FormField, answers: Answers) {
  const value = answers[field.id];
  if (field.type === "checkbox") return value ? "Sim" : "Não";
  return value === undefined || value === "" ? "—" : String(value);
}
