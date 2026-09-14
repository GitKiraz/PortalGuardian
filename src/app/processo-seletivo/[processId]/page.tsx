import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Brand } from "@/components/Brand";
import { FormFields } from "@/components/FormFields";
import { ActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { parseStoredFields } from "@/lib/forms";
import { submitApplication } from "./actions";

export async function generateMetadata({ params }: PageProps<"/processo-seletivo/[processId]">): Promise<Metadata> {
  const process = await prisma.selectionProcess.findUnique({ where: { id: (await params).processId }, select: { title: true, status: true } });
  return { title: process && process.status !== "RASCUNHO" ? process.title : "Processo seletivo" };
}

export default async function PublicApplicationPage({ params }: PageProps<"/processo-seletivo/[processId]">) {
  const { processId } = await params;
  const process = await prisma.selectionProcess.findUnique({ where: { id: processId } });
  if (!process || process.status === "RASCUNHO") notFound();

  const open =
    process.status === "INSCRICOES_ABERTAS" &&
    (!process.registrationDeadline || process.registrationDeadline > new Date());

  return (
    <main className="px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Brand size="lg" />
        </div>
        <div className="card">
          <p className="label">Processo seletivo</p>
          <h1 className="mt-1 text-2xl font-semibold">{process.title}</h1>
          {process.description && <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-300">{process.description}</p>}

          <ol className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <li className="rounded-lg border border-line bg-panel-2 p-3">
              <p className="font-medium">1 · Formulário</p>
              <p className="text-xs text-muted">
                {process.registrationDeadline ? `Inscrições até ${formatDateTime(process.registrationDeadline)}` : "Preencha abaixo"}
              </p>
            </li>
            <li className="rounded-lg border border-line bg-panel-2 p-3">
              <p className="font-medium">2 · Encontro presencial</p>
              <p className="text-xs text-muted">
                {process.phase2Date ? formatDateTime(process.phase2Date) : "Data a definir"}
                {process.phase2Location ? ` · ${process.phase2Location}` : ""}
              </p>
            </li>
          </ol>

          <div className="mt-6 border-t border-line pt-6">
            {open ? (
              <ActionForm
                action={submitApplication.bind(null, process.id)}
                className="grid gap-4 sm:grid-cols-2"
                successView={
                  <div className="py-6 text-center">
                    <p className="text-4xl" aria-hidden>
                      🎉
                    </p>
                    <p className="mt-3 text-lg font-semibold">Inscrição enviada!</p>
                    <p className="mt-1 text-sm text-muted">
                      Fique de olho no seu email: entraremos em contato sobre o encontro presencial (fase 2).
                    </p>
                  </div>
                }
              >
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <Field label="Nome completo *" className="sm:col-span-2">
                  <input className="input" name="name" required autoComplete="name" />
                </Field>
                <Field label="Email *" hint="Usado para contato sobre as próximas fases">
                  <input className="input" type="email" name="email" required autoComplete="email" />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <input className="input" name="phone" autoComplete="tel" />
                </Field>
                <FormFields fields={parseStoredFields(process.fields)} />
                <button className="btn btn-primary sm:col-span-2">Enviar inscrição</button>
              </ActionForm>
            ) : (
              <p className="text-center text-sm text-muted">As inscrições para este processo seletivo estão encerradas.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
