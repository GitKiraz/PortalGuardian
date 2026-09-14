import type { Metadata } from "next";
import { MeetingForm } from "@/components/MeetingForm";
import { MeetingList } from "@/components/MeetingList";
import { Card, PageHeader } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageArea } from "@/lib/permissions";
import { getUpcomingMeetings } from "@/lib/queries";

export const metadata: Metadata = { title: "Reuniões" };

export default async function CoordinationMeetingsPage() {
  const user = await requireCoordination();
  const [areas, meetings] = await Promise.all([
    prisma.area.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    getUpcomingMeetings(user),
  ]);

  const scopes = [
    { value: "coordenacao", label: "Coordenação (Coordenadores, Presidente e Vice)" },
    ...areas.filter((area) => canManageArea(user, area)).map((area) => ({ value: area.id, label: `Área ${area.name}` })),
  ];

  return (
    <>
      <PageHeader title="Reuniões" subtitle="Cada reunião tem sua própria sala com voz, compartilhamento de tela e chat." />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card title="Próximas reuniões">
          <MeetingList
            meetings={meetings.map((m) => ({ ...m, subtitle: m.project?.name ?? m.area?.name ?? "Coordenação" }))}
          />
        </Card>
        <Card title="Agendar reunião" className="h-fit">
          <MeetingForm scopes={scopes} />
        </Card>
      </div>
    </>
  );
}
