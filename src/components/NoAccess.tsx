import Link from "next/link";

export function NoAccess({ title = "Acesso restrito", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg text-center">
      <p className="text-3xl">🔒</p>
      <h1 className="mt-3 text-lg font-semibold">{title}</h1>
      <div className="mt-2 text-sm text-muted">{children}</div>
      <Link href="/" className="btn btn-ghost mt-6">
        Voltar ao início
      </Link>
    </div>
  );
}
