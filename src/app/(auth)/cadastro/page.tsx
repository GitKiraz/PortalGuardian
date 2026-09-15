import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CourseSelect } from "@/components/CourseSelect";
import { ActionForm } from "@/components/forms";
import { NewPasswordFields } from "@/components/PasswordInput";
import { Field } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { register } from "../actions";

export const metadata: Metadata = {
  title: "Cadastro",
  description: "Crie sua conta no portal da Guardian Mauá. Todo aluno começa como Junior e a coordenação aprova o acesso.",
  alternates: { canonical: "/cadastro" },
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="card">
      <h1 className="mb-1 text-lg font-semibold">Criar conta</h1>
      <p className="mb-6 text-sm text-muted">
        Após o cadastro, a coordenação aprova seu acesso. Todo aluno começa como Junior.
      </p>
      <ActionForm action={register} className="flex flex-col gap-4" resetOnSuccess={false}>
        <Field label="Nome completo">
          <input className="input" name="name" required autoComplete="name" />
        </Field>
        <Field label="Email">
          <input className="input" type="email" name="email" required autoComplete="email" />
        </Field>
        <Field label="Curso (opcional)">
          <CourseSelect />
        </Field>
        <Field label="RA (opcional)">
          <input className="input" name="ra" placeholder="00.00000-0" />
        </Field>
        <NewPasswordFields />
        <button className="btn btn-primary mt-2">Cadastrar</button>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent-text underline underline-offset-2 hover:no-underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
