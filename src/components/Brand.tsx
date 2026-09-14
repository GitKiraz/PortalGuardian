import { GuardianLogo } from "./GuardianLogo";

/** Wordmark "Guardian" com o pingo do i em roxo, como na identidade visual. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold leading-none tracking-tight ${className}`}>
      Guard
      <span className="relative">
        ı
        <span className="absolute left-1/2 top-[0.3em] size-[0.19em] -translate-x-1/2 rounded-full bg-accent" />
      </span>
      an
    </span>
  );
}

export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const large = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <div className={`${large ? "size-14 rounded-xl p-2" : "size-10 rounded-lg p-1.5"} grid shrink-0 place-items-center bg-white`}>
        <GuardianLogo className="size-full" />
      </div>
      <div className="flex flex-col gap-1">
        <Wordmark className={large ? "text-3xl" : "text-xl"} />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Mauá · portal</span>
      </div>
    </div>
  );
}
