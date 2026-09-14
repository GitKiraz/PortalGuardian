"use server";

import { unlink } from "node:fs/promises";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@/generated/prisma/enums";
import type { ActionState } from "@/components/forms";
import { isHttpUrl, optionalText, PermissionError, refreshPortal, text } from "@/lib/action-utils";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessArea, canAccessProject, canManageArea, isPlenoOrAbove } from "@/lib/permissions";
import { uploadPath } from "@/lib/uploads";

const PROJECT_STATUSES: ProjectStatus[] = ["ATIVO", "PAUSADO", "CONCLUIDO"];

async function loadProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { area: true, members: { select: { userId: true, isLead: true } } },
  });
  if (!project) throw new PermissionError("Projeto não encontrado");
  return project;
}

/** Coordenador da área, admins e líderes do projeto podem editar. */
function canEditProject(user: CurrentUser, project: Awaited<ReturnType<typeof loadProject>>) {
  return canManageArea(user, project.area) || project.members.some((m) => m.userId === user.id && m.isLead);
}

function loadUserForPermissions(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { areaMemberships: { select: { areaId: true } }, coordinatedArea: { select: { id: true } } },
  });
}

function validateRepository(value: string | null) {
  return value && !isHttpUrl(value) ? "Link do repositório inválido (use https://…)" : null;
}

// ───────── Projetos ─────────

export async function createProject(areaId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const area = await prisma.area.findUnique({ where: { id: areaId } });
  if (!area || !canAccessArea(user, area)) return { error: "Sem acesso a esta área" };

  const name = text(formData, "name");
  const repositoryUrl = optionalText(formData, "repositoryUrl");
  if (name.length < 3) return { error: "Dê um nome ao projeto (mín. 3 caracteres)" };
  const repoError = validateRepository(repositoryUrl);
  if (repoError) return { error: repoError };

  const project = await prisma.project.create({
    data: {
      areaId,
      name,
      description: optionalText(formData, "description"),
      repositoryUrl,
      creatorId: user.id,
      members: { create: { userId: user.id, isLead: true } },
      room: { create: { kind: "PROJETO", name } },
    },
  });
  refreshPortal();
  redirect(`/areas/${area.slug}/projetos/${project.id}`);
}

export async function updateProject(projectId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const project = await loadProject(projectId);
  if (!canEditProject(user, project)) return { error: "Sem permissão" };

  const name = text(formData, "name");
  const repositoryUrl = optionalText(formData, "repositoryUrl");
  const status = text(formData, "status") as ProjectStatus;
  if (name.length < 3) return { error: "Nome muito curto" };
  if (!PROJECT_STATUSES.includes(status)) return { error: "Status inválido" };
  const repoError = validateRepository(repositoryUrl);
  if (repoError) return { error: repoError };

  await prisma.project.update({
    where: { id: projectId },
    data: { name, description: optionalText(formData, "description"), repositoryUrl, status },
  });
  refreshPortal();
  return { success: "Projeto atualizado" };
}

export async function deleteProject(projectId: string) {
  const user = await requireUser();
  const project = await loadProject(projectId);
  if (!canManageArea(user, project.area)) throw new PermissionError();

  const files = await prisma.projectFile.findMany({ where: { projectId }, select: { storedName: true } });
  await prisma.project.delete({ where: { id: projectId } });
  await Promise.all(files.map((f) => unlink(uploadPath(f.storedName)).catch(() => {})));
  refreshPortal();
  redirect(`/areas/${project.area.slug}`);
}

export async function addProjectMember(projectId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const project = await loadProject(projectId);
  if (!canEditProject(user, project)) return { error: "Sem permissão" };

  const target = await loadUserForPermissions(text(formData, "userId"));
  if (!target || target.status !== "ATIVO") return { error: "Selecione um aluno" };
  if (!canAccessArea(target, project.area)) return { error: `${target.name} não tem acesso à área ${project.area.name}` };

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: target.id } },
    create: { projectId, userId: target.id },
    update: {},
  });
  refreshPortal();
  return { success: `${target.name} adicionado(a)` };
}

export async function removeProjectMember(projectId: string, userId: string) {
  const user = await requireUser();
  const project = await loadProject(projectId);
  if (!canEditProject(user, project) && user.id !== userId) throw new PermissionError();

  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  refreshPortal();
}

export async function toggleProjectLead(projectId: string, userId: string) {
  const user = await requireUser();
  const project = await loadProject(projectId);
  if (!canManageArea(user, project.area)) throw new PermissionError();

  const member = project.members.find((m) => m.userId === userId);
  if (!member) return;
  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { isLead: !member.isLead },
  });
  refreshPortal();
}

export async function deleteProjectFile(fileId: string) {
  const user = await requireUser();
  const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
  if (!file) return;
  const project = await loadProject(file.projectId);
  const allowed = canAccessProject(user, project) && (file.uploaderId === user.id || canEditProject(user, project));
  if (!allowed) throw new PermissionError();

  await prisma.projectFile.delete({ where: { id: fileId } });
  await unlink(uploadPath(file.storedName)).catch(() => {});
  refreshPortal();
}

// ───────── Integrantes da área ─────────

export async function addAreaMember(areaId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const area = await prisma.area.findUnique({ where: { id: areaId } });
  if (!area || !canManageArea(user, area)) return { error: "Sem permissão" };

  const target = await loadUserForPermissions(text(formData, "userId"));
  if (!target || target.status !== "ATIVO") return { error: "Selecione um aluno" };
  if (!isPlenoOrAbove(target)) return { error: "Apenas alunos Plenos podem integrar áreas" };

  await prisma.areaMember.upsert({
    where: { userId_areaId: { userId: target.id, areaId } },
    create: { userId: target.id, areaId },
    update: {},
  });
  refreshPortal();
  return { success: `${target.name} agora integra ${area.name}` };
}

export async function removeAreaMember(areaId: string, userId: string) {
  const user = await requireUser();
  const area = await prisma.area.findUnique({ where: { id: areaId } });
  if (!area || !canManageArea(user, area)) throw new PermissionError();

  await prisma.areaMember.deleteMany({ where: { areaId, userId } });
  refreshPortal();
}
