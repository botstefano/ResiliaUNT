import { redirect } from "next/navigation";
import PortalShell from "@/components/portal-shell";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAuthContext();
  if (!user) redirect("/login");

  if (!profile || profile.rol === "pendiente") {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="max-w-xl rounded-2xl border border-line bg-white p-8 shadow-soft">
          <p className="text-sm font-semibold text-brand-700">ResiliaUNT · Acceso pendiente</p>
          <h1 className="mt-3 text-2xl font-semibold">Tu cuenta todavía no está habilitada</h1>
          <p className="mt-3 text-sm leading-6 text-muted">El equipo administrador debe vincular esta cuenta con el perfil institucional correspondiente. Hasta entonces no se muestran datos ni módulos del sistema.</p>
          <form action="/api/auth/logout" method="post" className="mt-6">
            <button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }

  const displayName = profile.nombre_visible || user.email || "Usuario ResiliaUNT";
  return <PortalShell role={profile.rol} displayName={displayName}>{children}</PortalShell>;
}
