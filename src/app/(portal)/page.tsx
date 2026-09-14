import Link from "next/link";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatHours, plural } from "@/lib/format";
import { PROJECT_STATUS_LABELS, roleLabel } from "@/lib/labels";
import { eventAudienceFilter, getPlenoProgress, getTotalHours, getUpcomingMeetings } from "@/lib/queries";

export default async function DashboardPage() {
  const user = await requireUser();

  const [hours, progress, meetings, projects, events, pendingPromotion] = await Promise.all([
    getTotalHours(user.id),
    getPlenoProgress(user.id),
    getUpcomingMeetings(user),
    prisma.project.findMany({
      where: { members: { some: { userId: user.id } } },
      include: { area: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: new Date() }, ...eventAudienceFilter(user) },
      include: { responses: { where: { userId: user.id }, select: { attendance: true } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.promotionRequest.findFirst({ where: { userId: user.id, status: "PENDENTE" } }),
  ]);

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <PageHeader title={`Olá, ${user.name.split(" ")[0]}`} subtitle={roleLabel(user)} />

      {user.role === "JUNIOR" && (
        <div className="mb-6 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          {pendingPromotion ? (
            <>Você concluiu a capacitação! Sua promoção a <b>Pleno</b> está aguardando aprovação da coordenação.</>
          ) : (
            <>
              Conclua a <b>Capacitação 1 - Web Exploit</b> para se tornar <b>Pleno</b> e participar das áreas.{" "}
              <Link href="/capacitacao" className="text-accent-text hover:underline">
                Continuar capacitação →
              </Link>
            </>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Horas totais" value={formatHours(hours)} hint={<Link href="/horas" className="hover:text-accent-text">Registrar horas →</Link>} />
        <Stat
          label="Capacitação"
          value={progress.total ? `${percent}%` : "—"}
          hint={progress.total ? `${progress.done} de ${plural(progress.total, "aula")}` : "Aulas em breve"}
        />
        <Stat label="Meus projetos" value={projects.length} />
        <Stat label="Próximas reuniões" value={meetings.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Próximas reuniões">
          {meetings.length === 0 ? (
            <Empty>Nenhuma reunião agendada.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {meetings.slice(0, 6).map((meeting) => (
                <li key={meeting.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(meeting.startsAt)} · {meeting.project?.name ?? meeting.area?.name ?? "Coordenação"}
                      {meeting.location ? ` · ${meeting.location}` : ""}
                    </p>
                  </div>
                  <Link href={`/reunioes/${meeting.id}`} className="btn btn-ghost btn-sm">
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Meus projetos">
          {projects.length === 0 ? (
            <Empty>Você ainda não participa de nenhum projeto.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/areas/${project.area.slug}/projetos/${project.id}`} className="min-w-0 hover:text-accent-text">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-muted">{project.area.name}</p>
                  </Link>
                  <Badge tone={project.status === "ATIVO" ? "success" : "neutral"}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Próximos eventos" className="lg:col-span-2">
          {events.length === 0 ? (
            <Empty>Nenhum evento aberto.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(event.startsAt)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  {event.responses.length ? (
                    <Badge tone="success">Respondido</Badge>
                  ) : (
                    <Link href={`/eventos/${event.id}`} className="btn btn-primary btn-sm">
                      Confirmar presença
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
