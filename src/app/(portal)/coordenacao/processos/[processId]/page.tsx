import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/FormBuilder";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import type { CandidateStage } from "@/generated/prisma/enums";
import { getCurrentUser, requireCoordination } from "@/lib/auth";
import { isCoordination } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDateTime, toDateTimeInput } from "@/lib/format";
import { answerText, parseStoredAnswers, parseStoredFields } from "@/lib/forms";
import { CANDIDATE_STAGE_LABELS, SELECTION_STATUS_LABELS } from "@/lib/labels";
import { deleteProcess, updateCandidate, updateProcess } from "../actions";

const STAGE_TONES: Record<CandidateStage, "neutral" | "accent" | "danger" | "success"> = {
  INSCRITO: "neutral",
  APROVADO_FASE_1: "accent",
  REPROVADO_FASE_1: "danger",
  APROVADO: "success",
  REPROVADO: "danger",
};

export async function generateMetadata({ params }: PageProps<"/coordenacao/processos/[processId]">): Promise<Metadata> {
  const [{ processId }, user] = await Promise.all([params, getCurrentUser()]);
  const process = user && isCoordination(user) ? await prisma.selectionProcess.findUnique({ where: { id: processId }, select: { title: true } }) : null;
  return { title: process?.title ?? "Processo seletivo" };
}

export default async function SelectionProcessPage({ params, searchParams }: PageProps<"/coordenacao/processos/[processId]">) {
  await requireCoordination();
  const [{ processId }, { etapa }] = await Promise.all([params, searchParams]);
  const stageFilter = typeof etapa === "string" && etapa in CANDIDATE_STAGE_LABELS ? (etapa as CandidateStage) : undefined;

  const process = await prisma.selectionProcess.findUnique({
    where: { id: processId },
    include: { candidates: { orderBy: { createdAt: "asc" } } },
  });
  if (!process) notFound();

  const fields = parseStoredFields(process.fields);
  const byStage = (stage: CandidateStage) => process.candidates.filter((c) => c.stage === stage).length;
  const candidates = stageFilter ? process.candidates.filter((c) => c.stage === stageFilter) : process.candidates;
  const publicPath = `/processo-seletivo/${process.id}`;

  return (
    <>
      <PageHeader
        title={process.title}
        back={{ href: "/coordenacao/processos", label: "Processos seletivos" }}
        subtitle={<Badge tone="accent">{SELECTION_STATUS_LABELS[process.status]}</Badge>}
        actions={
          <>
            <a href={`/api/export/processos/${process.id}`} className="btn btn-ghost">
              ⬇ Exportar CSV
            </a>
            <form action={deleteProcess.bind(null, process.id)}>
              <SubmitButton className="btn btn-danger" confirm="Excluir o processo e todas as inscrições?">
                Excluir
              </SubmitButton>
            </form>
          </>
        }
      />

      <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          <p className="label">Link público do formulário (fase 1)</p>
          <p className="font-mono text-accent-text">{publicPath}</p>
        </div>
        <a href={publicPath} target="_blank" className="btn btn-ghost btn-sm">
          Abrir formulário ↗
        </a>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Inscritos" value={process.candidates.length} />
        <Stat label="Aprovados fase 1" value={byStage("APROVADO_FASE_1") + byStage("APROVADO") + byStage("REPROVADO")} />
        <Stat label="Presentes fase 2" value={process.candidates.filter((c) => c.attendedPhase2).length} />
        <Stat label="Aprovados final" value={byStage("APROVADO")} />
        <Stat label="Reprovados" value={byStage("REPROVADO_FASE_1") + byStage("REPROVADO")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <Link href={`?`} className={`btn btn-sm ${!stageFilter ? "btn-primary" : "btn-ghost"}`}>
              Todos ({process.candidates.length})
            </Link>
            {(Object.keys(CANDIDATE_STAGE_LABELS) as CandidateStage[]).map((stage) => (
              <Link key={stage} href={`?etapa=${stage}`} className={`btn btn-sm ${stageFilter === stage ? "btn-primary" : "btn-ghost"}`}>
                {CANDIDATE_STAGE_LABELS[stage]} ({byStage(stage)})
              </Link>
            ))}
          </div>

          {candidates.length === 0 ? (
            <Empty>Nenhum candidato {stageFilter ? "nesta etapa" : "inscrito ainda"}.</Empty>
          ) : (
            <ul className="space-y-3">
              {candidates.map((candidate) => {
                const answers = parseStoredAnswers(candidate.answers);
                return (
                  <li key={candidate.id} className="card p-0">
                    <details>
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-xs text-muted">
                            {candidate.email}
                            {candidate.phone ? ` · ${candidate.phone}` : ""} · inscrito em {formatDateTime(candidate.createdAt)}
                          </p>
                        </div>
                        <span className="flex gap-1.5">
                          {candidate.attendedPhase2 && <Badge tone="violet">Presente na fase 2</Badge>}
                          <Badge tone={STAGE_TONES[candidate.stage]}>{CANDIDATE_STAGE_LABELS[candidate.stage]}</Badge>
                        </span>
                      </summary>
                      <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-2">
                        <dl className="space-y-3 text-sm">
                          {fields.map((field) => (
                            <div key={field.id}>
                              <dt className="label">{field.label}</dt>
                              <dd className="whitespace-pre-wrap">{answerText(field, answers)}</dd>
                            </div>
                          ))}
                        </dl>
                        <ActionForm
                          action={updateCandidate.bind(null, candidate.id)}
                          className="flex flex-col gap-3"
                          resetOnSuccess={false}
                        >
                          <Field label="Etapa">
                            <select className="input" name="stage" defaultValue={candidate.stage}>
                              {Object.entries(CANDIDATE_STAGE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="attendedPhase2" defaultChecked={candidate.attendedPhase2} />
                            Compareceu ao encontro presencial
                          </label>
                          <Field label="Anotações da coordenação">
                            <textarea className="input" name="notes" rows={3} defaultValue={candidate.notes ?? ""} />
                          </Field>
                          <button className="btn btn-primary">Salvar avaliação</button>
                        </ActionForm>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Card title="Configuração" className="h-fit">
          <ActionForm action={updateProcess.bind(null, process.id)} className="flex flex-col gap-3" resetOnSuccess={false}>
            <Field label="Nome">
              <input className="input" name="title" defaultValue={process.title} required />
            </Field>
            <Field label="Status" hint="Abra as inscrições para liberar o formulário público">
              <select className="input" name="status" defaultValue={process.status}>
                {Object.entries(SELECTION_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrição">
              <textarea className="input" name="description" rows={3} defaultValue={process.description ?? ""} />
            </Field>
            <Field label="Inscrições até (opcional)">
              <input
                className="input"
                type="datetime-local"
                name="registrationDeadline"
                defaultValue={process.registrationDeadline ? toDateTimeInput(process.registrationDeadline) : undefined}
              />
            </Field>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">Fase 2 · Encontro presencial</p>
            <Field label="Data e hora">
              <input
                className="input"
                type="datetime-local"
                name="phase2Date"
                defaultValue={process.phase2Date ? toDateTimeInput(process.phase2Date) : undefined}
              />
            </Field>
            <Field label="Local">
              <input className="input" name="phase2Location" defaultValue={process.phase2Location ?? ""} />
            </Field>
            <Field label="Orientações">
              <textarea className="input" name="phase2Notes" rows={3} defaultValue={process.phase2Notes ?? ""} />
            </Field>
            <FormBuilder initial={fields} />
            <button className="btn btn-primary">Salvar</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
