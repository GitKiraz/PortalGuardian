"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { isMauaCourse } from "@/lib/courses";
import { prisma } from "@/lib/db";

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email ou senha inválidos" };
  }
  if (user.status === "INATIVO") return { error: "Conta desativada. Fale com a coordenação." };

  await createSession(user.id);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
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
