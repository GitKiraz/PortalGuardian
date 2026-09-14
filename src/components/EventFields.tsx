import type { EventAudience } from "@/generated/prisma/enums";
import { toDateTimeInput } from "@/lib/format";
import type { FormField } from "@/lib/forms";
import { AUDIENCE_LABELS } from "@/lib/labels";
import { FormBuilder } from "./FormBuilder";
import { Field } from "./ui";

export type EventDefaults = {
  title: string;
  description: string | null;
  startsAt: Date;
  location: string | null;
  rsvpDeadline: Date | null;
  capacity: number | null;
  audience: EventAudience;
  fields: FormField[];
};

/** Campos do formulário de criação/edição de evento. */
export function EventFields({ event }: { event?: EventDefaults }) {
  return (
    <>
      <Field label="Título" className="sm:col-span-2">
        <input className="input" name="title" required defaultValue={event?.title} placeholder="Ex.: Festa Junina Guardian" />
      </Field>
      <Field label="Data e hora do evento">
        <input
          className="input"
          type="datetime-local"
          name="startsAt"
          required
          defaultValue={event ? toDateTimeInput(event.startsAt) : undefined}
        />
      </Field>
      <Field label="Local">
        <input className="input" name="location" defaultValue={event?.location ?? ""} placeholder="Ex.: Pátio do bloco H" />
      </Field>
      <Field label="Responder até (opcional)">
        <input
          className="input"
          type="datetime-local"
          name="rsvpDeadline"
          defaultValue={event?.rsvpDeadline ? toDateTimeInput(event.rsvpDeadline) : undefined}
        />
      </Field>
      <Field label="Limite de vagas (opcional)">
        <input className="input" type="number" name="capacity" min={1} defaultValue={event?.capacity ?? ""} />
      </Field>
      <Field label="Quem pode responder" className="sm:col-span-2">
        <select className="input" name="audience" defaultValue={event?.audience ?? "TODOS"}>
          {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição" className="sm:col-span-2">
        <textarea className="input" name="description" rows={3} defaultValue={event?.description ?? ""} />
      </Field>
      <FormBuilder initial={event?.fields} />
    </>
  );
}
