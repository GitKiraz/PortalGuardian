import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { MeetingForm } from "@/components/MeetingForm";
import { MeetingList } from "@/components/MeetingList";
import { NoAccess } from "@/components/NoAccess";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";
import { PROJECT_STATUS_LABELS, ROLE_LABELS } from "@/lib/labels";
import { canAccessArea, canManageArea } from "@/lib/permissions";
import { getAreaBySlug, getUpcomingMeetings } from "@/lib/queries";
import { addAreaMember, createProject, removeAreaMember } from "../actions";

export async function generateMetadata({ params }: PageProps<"/areas/[slug]">): Promise<Metadata> {
  const area = await getAreaBySlug((await params).slug);
  return { title: area ? `Área ${area.name}` : "Área" };
}

export default async function AreaPage({ params }: PageProps<"/areas/[slug]">) {
  const { slug } = await params;
  const user = await requireUser();
  const area = await getAreaBySlug(slug);
  if (!area) notFound();

  if (!canAccessArea(user, area)) {
    return (
      <NoAccess title={`Área ${area.name}`}>
        {user.role === "JUNIOR"
          ? "Para participar das áreas é preciso ser Pleno. Conclua a Capacitação 1 - Web Exploit."
          : `Peça ao coordenador${area.coordinator ? ` (${area.coordinator.name})` : ""} para adicionar você à área.`}
      </NoAccess>
    );
  }

  const manage = canManageArea(user, area);
  const [projects, meetings, members, candidates] = await Promise.all([
    prisma.project.findMany({
      where: { areaId: area.id },
      include: {
        members: { select: { userId: true } },
        creator: { select: { name: true } },
        _count: { select: { files: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    getUpcomingMeetings(user, { areaId: area.id }),
    area.isGlobal
      ? null
      : prisma.areaMember.findMany({
          where: { areaId: area.id },
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { user: { name: "asc" } },
        }),
    manage && !area.isGlobal
      ? prisma.user.findMany({
          where: { status: "ATIVO", role: { not: "JUNIOR" }, areaMemberships: { none: { areaId: area.id } } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
  ]);

  return (
    <>
      <PageHeader
        title={area.name}
        subtitle={
          <>
            {area.isGlobal ? "Área global · " : ""}
            Coordenação: {area.coordinator?.name ?? "sem coordenador definido"}
          </>
        }
      />
      {area.description && <p className="-mt-2 mb-6 max-w-3xl text-sm text-neutral-300">{area.description}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title={`Projetos (${projects.length})`}>
            {projects.length === 0 ? (
              <Empty>Nenhum projeto ainda. Inicie o primeiro abaixo.</Empty>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((project) => {
                  const isMember = project.members.some((m) => m.userId === user.id);
                  return (
                    <Link
                      key={project.id}
                      href={`/areas/${area.slug}/projetos/${project.id}`}
                      className="rounded-lg border border-line bg-panel-2 p-4 transition-colors hover:border-accent/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{project.name}</p>
                        <Badge tone={project.status === "ATIVO" ? "success" : project.status === "PAUSADO" ? "warning" : "neutral"}>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                      </div>
                      {project.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{project.description}</p>}
                      <p className="mt-3 flex flex-wrap gap-x-3 text-xs text-muted">
                        <span>{plural(project.members.length, "integrante")}</span>
                        <span>{plural(project._count.files, "arquivo")}</span>
                        {isMember && <span className="text-accent-text">você participa</span>}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Iniciar novo projeto">
            <ActionForm action={createProject.bind(null, area.id)} className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do projeto" className="sm:col-span-2">
                <input className="input" name="name" required minLength={3} />
              </Field>
              <Field label="Descrição" className="sm:col-span-2">
                <textarea className="input" name="description" rows={3} />
              </Field>
              <Field label="Repositório no GitHub (opcional)" className="sm:col-span-2">
                <input className="input" name="repositoryUrl" type="url" placeholder="https://github.com/guardian-maua/…" />
              </Field>
              <button className="btn btn-primary sm:col-span-2">Criar projeto</button>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Próximas reuniões">
            <MeetingList meetings={meetings.map((m) => ({ ...m, subtitle: m.project?.name }))} />
          </Card>

          {manage && (
            <Card title="Agendar reunião da área">
              <MeetingForm scopes={[{ value: area.id, label: `Toda a área ${area.name}` }]} />
            </Card>
          )}

          {members && (
            <Card title={`Integrantes (${members.length})`}>
              {members.length === 0 ? (
                <Empty>Nenhum integrante.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {members.map(({ user: member }) => (
                    <li key={member.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        {member.name} <span className="text-xs text-muted">· {ROLE_LABELS[member.role]}</span>
                      </span>
                      {manage && (
                        <form action={removeAreaMember.bind(null, area.id, member.id)}>
                          <SubmitButton className="btn btn-ghost btn-sm" confirm={`Remover ${member.name} da área?`}>
                            Remover
                          </SubmitButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {manage && (
                <ActionForm action={addAreaMember.bind(null, area.id)} className="mt-4 flex gap-2">
                  <select className="input" name="userId" required defaultValue="" aria-label="Adicionar Pleno à área">
                    <option value="" disabled>
                      Adicionar Pleno…
                    </option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-ghost">Adicionar</button>
                </ActionForm>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
