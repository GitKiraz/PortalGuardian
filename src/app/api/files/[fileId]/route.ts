import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessProject } from "@/lib/permissions";
import { canDisplayInline, uploadPath } from "@/lib/uploads";

export async function GET(request: Request, ctx: RouteContext<"/api/files/[fileId]">) {
  const { fileId } = await ctx.params;
  const user = await getActiveUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    include: { project: { include: { area: true, members: { select: { userId: true } } } } },
  });
  if (!file || !canAccessProject(user, file.project)) return new Response("Arquivo não encontrado", { status: 404 });

  const filePath = uploadPath(file.storedName);
  const info = await stat(filePath).catch(() => null);
  if (!info) return new Response("Arquivo não encontrado no disco", { status: 404 });

  const inline = new URL(request.url).searchParams.has("view") && canDisplayInline(file.mimeType);
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`;

  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    headers: {
      "Content-Type": inline ? file.mimeType : "application/octet-stream",
      "Content-Length": String(info.size),
      "Content-Disposition": disposition,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
      // Imagens e texto abertos no navegador rodam isolados (o visualizador de PDF do Chrome não funciona com sandbox).
      ...(inline && file.mimeType !== "application/pdf" ? { "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'" } : {}),
    },
  });
}
