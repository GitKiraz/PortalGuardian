import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE } from "./constants";
import { prisma } from "./db";
import { isAdmin, isCoordination } from "./permissions";

const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;
/** Hash descartável para o login gastar o mesmo tempo quando o email não existe. */
export function dummyPasswordHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

// Em produção o cookie é Secure por padrão (navegadores aceitam em http://localhost).
// COOKIE_SECURE="false" só para servir o portal sem HTTPS fora do localhost.
const secureCookie = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Encerra as sessões do usuário em outros dispositivos (ex.: após trocar a senha). */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await prisma.session.deleteMany({ where: { userId, ...(token ? { id: { not: hashToken(token) } } : {}) } });
}

/** Usuário logado (qualquer status) ou null. Memoizado por requisição. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        include: {
          areaMemberships: { select: { areaId: true } },
          coordinatedArea: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Usuário ativo ou null — para route handlers. */
export async function getActiveUser() {
  const user = await getCurrentUser();
  return user?.status === "ATIVO" ? user : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "ATIVO") redirect("/aguardando");
  return user;
}

export async function requireCoordination() {
  const user = await requireUser();
  if (!isCoordination(user)) redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/");
  return user;
}
