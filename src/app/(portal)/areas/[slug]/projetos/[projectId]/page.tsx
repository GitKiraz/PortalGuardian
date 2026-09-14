import { Download } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileUploader } from "@/components/FileUploader";
import { ActionForm, SubmitButton } from "@/components/forms";
import { MeetingForm } from "@/components/MeetingForm";
import { MeetingList } from "@/components/MeetingList";
import { RoomView } from "@/components/RoomView";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBytes, formatDateTime } from "@/lib/format";
import { PROJECT_STATUS_LABELS, ROLE_LABELS } from "@/lib/labels";
import { canAccessArea, canAccessProject, canManageArea } from "@/lib/permissions";
import { upcomingMeetingsCutoff } from "@/lib/queries";
import { getRecentMessages } from "@/lib/rooms";
import { canDisplayInline } from "@/lib/uploads";
import {
  addProjectMember,
  deleteProject,
  deleteProjectFile,
  removeProjectMember,
  toggleProjectLead,
  updateProject,
} from "../../../actions";

export async function generateMetadata({ params }: PageProps<"/areas/[slug]/projetos/[projectId]">): Promise<Metadata> {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()]);
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true, area: true } });
  return { title: project && user && canAccessArea(user, project.area) ? project.name : "Projeto" };
}

