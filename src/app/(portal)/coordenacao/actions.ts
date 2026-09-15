"use server";

import type { FinanceType, Role } from "@/generated/prisma/enums";
import type { ActionState } from "@/components/forms";
import { optionalText, PermissionError, refreshPortal, text } from "@/lib/action-utils";
import { hashPassword, requireCoordination, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/finance";
import { parseDateInput } from "@/lib/format";
import { ROLES } from "@/lib/labels";
import { canAssignRole, isAdmin } from "@/lib/permissions";
import { youtubeId } from "@/lib/youtube";

async function requireAdminAction() {
  const user = await requireUser();
  if (!isAdmin(user)) throw new PermissionError("Apenas Presidente, Vice-presidente ou Dev");
  return user;
}

// ───────── Membros ─────────

export async function approveUser(userId: string) {
  await requireCoordination();
  await prisma.user.updateMany({ where: { id: userId, status: "PENDENTE" }, data: { status: "ATIVO" } });
  refreshPortal();
}

export async function rejectUser(userId: string) {
  await requireCoordination();
  await prisma.user.updateMany({ where: { id: userId, status: "PENDENTE" }, data: { status: "INATIVO" } });
  refreshPortal();
}

export async function setUserActive(userId: string, active: boolean) {
  const actor = await requireAdminAction();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.id === actor.id) throw new PermissionError("Você não pode alterar a própria conta");
  if (target.role === "DEV" && actor.role !== "DEV") throw new PermissionError();

  await prisma.user.update({ where: { id: userId }, data: { status: active ? "ATIVO" : "INATIVO" } });
  if (!active) await prisma.session.deleteMany({ where: { userId } });
  refreshPortal();
}

export async function updateUserRole(userId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminAction();
  const role = text(formData, "role") as Role;
  const areaId = optionalText(formData, "areaId");

  if (!ROLES.includes(role)) return { error: "Cargo inválido" };
  if (!canAssignRole(actor, role)) return { error: "Apenas o Dev pode conceder o cargo Dev" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuário não encontrado" };
  if (target.role === "DEV" && actor.role !== "DEV") return { error: "Apenas o Dev pode alterar outro Dev" };
  if (target.id === actor.id && role !== actor.role) return { error: "Você não pode alterar o próprio cargo" };
  if (role === "COORDENADOR" && !areaId) return { error: "Escolha a área que será coordenada" };

  await prisma.$transaction(async (tx) => {
    await tx.area.updateMany({ where: { coordinatorId: target.id }, data: { coordinatorId: null } });
    if (role === "COORDENADOR" && areaId) {
      await tx.area.update({ where: { id: areaId }, data: { coordinatorId: target.id } });
    }
    await tx.user.update({ where: { id: target.id }, data: { role } });
    if (role !== "JUNIOR") {
      await tx.promotionRequest.updateMany({
        where: { userId: target.id, status: "PENDENTE" },
        data: { status: "APROVADO", reviewerId: actor.id, reviewedAt: new Date() },
      });
    }
  });
  refreshPortal();
  return { success: "Cargo atualizado" };
}

/** Define de quais áreas não globais o aluno é integrante (substitui a lista atual). */
export async function updateUserAreas(userId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminAction();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuário não encontrado" };
  if (target.role === "DEV" && actor.role !== "DEV") return { error: "Apenas o Dev pode alterar outro Dev" };

  const selected = formData.getAll("areaIds").filter((value): value is string => typeof value === "string");
  if (selected.length > 0 && target.role === "JUNIOR") return { error: "Apenas alunos Plenos podem integrar áreas" };
  const areas = await prisma.area.findMany({ where: { id: { in: selected }, isGlobal: false }, select: { id: true } });
  const areaIds = areas.map((area) => area.id);

  await prisma.$transaction([
    prisma.areaMember.deleteMany({ where: { userId: target.id, areaId: { notIn: areaIds } } }),
    prisma.areaMember.createMany({ data: areaIds.map((areaId) => ({ userId: target.id, areaId })), skipDuplicates: true }),
  ]);
  refreshPortal();
  return { success: "Áreas atualizadas" };
}

export async function resetUserPassword(userId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminAction();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuário não encontrado" };
  if (target.role === "DEV" && actor.role !== "DEV") return { error: "Sem permissão" };

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await prisma.session.deleteMany({ where: { userId } });
  return { success: "Senha redefinida. Informe a nova senha ao aluno." };
}

// ───────── Promoção a Pleno ─────────

export async function reviewPromotion(requestId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const reviewer = await requireCoordination();
  const decision = text(formData, "decision");
  if (decision !== "APROVADO" && decision !== "REJEITADO") return { error: "Decisão inválida" };

  const request = await prisma.promotionRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!request || request.status !== "PENDENTE") return { error: "Solicitação já analisada" };

  await prisma.$transaction(async (tx) => {
    await tx.promotionRequest.update({
      where: { id: requestId },
      data: { status: decision, note: optionalText(formData, "note"), reviewerId: reviewer.id, reviewedAt: new Date() },
    });
    if (decision === "APROVADO" && request.user.role === "JUNIOR") {
      await tx.user.update({ where: { id: request.userId }, data: { role: "PLENO" } });
    }
  });
  refreshPortal();
  return { success: decision === "APROVADO" ? `${request.user.name} agora é Pleno` : "Solicitação rejeitada" };
}

// ───────── Horas ─────────

