import { getActiveUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { answerText, parseStoredAnswers, parseStoredFields } from "@/lib/forms";
import { CANDIDATE_STAGE_LABELS } from "@/lib/labels";
import { isCoordination } from "@/lib/permissions";

export async function GET(_request: Request, ctx: RouteContext<"/api/export/processos/[processId]">) {
  const user = await getActiveUser();
  if (!user || !isCoordination(user)) return new Response("Sem permissão", { status: 403 });

  const { processId } = await ctx.params;
  const process = await prisma.selectionProcess.findUnique({
    where: { id: processId },
    include: { candidates: { orderBy: { createdAt: "asc" } } },
  });
  if (!process) return new Response("Processo não encontrado", { status: 404 });

  const fields = parseStoredFields(process.fields);
  return csvResponse(
    `processo-seletivo-${process.id}.csv`,
    ["Nome", "Email", "Telefone", "Etapa", "Presente na fase 2", "Anotações", ...fields.map((f) => f.label), "Inscrito em"],
    process.candidates.map((c) => {
      const answers = parseStoredAnswers(c.answers);
      return [
        c.name,
        c.email,
        c.phone,
        CANDIDATE_STAGE_LABELS[c.stage],
        c.attendedPhase2 ? "Sim" : "Não",
        c.notes,
        ...fields.map((f) => answerText(f, answers)),
        formatDateTime(c.createdAt),
      ];
    }),
  );
}
