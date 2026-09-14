"use server";

import { redirect } from "next/navigation";
import type { EventAudience } from "@/generated/prisma/enums";
import type { ActionState } from "@/components/forms";
import { optionalText, refreshPortal, text } from "@/lib/action-utils";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateTimeInput } from "@/lib/format";
import { parseFieldsInput } from "@/lib/forms";

const AUDIENCES: EventAudience[] = ["TODOS", "PLENOS", "COORDENACAO"];

function readEvent(formData: FormData) {
  const title = text(formData, "title");
  const startsAtRaw = text(formData, "startsAt");
  const deadlineRaw = text(formData, "rsvpDeadline");
  const capacity = Number(text(formData, "capacity")) || null;
  const audience = text(formData, "audience") as EventAudience;

  if (title.length < 3) return { error: "Informe o título do evento" };
  if (!startsAtRaw) return { error: "Informe a data do evento" };
  if (!AUDIENCES.includes(audience)) return { error: "Público inválido" };
  const fields = parseFieldsInput(formData.get("fields"));
  if ("error" in fields) return { error: fields.error };

  const startsAt = parseDateTimeInput(startsAtRaw);
  const rsvpDeadline = deadlineRaw ? parseDateTimeInput(deadlineRaw) : null;
  if (Number.isNaN(startsAt.getTime()) || (rsvpDeadline && Number.isNaN(rsvpDeadline.getTime()))) {
    return { error: "Data inválida" };
  }

  return {
    data: {
      title,
      description: optionalText(formData, "description"),
      location: optionalText(formData, "location"),
      startsAt,
      rsvpDeadline,
      capacity: capacity && capacity > 0 ? Math.floor(capacity) : null,
      audience,
      fields: fields.fields,
    },
  };
}

export async function createEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoordination();
  const parsed = readEvent(formData);
  if ("error" in parsed) return { error: parsed.error };

  const event = await prisma.event.create({ data: { ...parsed.data, creatorId: user.id } });
  refreshPortal();
  redirect(`/coordenacao/eventos/${event.id}`);
}

export async function updateEvent(eventId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordination();
  const parsed = readEvent(formData);
  if ("error" in parsed) return { error: parsed.error };

  await prisma.event.update({ where: { id: eventId }, data: parsed.data });
  refreshPortal();
  return { success: "Evento salvo" };
}

export async function deleteEvent(eventId: string) {
  await requireCoordination();
  await prisma.event.delete({ where: { id: eventId } });
  refreshPortal();
  redirect("/coordenacao/eventos");
}
