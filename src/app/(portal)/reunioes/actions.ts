"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/forms";
import { optionalText, PermissionError, refreshPortal, text } from "@/lib/action-utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateTimeInput } from "@/lib/format";
import { canManageArea, isCoordination } from "@/lib/permissions";

/**
 * Cria uma reunião com sala de voz/texto.
 * Escopo: projectId (reunião do projeto) ou scope = id da área | "coordenacao".
 */
export async function createMeeting(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const title = text(formData, "title");
  const startsAtRaw = text(formData, "startsAt");
  const durationMin = Number(text(formData, "durationMin")) || null;
  if (title.length < 3) return { error: "Informe o título da reunião" };
  if (!startsAtRaw) return { error: "Informe data e hora" };
  const startsAt = parseDateTimeInput(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) return { error: "Data inválida" };

  let areaId: string | null = null;
  const projectId = optionalText(formData, "projectId");
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { area: true } });
    if (!project || !canManageArea(user, project.area)) return { error: "Sem permissão para este projeto" };
    areaId = project.areaId;
  } else {
    const scope = text(formData, "scope") || "coordenacao";
    if (scope === "coordenacao") {
      if (!isCoordination(user)) return { error: "Sem permissão" };
    } else {
      const area = await prisma.area.findUnique({ where: { id: scope } });
      if (!area || !canManageArea(user, area)) return { error: "Você só pode criar reuniões na sua área" };
      areaId = area.id;
    }
  }

  await prisma.meeting.create({
    data: {
      title,
      description: optionalText(formData, "description"),
      location: optionalText(formData, "location"),
      startsAt,
      durationMin,
      areaId,
      projectId,
      creatorId: user.id,
      room: { create: { kind: "REUNIAO", name: title } },
    },
  });
  refreshPortal();
  return { success: "Reunião agendada" };
}

export async function deleteMeeting(meetingId: string) {
  const user = await requireUser();
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId }, include: { area: true } });
  if (!meeting) return;
  const allowed =
    meeting.creatorId === user.id || (meeting.area ? canManageArea(user, meeting.area) : isCoordination(user));
  if (!allowed) throw new PermissionError();

  await prisma.meeting.delete({ where: { id: meetingId } });
  refreshPortal();
  redirect("/");
}
