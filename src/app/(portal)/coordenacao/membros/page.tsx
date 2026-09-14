import type { Metadata } from "next";
import Link from "next/link";
import type { UserStatus } from "@/generated/prisma/enums";
import { ActionForm, SubmitButton } from "@/components/forms";
import { TemporaryPasswordInput } from "@/components/PasswordInput";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireCoordination } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatHours, plural } from "@/lib/format";
import { ROLE_LABELS, ROLES, roleLabel, USER_STATUS_LABELS } from "@/lib/labels";
import { canAssignRole, isAdmin } from "@/lib/permissions";
import { approveUser, rejectUser, resetUserPassword, setUserActive, updateUserRole } from "../actions";

export const metadata: Metadata = { title: "Membros" };

const STATUS_TONES: Record<UserStatus, "success" | "warning" | "danger"> = {
  ATIVO: "success",
  PENDENTE: "warning",
  INATIVO: "danger",
};

export default async function MembersPage({ searchParams }: PageProps<"/coordenacao/membros">) {
  const actor = await requireCoordination();
  const admin = isAdmin(actor);
  const { status, q } = await searchParams;
  const statusFilter = typeof status === "string" && status in USER_STATUS_LABELS ? (status as UserStatus) : undefined;
  const search = typeof q === "string" ? q.trim() : "";

  const [users, hours, areas] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] }
          : {}),
      },
      include: {
        coordinatedArea: { select: { id: true, name: true } },
        areaMemberships: { include: { area: { select: { name: true } } } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.hourEntry.groupBy({ by: ["userId"], where: { status: "VALIDO" }, _sum: { hours: true } }),
    prisma.area.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { coordinator: { select: { name: true } } },
    }),
  ]);
  const hoursByUser = new Map(hours.map((h) => [h.userId, Number(h._sum.hours ?? 0)]));

  return (
    <>
      <PageHeader
        title="Membros"
        subtitle={
          admin
            ? "Aprove cadastros, defina cargos, coordenadores de área e status das contas."
            : "Aprove novos cadastros. Cargos são definidos pelo Presidente, Vice-presidente ou Dev."
        }
      />

      <form className="card mb-6 flex flex-wrap items-end gap-3">
        <input className="input max-w-xs" name="q" type="search" aria-label="Buscar por nome ou email" defaultValue={search} placeholder="Buscar por nome ou email" />
        <select className="input w-52" name="status" aria-label="Filtrar por status" defaultValue={statusFilter ?? ""}>
          <option value="">Todos os status</option>
          {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary">Filtrar</button>
        {(search || statusFilter) && (
          <Link href="/coordenacao/membros" className="btn btn-ghost">
            Limpar
          </Link>
        )}
      </form>

      <Card title={plural(users.length, "membro")}>
        {users.length === 0 ? (
          <Empty>Nenhum membro encontrado.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {users.map((user) => {
              const manageable = admin && user.id !== actor.id && (user.role !== "DEV" || actor.role === "DEV");
              return (
                <li key={user.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {user.name}
                        <Badge tone={STATUS_TONES[user.status]}>{USER_STATUS_LABELS[user.status]}</Badge>
                        <Badge tone={user.role === "JUNIOR" ? "neutral" : "accent"}>{roleLabel(user)}</Badge>
                      </p>
                      <p className="text-xs text-muted">
                        {user.email}
                        {user.ra ? ` · RA ${user.ra}` : ""}
                        {user.course ? ` · ${user.course}` : ""} · {formatHours(hoursByUser.get(user.id) ?? 0)}
                        {user.areaMemberships.length > 0 && ` · Áreas: ${user.areaMemberships.map((m) => m.area.name).join(", ")}`}
                      </p>
                    </div>
                    {user.status === "PENDENTE" && (
                      <div className="flex gap-2">
                        <form action={approveUser.bind(null, user.id)}>
                          <SubmitButton className="btn btn-primary btn-sm">Aprovar</SubmitButton>
                        </form>
                        <form action={rejectUser.bind(null, user.id)}>
                          <SubmitButton className="btn btn-danger btn-sm" confirm={`Recusar ${user.name}?`}>
                            Recusar
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </div>

                  {manageable && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-accent-text">Gerenciar</summary>
                      <div className="mt-3 grid gap-4 rounded-lg border border-line bg-panel-2 p-4 md:grid-cols-3">
                        <ActionForm action={updateUserRole.bind(null, user.id)} className="flex flex-col gap-2" resetOnSuccess={false}>
                          <span className="label">Cargo</span>
                          <select className="input" name="role" aria-label="Cargo" defaultValue={user.role}>
                            {ROLES.filter((role) => canAssignRole(actor, role)).map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <select className="input" name="areaId" aria-label="Área coordenada" defaultValue={user.coordinatedArea?.id ?? ""}>
                            <option value="">Área coordenada (só para Coordenador)</option>
                            {areas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.name}
                                {area.coordinator ? ` (atual: ${area.coordinator.name})` : ""}
                              </option>
                            ))}
                          </select>
                          <button className="btn btn-primary btn-sm">Salvar cargo</button>
                        </ActionForm>

                        <ActionForm action={resetUserPassword.bind(null, user.id)} className="flex flex-col gap-2" resetOnSuccess={false}>
                          <span className="label">Redefinir senha</span>
                          <TemporaryPasswordInput />
                          <button className="btn btn-ghost btn-sm">Redefinir</button>
                        </ActionForm>

                        <div className="flex flex-col gap-2">
                          <span className="label">Conta</span>
                          {user.status === "INATIVO" ? (
                            <form action={setUserActive.bind(null, user.id, true)}>
                              <SubmitButton className="btn btn-ghost btn-sm w-full">Reativar conta</SubmitButton>
                            </form>
                          ) : (
                            <form action={setUserActive.bind(null, user.id, false)}>
                              <SubmitButton className="btn btn-danger btn-sm w-full" confirm={`Desativar a conta de ${user.name}?`}>
                                Desativar conta
                              </SubmitButton>
                            </form>
                          )}
                        </div>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
