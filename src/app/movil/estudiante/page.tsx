import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BarChart3, CalendarDays, Target } from "lucide-react";
import ChatbotWidget from "@/components/chatbot-widget";
import MobileSignOutButton from "../mobile-sign-out";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

const shortcuts = [
  { href: "/portal", title: "Mi progreso", description: "Consulta tus indicadores y evolución personal.", Icon: BarChart3 },
  { href: "/portal/habitos", title: "Mis hábitos", description: "Registra y revisa tus actividades.", Icon: Activity },
  { href: "/portal/metas", title: "Mis metas", description: "Organiza tus objetivos y actualiza tus avances.", Icon: Target },
  { href: "/portal/sesiones", title: "Mis sesiones", description: "Consulta la información de tus sesiones.", Icon: CalendarDays },
];

export default async function StudentMobilePage() {
  const { user, profile } = await getAuthContext();

  if (!user) redirect("/movil");
  if (profile?.rol !== "estudiante" || !profile.id_estudiante) redirect("/movil");

  const displayName = profile.nombre_visible?.trim() || "Estudiante";
  const firstName = displayName.split(/\s+/)[0];

  return (
    <main className="min-h-screen bg-canvas px-4 pb-28 pt-5 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-700">ResiliaUNT · UNT</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Hola, {firstName}</h1>
            <p className="mt-1 text-sm text-muted">Tu espacio personal de seguimiento.</p>
          </div>
          <MobileSignOutButton />
        </header>

        {profile.isDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <strong>Perfil sintético de demostración.</strong> La información mostrada es ficticia y se consulta desde Supabase.
          </div>
        )}

        <section className="rounded-3xl bg-brand-700 p-5 text-white shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-teal-100">Portal del estudiante</p>
          <h2 className="mt-2 text-xl font-semibold">Tu seguimiento, desde un solo lugar</h2>
          <p className="mt-2 text-sm leading-6 text-teal-50">
            Consulta tu progreso y administra tus registros personales desde tu cuenta.
          </p>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">Mi espacio</h2>
            <p className="mt-1 text-xs text-muted">Selecciona el módulo que deseas consultar.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shortcuts.map(({ href, title, description, Icon }) => (
              <Link key={href} href={href}
                className="flex min-h-28 items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:border-brand-300 hover:bg-brand-50/30 focus:outline-none focus:ring-2 focus:ring-brand-500">
                <span className="rounded-xl bg-brand-50 p-3 text-brand-700"><Icon size={21} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4">
          <p className="text-sm font-semibold text-ink">Brújula está disponible</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Puedes abrir el asistente para resolver dudas sobre el uso de la plataforma y consultar la información autorizada de tu propio perfil.
          </p>
        </section>

        <p className="px-1 text-[11px] leading-5 text-muted">
          ResiliaUNT es una herramienta de seguimiento y apoyo. No realiza diagnósticos ni sustituye la atención profesional. La información que ves corresponde a tu cuenta.
        </p>
      </div>
      <ChatbotWidget role="estudiante" />
    </main>
  );
}
