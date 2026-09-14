import { z } from "zod";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishMessage } from "@/lib/realtime";
import { getRoomForUser, toChatMessage } from "@/lib/rooms";

const bodySchema = z.object({ content: z.string().trim().min(1).max(4000) });

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[roomId]/messages">) {
  const { roomId } = await ctx.params;
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await getRoomForUser(roomId, user))) return Response.json({ error: "Sala não encontrada" }, { status: 404 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Mensagem inválida" }, { status: 400 });

  const message = toChatMessage(
    await prisma.message.create({
      data: { roomId, authorId: user.id, content: body.data.content },
      include: { author: { select: { id: true, name: true } } },
    }),
  );
  publishMessage(roomId, message);
  return Response.json(message, { status: 201 });
}
