import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { ATTENDANCE_LABELS } from "@/lib/labels";
import { eventAudienceFilter } from "@/lib/queries";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventsPage() {
  const user = await requireUser();
  const now = new Date();

  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) }, ...eventAudienceFilter(user) },
    include: { responses: { where: { userId: user.id }, select: { attendance: true } } },
    orderBy: { startsAt: "asc" },
  });
  const upcoming = events.filter((e) => e.startsAt >= now);
  const past = events.filter((e) => e.startsAt < now).reverse();

  const renderList = (list: typeof events) => (
    <ul className="divide-y divide-line">
      {list.map((event) => {
        const response = event.responses[0];
        return (
          <li key={event.id}>
            <Link href={`/eventos/${event.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-accent-text">
              <div className="min-w-0">
                <p className="truncate font-medium">{event.title}</p>
                <p className="text-xs text-muted">
                  {formatDateTime(event.startsAt)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              {response ? (
                <Badge tone={response.attendance === "SIM" ? "success" : response.attendance === "NAO" ? "danger" : "warning"}>
                  {ATTENDANCE_LABELS[response.attendance]}
                </Badge>
              ) : (
                <Badge tone="accent">Responder</Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader title="Eventos" subtitle="Encontros presenciais, CTF Nights, festas e outros eventos da entidade." />
      <div className="space-y-6">
        <Card title="Próximos">{upcoming.length ? renderList(upcoming) : <Empty>Nenhum evento agendado.</Empty>}</Card>
        {past.length > 0 && <Card title="Anteriores">{renderList(past)}</Card>}
      </div>
    </>
  );
}
