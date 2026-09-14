import type { CurrentUser } from "./auth";
import { prisma } from "./db";
import { canAccessMeeting, canAccessProject, isCoordination } from "./permissions";
import type { ChatMessage } from "./realtime";

const membersSelect = { area: true, members: { select: { userId: true } } } as const;

/** Retorna a sala se o usuário puder acessá-la, senão null. */
export async function getRoomForUser(roomId: string, user: CurrentUser) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      project: { include: membersSelect },
      meeting: { include: { area: true, project: { include: membersSelect } } },
    },
  });
  if (!room) return null;
  switch (room.kind) {
    case "PROJETO":
      return room.project && canAccessProject(user, room.project) ? room : null;
    case "REUNIAO":
      return room.meeting && canAccessMeeting(user, room.meeting) ? room : null;
    case "COORDENACAO":
      return isCoordination(user) ? room : null;
  }
}

export async function getRecentMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
  const messages = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: { id: true, name: true } } },
  });
  return messages.reverse().map(toChatMessage);
}

export function toChatMessage(message: {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string };
}): ChatMessage {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: { id: message.author.id, name: message.author.name },
  };
}
