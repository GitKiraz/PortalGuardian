import path from "node:path";

// turbopackIgnore: a pasta de uploads é definida em runtime e não deve entrar no trace do build.
export const uploadDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./storage/uploads");

export const uploadPath = (storedName: string) => path.join(/*turbopackIgnore: true*/ uploadDir(), path.basename(storedName));

// Tipos exibidos no navegador; o resto é sempre baixado (evita HTML/SVG executando no domínio do portal).
const INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain"]);

export const canDisplayInline = (mimeType: string) => INLINE_TYPES.has(mimeType);
