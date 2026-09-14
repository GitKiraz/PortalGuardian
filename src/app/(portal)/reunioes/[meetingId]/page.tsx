import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/forms";
import { RoomView } from "@/components/RoomView";
import { PageHeader } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { canAccessMeeting, canManageArea, isCoordination } from "@/lib/permissions";
import { getRecentMessages } from "@/lib/rooms";
import { deleteMeeting } from "../actions";

export async function generateMetadata({ params }: PageProps<"/reunioes/[meetingId]">): Promise<Metadata> {
  const [{ meetingId }, user] = await Promise.all([params, getCurrentUser()]);
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { area: true, project: { include: { area: true, members: { select: { userId: true } } } } },
  });
  return { title: meeting && user && canAccessMeeting(user, meeting) ? meeting.title : "Reunião" };
}

export default async function MeetingPage({ params }: PageProps<"/reunioes/[meetingId]">) {
  const { meetingId } = await params;
  const user = await requireUser();

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      area: true,
      room: { select: { id: true } },
      creator: { select: { name: true } },
      project: { include: { area: true, members: { select: { userId: true } } } },
    },
  });
  if (!meeting || !meeting.room || !canAccessMeeting(user, meeting)) notFound();

  const canDelete =
    meeting.creatorId === user.id || (meeting.area ? canManageArea(user, meeting.area) : isCoordination(user));
  const scope = meeting.project?.name ?? meeting.area?.name ?? "Coordenação";
  const back = meeting.project
    ? { href: `/areas/${meeting.project.area.slug}/projetos/${meeting.project.id}`, label: meeting.project.name }
    : meeting.area
      ? { href: `/areas/${meeting.area.slug}`, label: meeting.area.name }
      : { href: "/coordenacao/reunioes", label: "Reuniões da coordenação" };

  return (
    <>
      <PageHeader
        title={meeting.title}
        back={back}
        subtitle={`${formatDateTime(meeting.startsAt)}${meeting.durationMin ? ` · ${meeting.durationMin} min` : ""} · ${
          meeting.location ?? "Online"
        } · ${scope} · criada por ${meeting.creator.name}`}
        actions={
          canDelete && (
            <form action={deleteMeeting.bind(null, meeting.id)}>
              <SubmitButton className="btn btn-danger btn-sm" confirm="Excluir esta reunião e o chat?">
                Excluir reunião
              </SubmitButton>
            </form>
          )
        }
      />
      {meeting.description && (
        <div className="card mb-4 whitespace-pre-wrap text-sm">
          <p className="label mb-1">Pauta</p>
          {meeting.description}
        </div>
      )}
      <RoomView
        roomId={meeting.room.id}
        currentUserId={user.id}
        initialMessages={await getRecentMessages(meeting.room.id)}
      />
    </>
  );
}
