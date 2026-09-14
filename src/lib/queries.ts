import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "./auth";
import { prisma } from "./db";
import { canAccessArea, canAccessMeeting, isCoordination, isPlenoOrAbove } from "./permissions";

export async function getAccessibleAreas(user: CurrentUser) {
  const areas = await prisma.area.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  return areas.filter((area) => canAccessArea(user, area));
}

export async function getAreaBySlug(slug: string) {
  return prisma.area.findUnique({
    where: { slug },
    include: { coordinator: { select: { id: true, name: true } } },
  });
}

/** Início da janela de "próximas reuniões": inclui as que começaram há até 3h. */
export const upcomingMeetingsCutoff = () => new Date(Date.now() - 3 * 60 * 60 * 1000);

/** Reuniões a partir de agora (com 3h de tolerância) que o usuário pode ver. */
export async function getUpcomingMeetings(user: CurrentUser, where: { areaId?: string | null } = {}) {
  const meetings = await prisma.meeting.findMany({
    where: { startsAt: { gte: upcomingMeetingsCutoff() }, ...where },
    orderBy: { startsAt: "asc" },
    take: 50,
    include: {
      area: true,
      room: { select: { id: true } },
      project: { include: { area: true, members: { select: { userId: true } } } },
    },
  });
  return meetings.filter((meeting) => canAccessMeeting(user, meeting));
}

export function eventAudienceFilter(user: CurrentUser): Prisma.EventWhereInput {
  if (isCoordination(user)) return {};
  if (isPlenoOrAbove(user)) return { audience: { in: ["TODOS", "PLENOS"] } };
  return { audience: "TODOS" };
}

/** Progresso nos cursos que são requisito para o Junior virar Pleno. */
export async function getPlenoProgress(userId: string) {
  const courses = await prisma.course.findMany({
    where: { requiredForPleno: true },
    include: { lessons: { select: { id: true, progress: { where: { userId }, select: { userId: true } } } } },
  });
  const total = courses.reduce((sum, c) => sum + c.lessons.length, 0);
  const done = courses.reduce((sum, c) => sum + c.lessons.filter((l) => l.progress.length > 0).length, 0);
  return { total, done, complete: total > 0 && done === total };
}

export async function getTotalHours(userId: string) {
  const result = await prisma.hourEntry.aggregate({ where: { userId, status: "VALIDO" }, _sum: { hours: true } });
  return Number(result._sum.hours ?? 0);
}
