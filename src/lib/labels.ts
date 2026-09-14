import type {
  Attendance,
  CandidateStage,
  EventAudience,
  ProjectStatus,
  RequestStatus,
  Role,
  SelectionStatus,
  UserStatus,
} from "@/generated/prisma/enums";

export const ROLES: Role[] = ["DEV", "PRESIDENTE", "VICE_PRESIDENTE", "COORDENADOR", "PLENO", "JUNIOR"];

export const ROLE_LABELS: Record<Role, string> = {
  DEV: "Dev",
  PRESIDENTE: "Presidente",
  VICE_PRESIDENTE: "Vice-presidente",
  COORDENADOR: "Coordenador(a)",
  PLENO: "Pleno",
  JUNIOR: "Junior",
};

export function roleLabel(user: { role: Role; coordinatedArea?: { name: string } | null }) {
  if (user.role === "COORDENADOR" && user.coordinatedArea) {
    return `Coordenador(a) de ${user.coordinatedArea.name}`;
  }
  return ROLE_LABELS[user.role];
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  PENDENTE: "Aguardando aprovação",
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  SIM: "Vou comparecer",
  NAO: "Não vou",
  TALVEZ: "Talvez",
};

export const AUDIENCE_LABELS: Record<EventAudience, string> = {
  TODOS: "Todos os alunos",
  PLENOS: "Apenas Plenos e acima",
  COORDENACAO: "Apenas Coordenação",
};

export const SELECTION_STATUS_LABELS: Record<SelectionStatus, string> = {
  RASCUNHO: "Rascunho",
  INSCRICOES_ABERTAS: "Fase 1 · Inscrições abertas",
  INSCRICOES_ENCERRADAS: "Fase 1 · Inscrições encerradas",
  FASE_2: "Fase 2 · Encontro presencial",
  FINALIZADO: "Finalizado",
};

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  INSCRITO: "Inscrito",
  APROVADO_FASE_1: "Aprovado na fase 1",
  REPROVADO_FASE_1: "Reprovado na fase 1",
  APROVADO: "Aprovado (final)",
  REPROVADO: "Reprovado (final)",
};
