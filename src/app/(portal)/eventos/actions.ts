"use server";

import type { Attendance } from "@/generated/prisma/enums";
import type { ActionState } from "@/components/forms";
import { refreshPortal, text } from "@/lib/action-utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { collectAnswers, parseStoredFields } from "@/lib/forms";
import { canSeeEvent } from "@/lib/permissions";

const ATTENDANCES: Attendance[] = ["SIM", "NAO", "TALVEZ"];

export async function respondEvent(eventId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !canSeeEvent(user, event)) return { error: "Evento não encontrado" };

  const now = new Date();
  if (event.startsAt < now || (event.rsvpDeadline && event.rsvpDeadline < now)) {
    return { error: "As respostas para este evento foram encerradas" };
  }

  const attendance = text(formData, "attendance") as Attendance;
  if (!ATTENDANCES.includes(attendance)) return { error: "Informe se vai comparecer" };

  if (attendance === "SIM" && event.capacity) {
    const confirmed = await prisma.eventResponse.count({
      where: { eventId, attendance: "SIM", userId: { not: user.id } },
    });
    if (confirmed >= event.capacity) return { error: "As vagas deste evento esgotaram" };
  }

  // Quem não vai não precisa preencher as perguntas obrigatórias.
  const fields = parseStoredFields(event.fields);
  const collected = collectAnswers(attendance === "NAO" ? fields.map((f) => ({ ...f, required: false })) : fields, formData);
  if ("error" in collected) return { error: collected.error };

  await prisma.eventResponse.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, attendance, answers: collected.answers },
    update: { attendance, answers: collected.answers },
  });
  refreshPortal();
  return { success: "Resposta registrada!" };
}
