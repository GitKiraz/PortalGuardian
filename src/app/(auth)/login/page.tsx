import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/forms";
import { PasswordInput } from "@/components/PasswordInput";
import { Field } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { login } from "../actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="card">
      <h1 className="mb-1 text-lg font-semibold">Entrar no portal</h1>
      <p className="mb-6 text-sm text-muted">Use o email cadastrado na entidade.</p>
      <ActionForm action={login} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
        <Field label="Email">
          <input className="input" type="email" name="email" required autoComplete="email" />
        </Field>
        <Field label="Senha">
          <PasswordInput name="password" required autoComplete="current-password" />
        </Field>
        <button className="btn btn-primary mt-2">Entrar</button>
        <p className="text-center text-xs text-muted">Esqueceu a senha? Peça à coordenação para redefini-la.</p>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-accent-text hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
