import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";
import { createCourse, createLesson, deleteCourse, deleteLesson, updateCourse, updateLesson } from "../actions";

export const metadata: Metadata = { title: "Gerenciar capacitação" };

function CourseFields({ course }: { course?: { title: string; description: string | null; order: number; requiredForPleno: boolean } }) {
  return (
    <>
      <Field label="Título" className="sm:col-span-2">
        <input className="input" name="title" required defaultValue={course?.title} />
      </Field>
      <Field label="Descrição" className="sm:col-span-2">
        <textarea className="input" name="description" rows={2} defaultValue={course?.description ?? ""} />
      </Field>
      <Field label="Ordem">
        <input className="input" type="number" name="order" defaultValue={course?.order ?? 0} />
      </Field>
      <label className="flex items-start gap-2 self-end pb-2 text-sm sm:col-span-2">
        <input type="checkbox" name="requiredForPleno" defaultChecked={course?.requiredForPleno} className="mt-0.5" />
        <span>
          Requisito para virar Pleno
          <span className="block text-xs text-muted">
            Juniors precisam concluir todas as aulas deste curso para pedir a promoção a Pleno.
          </span>
        </span>
      </label>
    </>
  );
}

function LessonFields({ lesson }: { lesson?: { title: string; youtubeUrl: string; description: string | null; order: number } }) {
  return (
    <>
      <Field label="Título da aula" className="sm:col-span-2">
        <input className="input" name="title" required defaultValue={lesson?.title} />
      </Field>
      <Field label="Link do YouTube" className="sm:col-span-2">
        <input className="input" name="youtubeUrl" type="url" required defaultValue={lesson?.youtubeUrl} placeholder="https://youtu.be/…" />
      </Field>
      <Field label="Descrição / materiais" className="sm:col-span-2">
        <textarea className="input" name="description" rows={2} defaultValue={lesson?.description ?? ""} />
      </Field>
      <Field label="Ordem">
        <input className="input" type="number" name="order" defaultValue={lesson?.order ?? 0} />
      </Field>
    </>
  );
}

export default async function ManageTrainingPage() {
  await requireCoordination();
  const courses = await prisma.course.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { _count: { select: { progress: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="Gerenciar capacitação"
        subtitle="Cursos e vídeo aulas. Quando um Junior conclui todos os cursos marcados como requisito, é gerada uma solicitação de promoção a Pleno."
      />
      <div className="space-y-6">
        {courses.length === 0 && <Empty>Nenhum curso cadastrado.</Empty>}
        {courses.map((course) => (
          <Card
            key={course.id}
            title={
              <span className="flex items-center gap-2 normal-case tracking-normal text-neutral-100">
                {course.title}
                {course.requiredForPleno && <Badge tone="accent">Requisito para virar Pleno</Badge>}
              </span>
            }
            actions={
              <form action={deleteCourse.bind(null, course.id)}>
                <SubmitButton className="btn btn-danger btn-sm" confirm={`Excluir o curso ${course.title} e todas as aulas?`}>
                  Excluir curso
                </SubmitButton>
              </form>
            }
          >
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-accent-text">Editar curso</summary>
              <ActionForm action={updateCourse.bind(null, course.id)} className="mt-3 grid gap-3 sm:grid-cols-2" resetOnSuccess={false}>
                <CourseFields course={course} />
                <button className="btn btn-primary sm:col-span-2">Salvar curso</button>
              </ActionForm>
            </details>

            {course.lessons.length === 0 ? (
              <Empty>Nenhuma aula. Adicione a primeira abaixo.</Empty>
            ) : (
              <ol className="divide-y divide-line rounded-lg border border-line">
                {course.lessons.map((lesson, index) => (
                  <li key={lesson.id} className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {index + 1}. {lesson.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {plural(lesson._count.progress, "aluno concluiu", "alunos concluíram")} · {lesson.youtubeUrl}
                        </p>
                      </div>
                      <form action={deleteLesson.bind(null, lesson.id)}>
                        <SubmitButton className="btn btn-ghost btn-sm" confirm={`Excluir a aula ${lesson.title}?`}>
                          Excluir
                        </SubmitButton>
                      </form>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-accent-text">Editar aula</summary>
                      <ActionForm action={updateLesson.bind(null, lesson.id)} className="mt-3 grid gap-3 sm:grid-cols-2" resetOnSuccess={false}>
                        <LessonFields lesson={lesson} />
                        <button className="btn btn-primary self-end">Salvar aula</button>
                      </ActionForm>
                    </details>
                  </li>
                ))}
              </ol>
            )}

            <details className="mt-4" open={course.lessons.length === 0}>
              <summary className="cursor-pointer text-sm text-accent-text">+ Adicionar aula</summary>
              <ActionForm action={createLesson.bind(null, course.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                <LessonFields lesson={{ title: "", youtubeUrl: "", description: null, order: course.lessons.length + 1 }} />
                <button className="btn btn-primary self-end">Adicionar aula</button>
              </ActionForm>
            </details>
          </Card>
        ))}

        <Card title="Novo curso">
          <ActionForm action={createCourse} className="grid gap-3 sm:grid-cols-2">
            <CourseFields />
            <button className="btn btn-primary sm:col-span-2">Criar curso</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