export default async function ProjectPage({ params }: PageProps<"/areas/[slug]/projetos/[projectId]">) {
  const { slug, projectId } = await params;
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      area: true,
      creator: { select: { name: true } },
      room: { select: { id: true } },
      members: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: [{ isLead: "desc" }, { joinedAt: "asc" }],
      },
      files: { include: { uploader: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      meetings: { where: { startsAt: { gte: upcomingMeetingsCutoff() } }, orderBy: { startsAt: "asc" } },
    },
  });
  if (!project || project.area.slug !== slug || !canAccessArea(user, project.area)) notFound();

  const hasAccess = canAccessProject(user, project);
  const manage = canManageArea(user, project.area);
  const canEdit = manage || project.members.some((m) => m.userId === user.id && m.isLead);
  const leads = project.members.filter((m) => m.isLead).map((m) => m.user.name);

  const header = (
    <PageHeader
      title={project.name}
      back={{ href: `/areas/${project.area.slug}`, label: project.area.name }}
      subtitle={`Criado por ${project.creator.name}${leads.length ? ` · Líder: ${leads.join(", ")}` : ""}`}
      actions={
        <>
          <Badge tone={project.status === "ATIVO" ? "success" : project.status === "PAUSADO" ? "warning" : "neutral"}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
          {project.repositoryUrl && (
            <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              Repositório ↗
            </a>
          )}
        </>
      }
    />
  );

  const membersList = (
    <ul className="divide-y divide-line">
      {project.members.map(({ user: member, isLead }) => (
        <li key={member.id} className="flex items-center justify-between gap-2 py-2 text-sm">
          <span className="min-w-0 truncate">
            {member.name} <span className="text-xs text-muted">· {ROLE_LABELS[member.role]}</span>
            {isLead && <span className="ml-1 text-xs text-accent-text">· líder</span>}
          </span>
          <span className="flex shrink-0 gap-1">
            {manage && (
              <form action={toggleProjectLead.bind(null, project.id, member.id)}>
                <SubmitButton className="btn btn-ghost btn-sm">{isLead ? "Tirar líder" : "Líder"}</SubmitButton>
              </form>
            )}
            {(canEdit || member.id === user.id) && (
              <form action={removeProjectMember.bind(null, project.id, member.id)}>
                <SubmitButton
                  className="btn btn-ghost btn-sm"
                  confirm={member.id === user.id ? "Sair do projeto?" : `Remover ${member.name}?`}
                >
                  {member.id === user.id ? "Sair" : "Remover"}
                </SubmitButton>
              </form>
            )}
          </span>
        </li>
      ))}
    </ul>
  );

  if (!hasAccess) {
    return (
      <>
        {header}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Sobre">
            <p className="whitespace-pre-wrap text-sm">{project.description ?? "Sem descrição."}</p>
            <p className="mt-4 text-sm text-muted">
              Você não é integrante deste projeto. Fale com o líder ou com a coordenação da área para participar.
            </p>
          </Card>
          <Card title="Integrantes">{membersList}</Card>
        </div>
      </>
    );
  }

  const candidates = canEdit
    ? (
        await prisma.user.findMany({
          where: { status: "ATIVO", id: { notIn: project.members.map((m) => m.userId) } },
          include: { areaMemberships: { select: { areaId: true } }, coordinatedArea: { select: { id: true } } },
          orderBy: { name: "asc" },
        })
      ).filter((candidate) => canAccessArea(candidate, project.area))
    : [];

  return (
    <>
      {header}
      {project.description && <p className="-mt-2 mb-6 max-w-3xl whitespace-pre-wrap text-sm text-neutral-300">{project.description}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {project.room && (
            <RoomView roomId={project.room.id} currentUserId={user.id} initialMessages={await getRecentMessages(project.room.id)} />
          )}
        </div>

        <div className="space-y-6">
          <Card title={`Arquivos (${project.files.length})`}>
            <FileUploader projectId={project.id} />
            {project.files.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted">Nenhum arquivo enviado.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {project.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <a
                        href={`/api/files/${file.id}${canDisplayInline(file.mimeType) ? "?view" : ""}`}
                        target={canDisplayInline(file.mimeType) ? "_blank" : undefined}
                        className="block truncate text-sm hover:text-accent-text"
                        title={file.originalName}
                      >
                        {file.originalName}
                      </a>
                      <p className="text-xs text-muted">
                        {formatBytes(file.size)} · {file.uploader.name} · {formatDateTime(file.createdAt)}
                      </p>
                    </div>
                    <span className="flex shrink-0 gap-1">
                      <a href={`/api/files/${file.id}`} className="btn btn-ghost btn-sm" title="Baixar" aria-label={`Baixar ${file.originalName}`}>
                        <Download className="size-4" aria-hidden />
                      </a>
                      {(file.uploader.id === user.id || canEdit) && (
                        <form action={deleteProjectFile.bind(null, file.id)}>
                          <SubmitButton className="btn btn-ghost btn-sm" confirm={`Excluir ${file.originalName}?`} icon="trash" label="Excluir" />
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Integrantes (${project.members.length})`}>
            {membersList}
            {canEdit && (
              <ActionForm action={addProjectMember.bind(null, project.id)} className="mt-4 flex gap-2">
                <select className="input" name="userId" required defaultValue="" aria-label="Adicionar integrante">
                  <option value="" disabled>
                    Adicionar integrante…
                  </option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({ROLE_LABELS[c.role]})
                    </option>
                  ))}
                </select>
                <button className="btn btn-ghost">Adicionar</button>
              </ActionForm>
            )}
          </Card>

          <Card title="Reuniões do projeto">
            <MeetingList meetings={project.meetings} />
            {manage && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-accent-text">+ Agendar reunião</summary>
                <div className="mt-3">
                  <MeetingForm projectId={project.id} />
                </div>
              </details>
            )}
          </Card>

          {canEdit && (
            <Card title="Configurações">
              <ActionForm action={updateProject.bind(null, project.id)} className="flex flex-col gap-3" resetOnSuccess={false}>
                <Field label="Nome">
                  <input className="input" name="name" defaultValue={project.name} required />
                </Field>
                <Field label="Descrição">
                  <textarea className="input" name="description" rows={3} defaultValue={project.description ?? ""} />
                </Field>
                <Field label="Repositório">
                  <input className="input" name="repositoryUrl" type="url" defaultValue={project.repositoryUrl ?? ""} />
                </Field>
                <Field label="Status">
                  <select className="input" name="status" defaultValue={project.status}>
                    {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className="btn btn-primary">Salvar</button>
              </ActionForm>
              {manage && (
                <form action={deleteProject.bind(null, project.id)} className="mt-4 border-t border-line pt-4">
                  <SubmitButton className="btn btn-danger w-full" confirm="Excluir o projeto, chat e arquivos? Não dá para desfazer.">
                    Excluir projeto
                  </SubmitButton>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
