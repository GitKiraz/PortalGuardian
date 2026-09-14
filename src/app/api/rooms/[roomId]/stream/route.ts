import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscribeRoom, type ChatMessage } from "@/lib/realtime";
import { getRoomForUser, toChatMessage } from "@/lib/rooms";

export const dynamic = "force-dynamic";

/** Server-Sent Events com as novas mensagens da sala. */
export async function GET(request: Request, ctx: RouteContext<"/api/rooms/[roomId]/stream">) {
  const { roomId } = await ctx.params;
  const user = await getActiveUser();
  if (!user) return new Response("Não autenticado", { status: 401 });
  if (!(await getRoomForUser(roomId, user))) return new Response("Sala não encontrada", { status: 404 });

  const encoder = new TextEncoder();
  const lastEventId = request.headers.get("last-event-id");
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (message: ChatMessage) => write(`id: ${message.id}\ndata: ${JSON.stringify(message)}\n\n`);

      const unsubscribe = subscribeRoom(roomId, send);
      const ping = setInterval(() => write(": ping\n\n"), 25_000);
      cleanup = () => {
        unsubscribe();
        clearInterval(ping);
      };
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });

      write("retry: 3000\n\n");

      // Reconexão: reenvia o que chegou enquanto o cliente estava fora.
      if (lastEventId) {
        const last = await prisma.message.findUnique({ where: { id: lastEventId }, select: { createdAt: true } });
        if (last) {
          const missed = await prisma.message.findMany({
            where: { roomId, createdAt: { gt: last.createdAt } },
            orderBy: { createdAt: "asc" },
            take: 200,
            include: { author: { select: { id: true, name: true } } },
          });
          missed.map(toChatMessage).forEach(send);
        }
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
