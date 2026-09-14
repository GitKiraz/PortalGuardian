export default function Loading() {
  return (
    <div role="status" aria-label="Carregando" className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-64 rounded-lg bg-white/5" />
        <div className="h-4 w-96 max-w-full rounded bg-white/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-white/5" />
    </div>
  );
}
