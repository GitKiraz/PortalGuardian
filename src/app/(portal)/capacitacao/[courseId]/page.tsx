import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/forms";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { youtubeId } from "@/lib/youtube";
import { setLessonCompleted } from "../actions";

export async function generateMetadata({ params }: PageProps<"/capacitacao/[courseId]">): Promise<Metadata> {
  const course = await prisma.course.findUnique({ where: { id: (await params).courseId }, select: { title: true } });
  return { title: course?.title ?? "Capacitação" };
}

export default async function CoursePage({ params, searchParams }: PageProps<"/capacitacao/[courseId]">) {
  const [{ courseId }, { aula }] = await Promise.all([params, searchParams]);
  const user = await requireUser();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { progress: { where: { userId: user.id }, select: { userId: true } } },
      },
    },
  });
  if (!course) notFound();
  const pendingPromotion =
    user.role === "JUNIOR"
      ? await prisma.promotionRequest.findFirst({ where: { userId: user.id, status: "PENDENTE" }, select: { id: true } })
      : null;

  const lessons = course.lessons.map((lesson) => ({ ...lesson, done: lesson.progress.length > 0 }));
  const current = lessons.find((l) => l.id === aula) ?? lessons.find((l) => !l.done) ?? lessons[0];
  const currentIndex = current ? lessons.indexOf(current) : -1;
  const next = lessons[currentIndex + 1];
  const videoId = current ? youtubeId(current.youtubeUrl) : null;
  const doneCount = lessons.filter((l) => l.done).length;

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle={`${doneCount} de ${plural(lessons.length, "aula concluída", "aulas concluídas")}`}
        back={{ href: "/capacitacao", label: "Capacitação" }}
        actions={course.requiredForPleno && <Badge tone="accent">Requisito para virar Pleno</Badge>}
      />

      {lessons.length > 0 && doneCount === lessons.length && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
          🎉 Você concluiu todas as aulas deste curso.
          {pendingPromotion && " Sua promoção a Pleno foi enviada e aguarda aprovação da coordenação."}
        </div>
      )}

      {!current ? (
        <Empty>Este curso ainda não tem aulas.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="aspect-video overflow-hidden rounded-xl border border-line bg-black">
              {videoId ? (
                <YouTubePlayer key={videoId} videoId={videoId} title={current.title} />
              ) : (
                <p className="grid size-full place-items-center text-sm text-muted">Link de vídeo inválido.</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Aula {currentIndex + 1}</p>
                <h2 className="text-lg font-semibold">{current.title}</h2>
                {current.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{current.description}</p>}
              </div>
              <div className="flex gap-2">
                <form action={setLessonCompleted.bind(null, current.id, !current.done)}>
                  <SubmitButton className={current.done ? "btn btn-ghost" : "btn btn-primary"}>
                    {current.done ? "✓ Concluída · desmarcar" : "Marcar como concluída"}
                  </SubmitButton>
                </form>
                {next && (
                  <Link href={`/capacitacao/${course.id}?aula=${next.id}`} className="btn btn-ghost">
                    Próxima →
                  </Link>
                )}
              </div>
            </div>
          </div>

          <aside className="card h-fit p-2">
            <ol className="space-y-0.5">
              {lessons.map((lesson, index) => (
                <li key={lesson.id}>
                  <Link
                    href={`/capacitacao/${course.id}?aula=${lesson.id}`}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                      lesson.id === current.id ? "bg-accent/15 text-accent-text" : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                        lesson.done ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-muted"
                      }`}
                    >
                      {lesson.done ? "✓" : index + 1}
                    </span>
                    <span className="line-clamp-2">{lesson.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </>
  );
}
