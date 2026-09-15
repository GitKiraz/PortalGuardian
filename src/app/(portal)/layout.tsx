import type { Metadata } from "next";
import { Sidebar, type NavSection } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { isAdmin, isCoordination } from "@/lib/permissions";
import { getAccessibleAreas } from "@/lib/queries";
import { logout } from "../(auth)/actions";

// Área logada: nunca indexar.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const areas = await getAccessibleAreas(user);

  const sections: NavSection[] = [
    {
      items: [
        { href: "/", label: "Início", icon: "home" },
        { href: "/capacitacao", label: "Capacitação", icon: "training" },
        { href: "/horas", label: "Banco de horas", icon: "hours" },
        { href: "/eventos", label: "Eventos", icon: "events" },
      ],
    },
    {
      title: "Áreas",
      items: areas.map((area) => ({ href: `/areas/${area.slug}`, label: area.name, icon: "area" })),
    },
  ];

  if (isCoordination(user)) {
    sections.push({
      title: "Coordenação",
      items: [
        { href: "/coordenacao", label: "Painel", icon: "panel" },
        { href: "/coordenacao/sala", label: "Sala da coordenação", icon: "room" },
        { href: "/coordenacao/reunioes", label: "Reuniões", icon: "meetings" },
        { href: "/coordenacao/horas", label: "Planilha de horas", icon: "sheet" },
        { href: "/coordenacao/financeiro", label: "Financeiro", icon: "finance" },
        { href: "/coordenacao/eventos", label: "Eventos e formulários", icon: "forms" },
        { href: "/coordenacao/processos", label: "Processos seletivos", icon: "selection" },
        { href: "/coordenacao/membros", label: "Membros", icon: "members" },
        { href: "/coordenacao/capacitacao", label: "Gerenciar capacitação", icon: "manageTraining" },
        ...(isAdmin(user) ? [{ href: "/coordenacao/areas", label: "Gerenciar áreas", icon: "manageAreas" as const }] : []),
      ],
    });
  }

  return (
    <div className="lg:flex">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Sidebar sections={sections} user={{ name: user.name, role: roleLabel(user) }} logoutAction={logout} />
      <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
        {/* Alinhado ao menu (não centralizado no espaço livre, que em telas largas parecia empurrado para a direita) */}
        <div className="max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
