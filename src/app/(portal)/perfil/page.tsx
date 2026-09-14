import type { Metadata } from "next";
import { CourseSelect } from "@/components/CourseSelect";
import { ActionForm } from "@/components/forms";
import { NewPasswordFields, PasswordInput } from "@/components/PasswordInput";
import { Card, Field, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { changePassword, updateProfile } from "./actions";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Meu perfil" subtitle={`${user.email} · ${roleLabel(user)}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Dados">
          <ActionForm action={updateProfile} className="flex flex-col gap-3" resetOnSuccess={false}>
            <Field label="Nome completo">
              <input className="input" name="name" defaultValue={user.name} required />
            </Field>
            <Field label="Curso (opcional)">
              <CourseSelect defaultValue={user.course} />
            </Field>
            <Field label="RA (opcional)">
              <input className="input" name="ra" defaultValue={user.ra ?? ""} />
            </Field>
            <button className="btn btn-primary">Salvar</button>
          </ActionForm>
        </Card>
        <Card title="Alterar senha">
          <ActionForm action={changePassword} className="flex flex-col gap-3">
            <Field label="Senha atual">
              <PasswordInput name="current" required autoComplete="current-password" />
            </Field>
            <NewPasswordFields name="next" confirmName="confirm" label="Nova senha" />
            <button className="btn btn-primary">Alterar senha</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
