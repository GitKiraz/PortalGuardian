import type { Metadata } from "next";
import Link from "next/link";
import { EventFields } from "@/components/EventFields";
import { ActionForm } from "@/components/forms";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AUDIENCE_LABELS } from "@/lib/labels";
import { createEvent } from "./actions";

export const metadata: Metadata = { title: "Eventos e formulários" };

export default async function CoordinationEventsPage() {
  await requireCoordination();
  const [events, counts] = await Promise.all([
    prisma.event.findMany({ orderBy: { startsAt: "desc" } }),
    prisma.eventResponse.groupBy({ by: ["eventId", "attendance"], _count: { _all: true } }),
  ]);
  const count = (eventId: string, attendance: string) =>
    counts.find((c) => c.eventId === eventId && c.attendance === attendance)?._count._all ?? 0;
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Eventos e formulários"
        subtitle="Crie formulários de presença para encontros presenciais, festa junina, CTF Night e outros eventos."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <Card title="Eventos">
          {events.length === 0 ? (
            <Empty>Nenhum evento criado.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/coordenacao/eventos/${event.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-accent-text"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted">
                        {formatDateTime(event.startsAt)} · {AUDIENCE_LABELS[event.audience]}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {event.startsAt < now && <Badge>Encerrado</Badge>}
                      <Badge tone="success">
                        {count(event.id, "SIM")}
                        {event.capacity ? `/${event.capacity}` : ""} {count(event.id, "SIM") === 1 ? "confirmado" : "confirmados"}
                      </Badge>
                      <Badge tone="warning">{count(event.id, "TALVEZ")} talvez</Badge>
                      <Badge tone="danger">{count(event.id, "NAO")} não</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Novo evento" className="h-fit">
          <ActionForm action={createEvent} className="grid gap-3 sm:grid-cols-2">
            <EventFields />
            <button className="btn btn-primary sm:col-span-2">Criar evento e enviar formulário</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
