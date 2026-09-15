import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

// Janela fixa em memória (o portal roda em uma única instância, como o chat).
// Para múltiplas instâncias, trocar por Redis ou por uma tabela no Postgres.
const globalForLimits = globalThis as unknown as { guardianRateLimits?: Map<string, Bucket> };
const buckets = globalForLimits.guardianRateLimits ?? new Map<string, Bucket>();
globalForLimits.guardianRateLimits = buckets;

function activeBucket(key: string, now: number) {
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt <= now) buckets.delete(key);
  return bucket && bucket.resetAt > now ? bucket : null;
}

/** Segundos até liberar a chave (0 = liberada), sem contar uma nova tentativa. */
export function rateLimitWait(key: string, limit: number) {
  const now = Date.now();
  const bucket = activeBucket(key, now);
  return bucket && bucket.count >= limit ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}

/** Conta uma tentativa e retorna os segundos até liberar (0 = ainda dentro do limite). */
export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = activeBucket(key, now);
  if (!bucket) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  bucket.count++;
  return bucket.count > limit ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

/** IP do cliente. Atrás de proxy reverso, o proxy precisa definir X-Forwarded-For / X-Real-IP. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export const tooManyAttempts = (seconds: number) =>
  `Muitas tentativas. Tente novamente em ${seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`}.`;
