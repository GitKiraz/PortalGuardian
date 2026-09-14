import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventFields } from "@/components/EventFields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { getCurrentUser, requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { answerText, parseStoredAnswers, parseStoredFields } from "@/lib/forms";
import { ATTENDANCE_LABELS, AUDIENCE_LABELS, ROLE_LABELS } from "@/lib/labels";
import { canSeeEvent, isCoordination } from "@/lib/permissions";
import { deleteEvent, updateEvent } from "../actions";

export async function generateMetadata({ params }: PageProps<"/coordenacao/eventos/[eventId]">): Promise<Metadata> {
  const [{ eventId }, user] = await Promise.all([params, getCurrentUser()]);
  const event = user && isCoordination(user) ? await prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }) : null;
  return { title: event ? `${event.title} · respostas` : "Evento" };
}

export default async function CoordinationEventPage({ params }: PageProps<"/coordenacao/eventos/[eventId]">) {
  await requireCoordination();
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      creator: { select: { name: true } },
      responses: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: [{ attendance: "asc" }, { user: { name: "asc" } }],
      },
    },
  });
  if (!event) notFound();

  const fields = parseStoredFields(event.fields);
  const responded = new Set(event.responses.map((r) => r.userId));
  const audienceUsers = await prisma.user.findMany({
    where: { status: "ATIVO" },
    select: { id: true, name: true, role: true, coordinatedArea: { select: { id: true } } },
    orderBy: { name: "asc" },
  });
  const pending = audienceUsers.filter(
    (u) => !responded.has(u.id) && canSeeEvent({ ...u, areaMemberships: [] }, event),
  );
  const byAttendance = (a: string) => event.responses.filter((r) => r.attendance === a).length;

  return (
    <>
      <PageHeader
        title={event.title}
        back={{ href: "/coordenacao/eventos", label: "Eventos e formulários" }}
        subtitle={`${formatDateTime(event.startsAt)}${event.location ? ` · ${event.location}` : ""} · ${
          AUDIENCE_LABELS[event.audience]
        } · criado por ${event.creator.name}`}
        actions={
          <>
            <a href={`/api/export/eventos/${event.id}`} className="btn btn-ghost">
              ⬇ Exportar CSV
            </a>
            <form action={deleteEvent.bind(null, event.id)}>
              <SubmitButton className="btn btn-danger" confirm="Excluir o evento e todas as respostas?">
                Excluir
              </SubmitButton>
            </form>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Vão comparecer" value={`${byAttendance("SIM")}${event.capacity ? ` / ${event.capacity}` : ""}`} />
        <Stat label="Talvez" value={byAttendance("TALVEZ")} />
        <Stat label="Não vão" value={byAttendance("NAO")} />
        <Stat label="Sem resposta" value={pending.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="min-w-0 space-y-6">
          <Card title="Respostas">
            {event.responses.length === 0 ? (
              <Empty>Nenhuma resposta ainda.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Presença</th>
                      {fields.map((field) => (
                        <th key={field.id}>{field.label}</th>
                      ))}
                      <th>Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.responses.map((response) => {
                      const answers = parseStoredAnswers(response.answers);
                      return (
                        <tr key={response.id}>
                          <td>
                            <p className="font-medium">{response.user.name}</p>
                            <p className="text-xs text-muted">{ROLE_LABELS[response.user.role]}</p>
                          </td>
                          <td>
                            <Badge
                              tone={response.attendance === "SIM" ? "success" : response.attendance === "NAO" ? "danger" : "warning"}
                            >
                              {ATTENDANCE_LABELS[response.attendance]}
                            </Badge>
                          </td>
                          {fields.map((field) => (
                            <td key={field.id} className="max-w-64 whitespace-pre-wrap">
                              {answerText(field, answers)}
                            </td>
                          ))}
                          <td className="whitespace-nowrap text-xs text-muted">{formatDateTime(response.updatedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {pending.length > 0 && (
            <Card title={`Ainda não responderam (${pending.length})`}>
              <p className="text-sm text-muted">{pending.map((u) => u.name).join(", ")}</p>
            </Card>
          )}
        </div>

        <Card title="Editar evento" className="h-fit">
          <ActionForm action={updateEvent.bind(null, event.id)} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={false}>
            <EventFields event={{ ...event, fields }} />
            <button className="btn btn-primary sm:col-span-2">Salvar alterações</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
