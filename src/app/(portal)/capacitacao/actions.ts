"use server";

import { redirect } from "next/navigation";
import { refreshPortal } from "@/lib/action-utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlenoProgress } from "@/lib/queries";

export async function setLessonCompleted(lessonId: string, completed: boolean) {
  const user = await requireUser();
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  if (!lesson) return;

  if (completed) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: { userId: user.id, lessonId },
      update: {},
    });
  } else {
    await prisma.lessonProgress.deleteMany({ where: { userId: user.id, lessonId } });
  }

  // Concluiu tudo que é obrigatório → gera a solicitação de promoção para a coordenação aprovar.
  if (completed && user.role === "JUNIOR" && (await getPlenoProgress(user.id)).complete) {
    const open = await prisma.promotionRequest.findFirst({
      where: { userId: user.id, status: { in: ["PENDENTE", "APROVADO"] } },
    });
    if (!open) await prisma.promotionRequest.create({ data: { userId: user.id } });
  }

  refreshPortal();
  // Permanece na mesma aula (sem isso a página pulava sozinha para a próxima pendente).
  redirect(`/capacitacao/${lesson.courseId}?aula=${lessonId}`);
}
