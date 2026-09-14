import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { SubmitButton } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export const metadata: Metadata = { title: "Aguardando aprovação" };

export default async function WaitingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "ATIVO") redirect("/");

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand size="lg" />
        </div>
        <div className="card text-center">
          <p className="text-3xl">⏳</p>
          <h1 className="mt-3 text-lg font-semibold">
            {user.status === "INATIVO" ? "Conta desativada" : "Cadastro em análise"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {user.status === "INATIVO"
              ? "Sua conta foi desativada. Fale com a coordenação da Guardian Mauá."
              : `Olá, ${user.name.split(" ")[0]}! A coordenação precisa aprovar seu acesso. Volte aqui mais tarde.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {user.status === "PENDENTE" && (
              <Link href="/" className="btn btn-primary">
                Verificar novamente
              </Link>
            )}
            <form action={logout}>
              <SubmitButton className="btn btn-ghost">Sair</SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
