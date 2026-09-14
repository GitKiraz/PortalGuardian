"use client";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg text-center">
      <p className="text-3xl">⚠️</p>
      <h1 className="mt-3 text-lg font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-muted">
        {process.env.NODE_ENV === "development" ? error.message : "Tente novamente. Se persistir, avise o Dev."}
      </p>
      <button className="btn btn-ghost mt-6" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
