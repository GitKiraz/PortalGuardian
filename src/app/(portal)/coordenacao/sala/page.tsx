import type { Metadata } from "next";
import { RoomView } from "@/components/RoomView";
import { PageHeader } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRecentMessages } from "@/lib/rooms";

export const metadata: Metadata = { title: "Sala da coordenação" };

export default async function CoordinationRoomPage() {
  const user = await requireCoordination();
  const room =
    (await prisma.room.findFirst({ where: { kind: "COORDENACAO" } })) ??
    (await prisma.room.create({ data: { kind: "COORDENACAO", name: "Sala da Coordenação" } }));

  return (
    <>
      <PageHeader
        title="Sala da coordenação"
        subtitle="Canal permanente de voz e texto dos Coordenadores, Presidente e Vice-presidente."
      />
      <RoomView roomId={room.id} currentUserId={user.id} initialMessages={await getRecentMessages(room.id)} />
    </>
  );
}
