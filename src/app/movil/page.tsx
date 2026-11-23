import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import StudentDemoLogin from "./student-demo-login";

export const dynamic = "force-dynamic";

export default async function MobileEntryPage() {
  const { user, profile } = await getAuthContext();

  if (user && profile?.rol === "estudiante" && profile.id_estudiante) {
    redirect("/movil/estudiante");
  }

  const demoEnabled = process.env.DEMO_MODE_ENABLED === "true";

  return (
    <main className="min-h-screen bg-canvas px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-3xl bg-brand-700 p-6 text-white shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-teal-100">UNT · Ingeniería de Sistemas</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">ResiliaUNT</h1>
          <p className="mt-2 text-sm leading-6 text-teal-50">Acceso móvil al portal personal del estudiante.</p>
        </header>

        <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-700">Entorno de demostración</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Ingresar como estudiante</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Selecciona uno de los perfiles sintéticos para explorar su portal personal. Esta aplicación no ofrece acceso de terapeuta.
            </p>
          </div>
          {demoEnabled ? (
            <StudentDemoLogin />
          ) : (
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-sm text-muted">El entorno de demostración no está habilitado en este despliegue.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">¿Tienes una cuenta personal habilitada?</h2>
          <p className="mt-1 text-xs leading-5 text-muted">También puedes iniciar sesión con una cuenta vinculada al rol de estudiante.</p>
          <Link
            href="/login?next=%2Fmovil%2Festudiante"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-brand-700 px-4 py-3 text-sm font-semibold text-brand-700"
          >
            Iniciar sesión con mi cuenta
          </Link>
        </section>

        <p className="px-1 text-[11px] leading-5 text-muted">
          Los perfiles y registros del modo de demostración son ficticios. La aplicación consulta ResiliaUNT a través de sus servicios de servidor; no almacena claves de base de datos en el dispositivo.
        </p>
      </div>
    </main>
  );
}
