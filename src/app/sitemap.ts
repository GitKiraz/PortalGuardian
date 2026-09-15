import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/site";

// Consulta o banco a cada acesso (e não no build, quando o banco pode não estar disponível).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const processes = await prisma.selectionProcess.findMany({
    where: { status: "INSCRICOES_ABERTAS" },
    select: { id: true, createdAt: true },
  });
  const url = (path: string) => new URL(path, siteUrl).toString();
  return [
    { url: url("/login"), changeFrequency: "yearly", priority: 0.5 },
    { url: url("/cadastro"), changeFrequency: "yearly", priority: 0.5 },
    ...processes.map((p) => ({
      url: url(`/processo-seletivo/${p.id}`),
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 1,
    })),
  ];
}
