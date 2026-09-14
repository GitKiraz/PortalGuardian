import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { MeetingList } from "@/components/MeetingList";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { summarize } from "@/lib/finance";
import { formatBRL, formatDateTime, formatHours, parseDateInput, plural, todayInput } from "@/lib/format";
import { getUpcomingMeetings } from "@/lib/queries";
import { approveUser, rejectUser, reviewPromotion } from "./actions";

export const metadata: Metadata = { title: "Coordenação" };

export default async function CoordinationPage() {
  const user = await requireCoordination();
  const monthStart = parseDateInput(`${todayInput().slice(0, 7)}-01`);

  const [activeCount, pendingUsers, promotions, monthHours, finance, meetings, approvedCandidates] = await Promise.all([
    prisma.user.count({ where: { status: "ATIVO" } }),
    prisma.user.findMany({ where: { status: "PENDENTE" }, orderBy: { createdAt: "asc" } }),
    prisma.promotionRequest.findMany({
      where: { status: "PENDENTE" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.hourEntry.aggregate({ where: { status: "VALIDO", date: { gte: monthStart } }, _sum: { hours: true } }),
    prisma.financeEntry.groupBy({ by: ["type"], _sum: { amount: true } }),
    getUpcomingMeetings(user, { areaId: null }),
    prisma.candidate.findMany({
      where: { stage: "APROVADO" },
      select: { email: true, process: { select: { title: true } } },
    }),
  ]);

  const approvedByEmail = new Map(approvedCandidates.map((c) => [c.email.toLowerCase(), c.process.title]));

  return (
    <>
      <PageHeader title="Painel da Coordenação" subtitle="Aprovações, indicadores e reuniões da coordenação." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Membros ativos" value={activeCount} hint={<Link href="/coordenacao/membros" className="hover:text-accent-text">Ver membros →</Link>} />
        <Stat label="Aprovações pendentes" value={pendingUsers.length + promotions.length} hint={`${plural(pendingUsers.length, "cadastro")} · ${plural(promotions.length, "promoção", "promoções")}`} />
        <Stat label="Horas no mês" value={formatHours(monthHours._sum.hours ?? 0)} hint={<Link href="/coordenacao/horas" className="hover:text-accent-text">Planilha de horas →</Link>} />
        <Stat label="Saldo em caixa" value={formatBRL(summarize(finance).balance)} hint={<Link href="/coordenacao/financeiro" className="hover:text-accent-text">Financeiro →</Link>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Novos cadastros (${pendingUsers.length})`}>
          {pendingUsers.length === 0 ? (
            <Empty>Nenhum cadastro aguardando.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {pendingUsers.map((pending) => {
                const process = approvedByEmail.get(pending.email);
                return (
                  <li key={pending.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{pending.name}</p>
                      <p className="text-xs text-muted">
                        {pending.email}
                        {pending.ra ? ` · RA ${pending.ra}` : ""}
                        {pending.course ? ` · ${pending.course}` : ""} · {formatDateTime(pending.createdAt)}
                      </p>
                      {process && (
                        <p className="mt-1">
                          <Badge tone="success">Aprovado em: {process}</Badge>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <form action={approveUser.bind(null, pending.id)}>
                        <SubmitButton className="btn btn-primary btn-sm">Aprovar</SubmitButton>
                      </form>
                      <form action={rejectUser.bind(null, pending.id)}>
                        <SubmitButton className="btn btn-danger btn-sm" confirm={`Recusar o cadastro de ${pending.name}?`}>
                          Recusar
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Promoções a Pleno (${promotions.length})`}>
          {promotions.length === 0 ? (
            <Empty>Nenhuma promoção aguardando.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {promotions.map((request) => (
                <li key={request.id} className="py-3">
                  <p className="text-sm font-medium">{request.user.name}</p>
                  <p className="text-xs text-muted">
                    Concluiu a capacitação em {formatDateTime(request.createdAt)} · {request.user.email}
                  </p>
                  <ActionForm action={reviewPromotion.bind(null, request.id)} className="mt-2 flex flex-wrap gap-2">
                    <input className="input flex-1" name="note" placeholder="Observação (opcional)" aria-label="Observação" />
                    <button className="btn btn-primary btn-sm" name="decision" value="APROVADO">
                      Aprovar Pleno
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      name="decision"
                      value="REJEITADO"
                      data-confirm={`Rejeitar a promoção de ${request.user.name}?`}
                    >
                      Rejeitar
                    </button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Reuniões da coordenação"
          className="lg:col-span-2"
          actions={
            <Link href="/coordenacao/reunioes" className="btn btn-ghost btn-sm">
              Agendar
            </Link>
          }
        >
          <MeetingList meetings={meetings} />
        </Card>
      </div>
    </>
  );
}
