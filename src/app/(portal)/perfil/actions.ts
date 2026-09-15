"use server";

import type { ActionState } from "@/components/forms";
import { refreshPortal, text } from "@/lib/action-utils";
import { hashPassword, requireUser, revokeOtherSessions, verifyPassword } from "@/lib/auth";
import { isMauaCourse } from "@/lib/courses";
import { prisma } from "@/lib/db";

export async function updateProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = text(formData, "name");
  if (name.length < 3) return { error: "Informe seu nome completo" };

  // Aceita cursos da lista ou o valor antigo já salvo (cadastros anteriores à lista).
  const course = text(formData, "course");
  if (course && !isMauaCourse(course) && course !== user.course) return { error: "Selecione um curso da lista" };

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name.slice(0, 120), ra: text(formData, "ra") || null, course: course || null },
  });
  refreshPortal();
  return { success: "Perfil atualizado" };
}

export async function changePassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Senha atual incorreta" };
  if (next.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres" };
  if (next !== confirm) return { error: "As senhas não conferem" };
  if (next === current) return { error: "A nova senha precisa ser diferente da atual" };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await revokeOtherSessions(user.id);
  return { success: "Senha alterada. As sessões em outros dispositivos foram encerradas." };
}
