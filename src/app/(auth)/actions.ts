"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { createSession, destroySession, dummyPasswordHash, hashPassword, verifyPassword } from "@/lib/auth";
import { isMauaCourse } from "@/lib/courses";
import { prisma } from "@/lib/db";
import { clearRateLimit, clientIp, hitRateLimit, rateLimitWait, tooManyAttempts } from "@/lib/rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/** Só caminhos internos: "/\evil.com" e "//evil.com" viram "/" (o navegador os trata como outro domínio). */
const safeRedirectPath = (value: string) => (/^\/(?![/\\])[^\\\s]*$/.test(value) ? value : "/");

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  // Limita tentativas erradas por conta e por IP (campus atrás de NAT: limite de IP mais folgado).
  const ipKey = `login-ip:${await clientIp()}`;
  const emailKey = `login-email:${email}`;
  const wait = Math.max(rateLimitWait(emailKey, 10), rateLimitWait(ipKey, 50));
  if (wait) return { error: tooManyAttempts(wait) };

  const user = await prisma.user.findUnique({ where: { email } });
  // Compara com um hash falso quando o email não existe: o tempo de resposta não revela contas cadastradas.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
  if (!user || !valid) {
    hitRateLimit(emailKey, 10, FIFTEEN_MINUTES);
    hitRateLimit(ipKey, 50, FIFTEEN_MINUTES);
    return { error: "Email ou senha inválidos" };
  }
  if (user.status === "INATIVO") return { error: "Conta desativada. Fale com a coordenação." };

  clearRateLimit(emailKey);
  await createSession(user.id);
  redirect(safeRedirectPath(next));
}

const registerSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(200),
  ra: z.string().trim().max(30).optional(),
  course: z
    .string()
    .trim()
    .refine((value) => value === "" || isMauaCourse(value), "Selecione um curso da lista")
    .optional(),
});

export async function register(_state: ActionState, formData: FormData): Promise<ActionState> {
  const wait = hitRateLimit(`register:${await clientIp()}`, 20, ONE_HOUR);
  if (wait) return { error: tooManyAttempts(wait) };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (formData.get("confirm") !== formData.get("password")) return { error: "As senhas não conferem" };
  const { name, email, password, ra, course } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) return { error: "Já existe uma conta com este email" };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), ra: ra || null, course: course || null },
  });
  await createSession(user.id);
  redirect("/aguardando");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
