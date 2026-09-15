import type { EventAudience, Role } from "@/generated/prisma/enums";

export type AreaRef = { id: string; isGlobal: boolean };

export type PermissionUser = {
  id: string;
  role: Role;
  coordinatedArea: { id: string } | null;
  areaMemberships: { areaId: string }[];
};

/** Presidente, Vice-presidente e Dev acessam tudo. */
export const ADMIN_ROLES: Role[] = ["DEV", "PRESIDENTE", "VICE_PRESIDENTE"];

export function isAdmin(user: PermissionUser) {
  return ADMIN_ROLES.includes(user.role);
}

/** Acesso ao módulo dos Coordenadores. */
export function isCoordination(user: PermissionUser) {
  return isAdmin(user) || user.role === "COORDENADOR";
}

export function isPlenoOrAbove(user: PermissionUser) {
  return user.role !== "JUNIOR";
}

function isAreaMember(user: PermissionUser, area: { id: string }) {
  return isPlenoOrAbove(user) && user.areaMemberships.some((m) => m.areaId === area.id);
}

/** Áreas globais (Registro) são de todos; a coordenação vê todas; as demais exigem ser Pleno e integrante. */
export function canAccessArea(user: PermissionUser, area: AreaRef) {
  if (area.isGlobal || isCoordination(user)) return true;
  return isAreaMember(user, area);
}

/** Coordenador da área ou admin. */
export function canManageArea(user: PermissionUser, area: { id: string }) {
  return isAdmin(user) || (user.role === "COORDENADOR" && user.coordinatedArea?.id === area.id);
}

/** Em áreas globais (Registro) só a coordenação cria projetos; nas demais, o coordenador da área, admins e integrantes. */
export function canCreateProject(user: PermissionUser, area: AreaRef) {
  if (area.isGlobal) return isCoordination(user);
  return canManageArea(user, area) || isAreaMember(user, area);
}

/** A coordenação vê todos os projetos; os demais precisam acessar a área e integrar o projeto. */
export function canAccessProject(user: PermissionUser, project: { area: AreaRef; members: { userId: string }[] }) {
  if (isCoordination(user)) return true;
  return canAccessArea(user, project.area) && project.members.some((m) => m.userId === user.id);
}

export function canAccessMeeting(
  user: PermissionUser,
  meeting: { area: AreaRef | null; project: { area: AreaRef; members: { userId: string }[] } | null },
) {
  if (meeting.project) return canAccessProject(user, meeting.project);
  if (meeting.area === null) return isCoordination(user);
  return canAccessArea(user, meeting.area);
}

export function canSeeEvent(user: PermissionUser, event: { audience: EventAudience }) {
  if (event.audience === "TODOS") return true;
  if (event.audience === "PLENOS") return isPlenoOrAbove(user);
  return isCoordination(user);
}

/** Apenas Dev pode conceder o cargo Dev; demais admins concedem o resto. */
export function canAssignRole(user: PermissionUser, role: Role) {
  if (user.role === "DEV") return true;
  return isAdmin(user) && role !== "DEV";
}
