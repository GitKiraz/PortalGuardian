"use client";

import {
  CalendarClock,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  Headphones,
  House,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  PartyPopper,
  Settings2,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";

const ICONS = {
  home: House,
  training: GraduationCap,
  hours: Clock,
  events: PartyPopper,
  area: Layers,
  panel: LayoutDashboard,
  room: Headphones,
  meetings: CalendarClock,
  sheet: FileSpreadsheet,
  finance: Wallet,
  forms: ClipboardList,
  selection: UserPlus,
  members: Users,
  manageTraining: MonitorPlay,
  manageAreas: Settings2,
};

export type NavIcon = keyof typeof ICONS;
export type NavSection = { title?: string; items: { href: string; label: string; icon: NavIcon }[] };

export function Sidebar({
  sections,
  user,
  logoutAction,
}: {
  sections: NavSection[];
  user: { name: string; role: string };
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const matches = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  // Destaca só o item mais específico (ex.: /coordenacao/financeiro não acende também /coordenacao).
  const activeHref = sections
    .flatMap((section) => section.items.map((item) => item.href))
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];

  // Menu mobile: fecha com Esc e trava a rolagem da página por trás.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="menu-principal"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        id="menu-principal"
        className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] flex-col border-r border-line bg-panel lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Brand />
          <button className="btn btn-ghost btn-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <nav aria-label="Menu principal" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {sections.map((section, i) => (
            <div key={section.title ?? i}>
              {section.title && (
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted">{section.title}</p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active = item.href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors lg:py-1.5 ${
                          active ? "bg-accent/15 text-accent-text" : "text-neutral-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <Link href="/perfil" onClick={() => setOpen(false)} className="block rounded-md hover:text-accent-text">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.role} · meu perfil</p>
          </Link>
          <form action={logoutAction} className="mt-3">
            <button className="btn btn-ghost btn-sm w-full">
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
