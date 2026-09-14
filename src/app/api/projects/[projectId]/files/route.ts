import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getActiveUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { canAccessProject } from "@/lib/permissions";
import { uploadDir, uploadPath } from "@/lib/uploads";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/files">) {
  const { projectId } = await ctx.params;
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { area: true, members: { select: { userId: true } } },
  });
  if (!project || !canAccessProject(user, project)) {
    return Response.json({ error: "Projeto não encontrado" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const files = (formData?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return Response.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
  if (tooBig) return Response.json({ error: `"${tooBig.name}" passa de 100 MB` }, { status: 413 });

  await mkdir(uploadDir(), { recursive: true });
  for (const file of files) {
    const extension = path.extname(file.name).replace(/[^.\w]/g, "").slice(0, 16);
    const storedName = `${randomUUID()}${extension}`;
    await writeFile(uploadPath(storedName), Buffer.from(await file.arrayBuffer()));
    await prisma.projectFile.create({
      data: {
        projectId,
        uploaderId: user.id,
        originalName: file.name.slice(0, 255),
        storedName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      },
    });
  }

  return Response.json({ uploaded: files.length }, { status: 201 });
}
