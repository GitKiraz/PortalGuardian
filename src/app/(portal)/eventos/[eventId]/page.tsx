import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormFields } from "@/components/FormFields";
import { ActionForm } from "@/components/forms";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { parseStoredAnswers, parseStoredFields } from "@/lib/forms";
import { ATTENDANCE_LABELS } from "@/lib/labels";
import { canSeeEvent } from "@/lib/permissions";
import { respondEvent } from "../actions";

export async function generateMetadata({ params }: PageProps<"/eventos/[eventId]">): Promise<Metadata> {
  const [{ eventId }, user] = await Promise.all([params, getCurrentUser()]);
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, audience: true } });
  return { title: event && user && canSeeEvent(user, event) ? event.title : "Evento" };
}

export default async function EventPage({ params }: PageProps<"/eventos/[eventId]">) {
  const { eventId } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      responses: { where: { userId: user.id } },
      _count: { select: { responses: { where: { attendance: "SIM" } } } },
    },
  });
  if (!event || !canSeeEvent(user, event)) notFound();

  const now = new Date();
  const closed = event.startsAt < now || (event.rsvpDeadline !== null && event.rsvpDeadline < now);
  const mine = event.responses[0];
  const fields = parseStoredFields(event.fields);
  const spotsTaken = event._count.responses - (mine?.attendance === "SIM" ? 1 : 0);
  const full = event.capacity !== null && spotsTaken >= event.capacity && mine?.attendance !== "SIM";

  return (
    <>
      <PageHeader
        title={event.title}
        back={{ href: "/eventos", label: "Eventos" }}
        subtitle={`${formatDateTime(event.startsAt)}${event.location ? ` · ${event.location}` : ""}`}
        actions={closed ? <Badge tone="danger">Respostas encerradas</Badge> : <Badge tone="success">Aberto</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Sobre o evento">
          <p className="whitespace-pre-wrap text-sm">{event.description ?? "Sem descrição."}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="label">Confirmados</dt>
              <dd>
                {event._count.responses}
                {event.capacity ? ` / ${event.capacity} vagas` : ""}
              </dd>
            </div>
            {event.rsvpDeadline && (
              <div>
                <dt className="label">Responder até</dt>
                <dd>{formatDateTime(event.rsvpDeadline)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card title="Sua presença" className="h-fit">
          {mine && (
            <p className="mb-4 text-sm">
              Sua resposta atual: <b>{ATTENDANCE_LABELS[mine.attendance]}</b>
            </p>
          )}
          {closed ? (
            <p className="text-sm text-muted">Não é mais possível responder.</p>
          ) : (
            <ActionForm action={respondEvent.bind(null, event.id)} className="flex flex-col gap-4" resetOnSuccess={false}>
              <fieldset className="flex flex-col gap-2">
                <span className="label">Você vai comparecer? *</span>
                {(["SIM", "TALVEZ", "NAO"] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm has-disabled:opacity-60">
                    <input
                      type="radio"
                      name="attendance"
                      value={value}
                      defaultChecked={mine?.attendance === value}
                      disabled={value === "SIM" && full}
                      required
                    />
                    {ATTENDANCE_LABELS[value]}
                    {value === "SIM" && full && <span className="text-xs text-red-300">(vagas esgotadas)</span>}
                  </label>
                ))}
              </fieldset>
              <FormFields fields={fields} answers={parseStoredAnswers(mine?.answers)} />
              <button className="btn btn-primary">{mine ? "Atualizar resposta" : "Enviar resposta"}</button>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  );
}
