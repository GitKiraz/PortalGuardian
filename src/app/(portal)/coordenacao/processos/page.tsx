import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/forms";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, plural } from "@/lib/format";
import { SELECTION_STATUS_LABELS } from "@/lib/labels";
import { createProcess } from "./actions";

export const metadata: Metadata = { title: "Processos seletivos" };

export default async function SelectionProcessesPage() {
  await requireCoordination();
  const [processes, stages] = await Promise.all([
    prisma.selectionProcess.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { candidates: true } } } }),
    prisma.candidate.groupBy({ by: ["processId", "stage"], _count: { _all: true } }),
  ]);
  const count = (processId: string, stage: string) =>
    stages.find((s) => s.processId === processId && s.stage === stage)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        title="Processos seletivos"
        subtitle="Fase 1: formulário público de inscrição · Fase 2: encontro presencial com todos."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Processos">
          {processes.length === 0 ? (
            <Empty>Nenhum processo seletivo criado.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {processes.map((process) => (
                <li key={process.id}>
                  <Link
                    href={`/coordenacao/processos/${process.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-accent-text"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{process.title}</p>
                      <p className="text-xs text-muted">Criado em {formatDateTime(process.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={process.status === "INSCRICOES_ABERTAS" ? "success" : process.status === "FINALIZADO" ? "neutral" : "accent"}>
                        {SELECTION_STATUS_LABELS[process.status]}
                      </Badge>
                      <Badge>{plural(process._count.candidates, "inscrito")}</Badge>
                      <Badge tone="violet">{plural(count(process.id, "APROVADO"), "aprovado")}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Novo processo seletivo" className="h-fit">
          <ActionForm action={createProcess} className="flex flex-col gap-3">
            <Field label="Nome">
              <input className="input" name="title" required placeholder="Ex.: Processo Seletivo 2027.1" />
            </Field>
            <Field label="Descrição (aparece no formulário público)">
              <textarea className="input" name="description" rows={4} />
            </Field>
            <p className="text-xs text-muted">
              O processo é criado como rascunho, com perguntas sugeridas que você pode editar antes de abrir as inscrições.
            </p>
            <button className="btn btn-primary">Criar</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
