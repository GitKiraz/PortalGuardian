"use server";

import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { text } from "@/lib/action-utils";
import { prisma } from "@/lib/db";
import { collectAnswers, parseStoredFields } from "@/lib/forms";
import { clientIp, hitRateLimit, tooManyAttempts } from "@/lib/rate-limit";

const SUCCESS = "Inscrição enviada! Fique de olho no seu email para os próximos passos.";

const candidateSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.email("Email inválido").trim().toLowerCase(),
  phone: z.string().trim().max(30).optional(),
});

export async function submitApplication(processId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  // Honeypot: bots preenchem o campo escondido.
  if (text(formData, "website")) return { success: SUCCESS };
  // Formulário público: limite por IP folgado, porque inscrições no campus saem do mesmo IP.
  const wait = hitRateLimit(`application:${await clientIp()}`, 30, 60 * 60 * 1000);
  if (wait) return { error: tooManyAttempts(wait) };

  const process = await prisma.selectionProcess.findUnique({ where: { id: processId } });
  const open =
    process?.status === "INSCRICOES_ABERTAS" &&
    (!process.registrationDeadline || process.registrationDeadline > new Date());
  if (!process || !open) return { error: "As inscrições para este processo seletivo estão encerradas" };

  const parsed = candidateSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const collected = collectAnswers(parseStoredFields(process.fields), formData);
  if ("error" in collected) return { error: collected.error };

  const existing = await prisma.candidate.findUnique({
    where: { processId_email: { processId, email: parsed.data.email } },
  });
  if (existing) return { error: "Este email já está inscrito neste processo seletivo" };

  await prisma.candidate.create({
    data: {
      processId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      answers: collected.answers,
    },
  });
  return { success: SUCCESS };
}
