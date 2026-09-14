import { revalidatePath } from "next/cache";

export const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export const optionalText = (formData: FormData, key: string) => text(formData, key) || null;

/** Revalida todo o portal (menu, painel e listas dependem dos mesmos dados). */
export const refreshPortal = () => revalidatePath("/", "layout");

export class PermissionError extends Error {
  constructor(message = "Você não tem permissão para esta ação") {
    super(message);
  }
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
