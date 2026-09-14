import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/forms";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";
import { createArea, deleteArea, updateArea } from "../actions";

export const metadata: Metadata = { title: "Gerenciar áreas" };

function AreaFields({ area }: { area?: { name: string; description: string | null; isGlobal: boolean; order: number } }) {
  return (
    <>
      <Field label="Nome">
        <input className="input" name="name" required defaultValue={area?.name} placeholder="Ex.: Competições" />
      </Field>
      <Field label="Ordem no menu">
        <input className="input" type="number" name="order" defaultValue={area?.order} placeholder="Automática (fim do menu)" />
      </Field>
      <Field label="Descrição" className="sm:col-span-2">
        <textarea className="input" name="description" rows={3} defaultValue={area?.description ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isGlobal" defaultChecked={area?.isGlobal} />
        Área global (todos os alunos Juniors e Plenos têm acesso, como o Registro)
      </label>
    </>
  );
}

export default async function ManageAreasPage() {
  await requireAdmin();
  const areas = await prisma.area.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { coordinator: { select: { name: true } }, _count: { select: { members: true, projects: true } } },
  });

  return (
    <>
      <PageHeader
        title="Gerenciar áreas"
        subtitle={
          <>
            Crie novas frentes à medida que a entidade cresce. O coordenador de cada área é definido em{" "}
            <Link href="/coordenacao/membros" className="text-accent-text hover:underline">
              Membros
            </Link>
            .
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {areas.map((area) => (
          <Card
            key={area.id}
            title={
              <span className="flex flex-wrap items-center gap-2 normal-case tracking-normal text-neutral-100">
                {area.name}
                {area.isGlobal && <Badge tone="accent">Global</Badge>}
              </span>
            }
            actions={<span className="font-mono text-xs text-muted">/areas/{area.slug}</span>}
          >
            <p className="mb-4 text-xs text-muted">
              Coordenador: {area.coordinator?.name ?? "—"} · {plural(area._count.members, "integrante")} · {plural(area._count.projects, "projeto")}
            </p>
            <ActionForm action={updateArea.bind(null, area.id)} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={false}>
              <AreaFields area={area} />
              <button className="btn btn-primary sm:col-span-2">Salvar</button>
            </ActionForm>
            <ActionForm action={deleteArea.bind(null, area.id)} className="mt-3">
              <button className="btn btn-danger btn-sm" data-confirm={`Excluir a área ${area.name}?`}>
                Excluir área
              </button>
            </ActionForm>
          </Card>
        ))}

        <Card title="Nova área">
          <ActionForm action={createArea} className="grid gap-3 sm:grid-cols-2">
            <AreaFields />
            <Field label="Endereço (opcional)" hint="Gerado a partir do nome se vazio" className="sm:col-span-2">
              <input className="input" name="slug" placeholder="competicoes" />
            </Field>
            <button className="btn btn-primary sm:col-span-2">Criar área</button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
