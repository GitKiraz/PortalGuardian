import { MAUA_COURSES, isMauaCourse } from "@/lib/courses";

/** Seleção do curso de graduação da Mauá. Mantém um valor antigo fora da lista, se houver. */
export function CourseSelect({ name = "course", defaultValue }: { name?: string; defaultValue?: string | null }) {
  const legacy = defaultValue && !isMauaCourse(defaultValue) ? defaultValue : null;
  return (
    <select className="input" name={name} defaultValue={defaultValue ?? ""}>
      <option value="">Selecione seu curso</option>
      {MAUA_COURSES.map((course) => (
        <option key={course} value={course}>
          {course}
        </option>
      ))}
      {legacy && <option value={legacy}>{legacy} (atual)</option>}
    </select>
  );
}
