"use server";

import type { ActionState } from "@/components/forms";
import { optionalText, PermissionError, refreshPortal, text } from "@/lib/action-utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateInput, todayInput } from "@/lib/format";
import { canAccessArea } from "@/lib/permissions";

export async function createHourEntry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const date = text(formData, "date");
  const hours = Number(text(formData, "hours").replace(",", "."));
  const activity = text(formData, "activity");
  const areaId = optionalText(formData, "areaId");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Informe a data" };
  if (date > todayInput()) return { error: "Não é possível registrar horas no futuro" };
  if (!(hours > 0 && hours <= 24)) return { error: "As horas precisam estar entre 0 e 24" };
  if (activity.length < 5) return { error: "Descreva a atividade realizada" };
  if (areaId) {
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    if (!area || !canAccessArea(user, area)) return { error: "Área inválida" };
  }

  await prisma.hourEntry.create({
    data: { userId: user.id, date: parseDateInput(date), hours, activity: activity.slice(0, 2000), areaId },
  });
  refreshPortal();
  return { success: `${hours.toLocaleString("pt-BR")} h registradas no seu banco de horas` };
}

export async function deleteHourEntry(entryId: string) {
  const user = await requireUser();
  const entry = await prisma.hourEntry.findUnique({ where: { id: entryId } });
  if (!entry) return;
  if (entry.userId !== user.id || entry.status !== "VALIDO") throw new PermissionError();

  await prisma.hourEntry.delete({ where: { id: entryId } });
  refreshPortal();
}
