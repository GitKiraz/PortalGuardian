"use server";

import { redirect } from "next/navigation";
import type { CandidateStage, SelectionStatus } from "@/generated/prisma/enums";
import type { ActionState } from "@/components/forms";
import { optionalText, refreshPortal, text } from "@/lib/action-utils";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateTimeInput } from "@/lib/format";
import { parseFieldsInput, type FormField } from "@/lib/forms";
import { CANDIDATE_STAGE_LABELS, SELECTION_STATUS_LABELS } from "@/lib/labels";

const DEFAULT_FIELDS: FormField[] = [
  { id: "curso", label: "Curso e semestre", type: "text", required: true },
  { id: "motivo", label: "Por que você quer entrar na Guardian Mauá?", type: "textarea", required: true },
  {
    id: "experiencia",
    label: "Já teve contato com Segurança da Informação? Conte um pouco.",
    type: "textarea",
    required: false,
  },
  {
    id: "presencial",
    label: "Consegue participar do encontro presencial (fase 2)?",
    type: "select",
    required: true,
    options: ["Sim", "Não", "Talvez"],
  },
];

const optionalDate = (value: string) => {
  if (!value) return null;
  const date = parseDateTimeInput(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function createProcess(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoordination();
  const title = text(formData, "title");
  if (title.length < 3) return { error: "Informe o nome do processo seletivo" };

  const process = await prisma.selectionProcess.create({
    data: { title, description: optionalText(formData, "description"), fields: DEFAULT_FIELDS, creatorId: user.id },
  });
  refreshPortal();
  redirect(`/coordenacao/processos/${process.id}`);
}

export async function updateProcess(processId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordination();
  const title = text(formData, "title");
  const status = text(formData, "status") as SelectionStatus;
  if (title.length < 3) return { error: "Informe o nome do processo seletivo" };
  if (!(status in SELECTION_STATUS_LABELS)) return { error: "Status inválido" };
  const fields = parseFieldsInput(formData.get("fields"));
  if ("error" in fields) return { error: fields.error };

  await prisma.selectionProcess.update({
    where: { id: processId },
    data: {
      title,
      status,
      description: optionalText(formData, "description"),
      registrationDeadline: optionalDate(text(formData, "registrationDeadline")),
      phase2Date: optionalDate(text(formData, "phase2Date")),
      phase2Location: optionalText(formData, "phase2Location"),
      phase2Notes: optionalText(formData, "phase2Notes"),
      fields: fields.fields,
    },
  });
  refreshPortal();
  return { success: "Processo seletivo salvo" };
}

export async function deleteProcess(processId: string) {
  await requireCoordination();
  await prisma.selectionProcess.delete({ where: { id: processId } });
  refreshPortal();
  redirect("/coordenacao/processos");
}

export async function updateCandidate(candidateId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordination();
  const stage = text(formData, "stage") as CandidateStage;
  if (!(stage in CANDIDATE_STAGE_LABELS)) return { error: "Etapa inválida" };

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { stage, attendedPhase2: formData.get("attendedPhase2") === "on", notes: optionalText(formData, "notes") },
  });
  refreshPortal();
  return { success: "Salvo" };
}
