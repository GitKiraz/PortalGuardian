import { AccessToken } from "livekit-server-sdk";
import { getActiveUser } from "@/lib/auth";
import { getRoomForUser } from "@/lib/rooms";

/** Gera o token de acesso do LiveKit para a sala. */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[roomId]/token">) {
  const { roomId } = await ctx.params;
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await getRoomForUser(roomId, user))) return Response.json({ error: "Sala não encontrada" }, { status: 404 });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return Response.json({ error: "LiveKit não configurado no servidor" }, { status: 500 });

  const token = new AccessToken(apiKey, apiSecret, { identity: user.id, name: user.name, ttl: "6h" });
  token.addGrant({ room: roomId, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });

  const host = (request.headers.get("host") ?? "localhost").split(":")[0];
  const url = process.env.LIVEKIT_URL || `ws://${host}:7880`;

  return Response.json({ token: await token.toJwt(), url });
}
