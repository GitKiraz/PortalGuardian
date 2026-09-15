import Link from "next/link";
import { connection } from "next/server";

export default async function NotFound() {
  // Renderiza por requisição: páginas estáticas não recebem o nonce do CSP e teriam os scripts bloqueados.
  await connection();
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card max-w-md text-center">
        <p className="font-mono text-4xl text-accent-text">404</p>
        <h1 className="mt-3 text-lg font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted">O conteúdo não existe ou você não tem acesso a ele.</p>
        <Link href="/" className="btn btn-ghost mt-6">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