export async function invalidateHourEntry(entryId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const reviewer = await requireCoordination();
  await prisma.hourEntry.update({
    where: { id: entryId },
    data: { status: "INVALIDADO", reviewerId: reviewer.id, reviewNote: optionalText(formData, "note") },
  });
  refreshPortal();
  return { success: "Registro invalidado" };
}

export async function restoreHourEntry(entryId: string) {
  await requireCoordination();
  await prisma.hourEntry.update({
    where: { id: entryId },
    data: { status: "VALIDO", reviewerId: null, reviewNote: null },
  });
  refreshPortal();
}

// ───────── Financeiro ─────────

export async function createFinanceEntry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoordination();
  const date = text(formData, "date");
  const description = text(formData, "description");
  const category = text(formData, "category") || "Outros";
  const type = text(formData, "type") as FinanceType;
  const amount = parseAmount(text(formData, "amount"));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Informe a data" };
  if (description.length < 3) return { error: "Descreva o lançamento" };
  if (type !== "ENTRADA" && type !== "SAIDA") return { error: "Escolha entrada ou saída" };
  if (!(amount > 0)) return { error: "Valor inválido" };

  await prisma.financeEntry.create({
    data: {
      date: parseDateInput(date),
      description,
      category: category.slice(0, 60),
      type,
      amount: Math.round(amount * 100) / 100,
      notes: optionalText(formData, "notes"),
      createdById: user.id,
    },
  });
  refreshPortal();
  return { success: "Lançamento registrado" };
}

export async function deleteFinanceEntry(entryId: string) {
  await requireCoordination();
  await prisma.financeEntry.delete({ where: { id: entryId } });
  refreshPortal();
}

// ───────── Capacitação ─────────

function courseData(formData: FormData) {
  return {
    title: text(formData, "title"),
    description: optionalText(formData, "description"),
    order: Number(text(formData, "order")) || 0,
    requiredForPleno: formData.get("requiredForPleno") === "on",
  };
}

export async function createCourse(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordination();
  const data = courseData(formData);
  if (data.title.length < 3) return { error: "Informe o título do curso" };
  await prisma.course.create({ data });
  refreshPortal();
  return { success: "Curso criado" };
}

export async function updateCourse(courseId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordination();
  const data = courseData(formData);
  if (data.title.length < 3) return { error: "Informe o título do curso" };
  await prisma.course.update({ where: { id: courseId }, data });
  refreshPortal();
  return { success: "Curso salvo" };
}

export async function deleteCourse(courseId: string) {
  await requireCoordination();
  await prisma.course.delete({ where: { id: courseId } });
  refreshPortal();
}

function lessonData(formData: FormData) {
  return {
    title: text(formData, "title"),
    youtubeUrl: text(formData, "youtubeUrl"),
    description: optionalText(formData, "description"),
    order: Number(text(formData, "order")) || 0,
  };
}

export async function createLesson(courseId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordination();
  const data = lessonData(formData);
  if (data.title.length < 3) return { error: "Informe o título da aula" };
  if (!youtubeId(data.youtubeUrl)) return { error: "Cole um link válido do YouTube" };
  await prisma.lesson.create({ data: { ...data, courseId } });
  refreshPortal();
  return { success: "Aula adicionada" };
}

export async function updateLesson(lessonId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordination();
  const data = lessonData(formData);
  if (data.title.length < 3) return { error: "Informe o título da aula" };
  if (!youtubeId(data.youtubeUrl)) return { error: "Cole um link válido do YouTube" };
  await prisma.lesson.update({ where: { id: lessonId }, data });
  refreshPortal();
  return { success: "Aula salva" };
}

export async function deleteLesson(lessonId: string) {
  await requireCoordination();
  await prisma.lesson.delete({ where: { id: lessonId } });
  refreshPortal();
}

// ───────── Áreas (apenas admins) ─────────

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function areaData(formData: FormData) {
  return {
    name: text(formData, "name"),
    description: optionalText(formData, "description"),
    isGlobal: formData.get("isGlobal") === "on",
    order: Number(text(formData, "order")) || 0,
  };
}

export async function createArea(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminAction();
  const data = areaData(formData);
  const slug = slugify(text(formData, "slug") || data.name);
  if (data.name.length < 2 || !slug) return { error: "Informe o nome da área" };
  if (await prisma.area.findUnique({ where: { slug } })) return { error: `Já existe uma área com o endereço /${slug}` };

  // Sem ordem informada, a nova área vai para o fim do menu.
  const order = text(formData, "order")
    ? data.order
    : ((await prisma.area.aggregate({ _max: { order: true } }))._max.order ?? -1) + 1;
  await prisma.area.create({ data: { ...data, order, slug } });
  refreshPortal();
  return { success: `Área ${data.name} criada` };
}

export async function updateArea(areaId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminAction();
  const data = areaData(formData);
  if (data.name.length < 2) return { error: "Informe o nome da área" };
  await prisma.area.update({ where: { id: areaId }, data });
  refreshPortal();
  return { success: "Área salva" };
}

export async function deleteArea(areaId: string): Promise<ActionState> {
  await requireAdminAction();
  const projects = await prisma.project.count({ where: { areaId } });
  if (projects > 0) return { error: `A área tem ${projects} projeto(s). Exclua ou mova os projetos antes.` };
  await prisma.area.delete({ where: { id: areaId } });
  refreshPortal();
  return { success: "Área excluída" };
}
