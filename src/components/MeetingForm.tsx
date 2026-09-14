import { createMeeting } from "@/app/(portal)/reunioes/actions";
import { ActionForm } from "./forms";
import { Field } from "./ui";

/** Formulário de nova reunião. Sem projectId, mostra seletor de escopo (coordenação ou áreas). */
export function MeetingForm({
  projectId,
  scopes,
}: {
  projectId?: string;
  scopes?: { value: string; label: string }[];
}) {
  return (
    <ActionForm action={createMeeting} className="grid gap-3 sm:grid-cols-2">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <Field label="Título" className="sm:col-span-2">
        <input className="input" name="title" required placeholder="Ex.: Reunião mensal das frentes" />
      </Field>
      {scopes && (
        <Field label="Para quem" className="sm:col-span-2">
          <select className="input" name="scope">
            {scopes.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Data e hora">
        <input className="input" type="datetime-local" name="startsAt" required />
      </Field>
      <Field label="Duração em minutos (opcional)">
        <input className="input" type="number" name="durationMin" min={5} step={5} placeholder="60" />
      </Field>
      <Field label="Local" className="sm:col-span-2" hint="Deixe vazio para reunião online pela sala do portal">
        <input className="input" name="location" placeholder="Ex.: Bloco H, sala 12" />
      </Field>
      <Field label="Pauta (opcional)" className="sm:col-span-2">
        <textarea className="input" name="description" rows={3} />
      </Field>
      <button className="btn btn-primary sm:col-span-2">Agendar reunião</button>
    </ActionForm>
  );
}
