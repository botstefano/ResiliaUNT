"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BarChart3, CalendarDays, HeartHandshake, LogOut, ShieldCheck, Target } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/context";

type Props = { children: React.ReactNode; role: AppRole; displayName: string };

export default function PortalShell({ children, role, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/portal", label: "Resumen", icon: BarChart3, show: true },
    { href: "/portal/habitos", label: "Mis hábitos", icon: Activity, show: role === "estudiante" },
    { href: "/portal/metas", label: "Mis metas", icon: Target, show: role === "estudiante" },
    { href: "/portal/sesiones", label: "Mis sesiones", icon: CalendarDays, show: role === "estudiante" || role === "terapeuta" },
    { href: "/portal/terapeuta", label: "Seguimiento", icon: HeartHandshake, show: role === "terapeuta" },
    { href: "/portal/admin", label: "Administración", icon: ShieldCheck, show: role === "administrador" },
  ].filter((item) => item.show);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const roleLabel = role === "estudiante" ? "Estudiante" : role === "terapeuta" ? "Terapeuta" : "Administrador";
  return (
    <div className="min-h-screen md:flex">
      <aside className="w-full border-b border-line bg-white md:fixed md:inset-y-0 md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-5 md:block md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-brand-600">UNT · Sistemas</p>
            <p className="mt-1 text-xl font-bold tracking-tight">Resilia<span className="text-brand-600">UNT</span></p>
            <p className="mt-1 text-xs text-muted">Acompañamiento y seguimiento</p>
          </div>
          <div className="text-right text-xs text-muted md:hidden">{roleLabel}</div>
        </div>
        <nav aria-label="Navegación principal" className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:px-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/portal" && pathname.startsWith(href));
            const classes = active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-canvas hover:text-ink";
            return <Link key={href} href={href} className={"flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:mb-1 " + classes}>
              <Icon size={18} /> {label}
            </Link>;
          })}
        </nav>
        <div className="hidden border-t border-line px-5 py-5 md:absolute md:inset-x-0 md:bottom-0 md:block">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="mb-4 mt-1 text-xs text-muted">{roleLabel}</p>
          <button onClick={signOut} className="flex items-center gap-2 text-sm text-muted hover:text-red-700"><LogOut size={16} /> Cerrar sesión</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 md:ml-64 md:px-10 md:py-9">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between md:hidden">
            <span className="truncate text-xs text-muted">{displayName}</span>
            <button onClick={signOut} className="flex items-center gap-1 text-xs text-muted"><LogOut size={14} /> Salir</button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
