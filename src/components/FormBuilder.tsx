"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { FIELD_TYPE_LABELS, FIELD_TYPES } from "@/lib/form-fields";
import type { FormField } from "@/lib/forms";

type Draft = FormField & { optionsText: string };

const toDraft = (field: FormField): Draft => ({ ...field, optionsText: (field.options ?? []).join("\n") });

/** Editor de perguntas; envia o JSON no campo hidden "fields". */
export function FormBuilder({ initial = [] }: { initial?: FormField[] }) {
  const [fields, setFields] = useState<Draft[]>(initial.map(toDraft));

  const update = (index: number, patch: Partial<Draft>) =>
    setFields((all) => all.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const move = (index: number, delta: number) =>
    setFields((all) => {
      const next = [...all];
      const target = index + delta;
      if (target < 0 || target >= next.length) return all;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const serialized: FormField[] = fields.map(({ optionsText, ...field }) => ({
    ...field,
    options:
      field.type === "select"
        ? optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined,
  }));

  return (
    <div className="flex flex-col gap-3 sm:col-span-full">
      <input type="hidden" name="fields" value={JSON.stringify(serialized)} />
      <span className="label">Perguntas do formulário</span>
      {fields.length === 0 && <p className="text-sm text-muted">Nenhuma pergunta extra.</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-lg border border-line bg-black/20 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
            <input
              className="input"
              placeholder="Pergunta"
              aria-label={`Título da pergunta ${index + 1}`}
              value={field.label}
              onChange={(e) => update(index, { label: e.target.value })}
            />
            <select
              className="input"
              value={field.type}
              onChange={(e) => update(index, { type: e.target.value as FormField["type"] })}
              aria-label={`Tipo da pergunta ${index + 1}`}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          {field.type === "select" && (
            <textarea
              className="input mt-2"
              rows={3}
              placeholder="Uma opção por linha"
              aria-label={`Opções da pergunta ${index + 1}`}
              value={field.optionsText}
              onChange={(e) => update(index, { optionsText: e.target.value })}
            />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => update(index, { required: e.target.checked })}
              />
              Obrigatória
            </label>
            <span className="flex-1" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(index, -1)} aria-label="Mover pergunta para cima" title="Mover para cima">
              <ArrowUp className="size-3.5" aria-hidden />
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(index, 1)} aria-label="Mover pergunta para baixo" title="Mover para baixo">
              <ArrowDown className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setFields((all) => all.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remover
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost self-start"
        onClick={() =>
          setFields((all) => [
            ...all,
            { id: crypto.randomUUID().slice(0, 8), label: "", type: "text", required: false, optionsText: "" },
          ])
        }
      >
        + Adicionar pergunta
      </button>
    </div>
  );
}
