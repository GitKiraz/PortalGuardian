import { fieldInputName, type Answers, type FormField } from "@/lib/forms";

/** Renderiza as perguntas configuradas no FormBuilder. */
export function FormFields({ fields, answers = {} }: { fields: FormField[]; answers?: Answers }) {
  return (
    <>
      {fields.map((field) => {
        const name = fieldInputName(field);
        const label = `${field.label}${field.required ? " *" : ""}`;
        const value = answers[field.id];

        if (field.type === "checkbox") {
          return (
            <label key={field.id} className="flex items-center gap-2 text-sm sm:col-span-full">
              <input type="checkbox" name={name} defaultChecked={value === true} />
              {label}
            </label>
          );
        }

        return (
          <label key={field.id} className="flex flex-col gap-1.5 sm:col-span-full">
            <span className="label">{label}</span>
            {field.type === "textarea" ? (
              <textarea name={name} rows={4} className="input" required={field.required} defaultValue={String(value ?? "")} />
            ) : field.type === "select" ? (
              <select name={name} className="input" required={field.required} defaultValue={String(value ?? "")}>
                <option value="">Selecione…</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={name}
                type={field.type === "number" ? "number" : "text"}
                step="any"
                className="input"
                required={field.required}
                defaultValue={String(value ?? "")}
              />
            )}
          </label>
        );
      })}
    </>
  );
}
