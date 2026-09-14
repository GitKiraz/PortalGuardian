import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";
import { REQUEST_STATUS_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Capacitação" };

export default async function TrainingPage() {
  const user = await requireUser();
  const [courses, lastRequest] = await Promise.all([
    prisma.course.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: { lessons: { select: { id: true, progress: { where: { userId: user.id }, select: { userId: true } } } } },
    }),
    prisma.promotionRequest.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Capacitação"
        subtitle="Vídeo aulas da Guardian Mauá. Conclua a Capacitação 1 para se tornar Pleno."
        actions={
          lastRequest && (
            <Badge tone={lastRequest.status === "APROVADO" ? "success" : lastRequest.status === "PENDENTE" ? "warning" : "danger"}>
              Promoção a Pleno: {REQUEST_STATUS_LABELS[lastRequest.status]}
            </Badge>
          )
        }
      />
      {lastRequest?.status === "REJEITADO" && lastRequest.note && (
        <p className="mb-6 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm">
          Observação da coordenação: {lastRequest.note}
        </p>
      )}
      {courses.length === 0 ? (
        <Empty>Nenhum curso cadastrado ainda.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const done = course.lessons.filter((l) => l.progress.length > 0).length;
            const total = course.lessons.length;
            const percent = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={course.id} href={`/capacitacao/${course.id}`} className="card block transition-colors hover:border-accent/60">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{course.title}</h2>
                  {course.requiredForPleno && <Badge tone="accent">Requisito para virar Pleno</Badge>}
                </div>
                {course.description && <p className="mt-2 text-sm text-muted">{course.description}</p>}
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {total === 0 ? "Aulas em breve" : `${done} de ${plural(total, "aula")} · ${percent}%`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
