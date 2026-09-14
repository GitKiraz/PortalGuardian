import { getActiveUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { answerText, parseStoredAnswers, parseStoredFields } from "@/lib/forms";
import { ATTENDANCE_LABELS, ROLE_LABELS } from "@/lib/labels";
import { isCoordination } from "@/lib/permissions";

export async function GET(_request: Request, ctx: RouteContext<"/api/export/eventos/[eventId]">) {
  const user = await getActiveUser();
  if (!user || !isCoordination(user)) return new Response("Sem permissão", { status: 403 });

  const { eventId } = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      responses: {
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: [{ attendance: "asc" }, { user: { name: "asc" } }],
      },
    },
  });
  if (!event) return new Response("Evento não encontrado", { status: 404 });

  const fields = parseStoredFields(event.fields);
  return csvResponse(
    `evento-${event.id}.csv`,
    ["Nome", "Email", "Cargo", "Presença", ...fields.map((f) => f.label), "Respondido em"],
    event.responses.map((r) => {
      const answers = parseStoredAnswers(r.answers);
      return [
        r.user.name,
        r.user.email,
        ROLE_LABELS[r.user.role],
        ATTENDANCE_LABELS[r.attendance],
        ...fields.map((f) => answerText(f, answers)),
        formatDateTime(r.updatedAt),
      ];
    }),
  );
}
