import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth/context";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

type LoginSearchParams = { error?: string; next?: string };

export default async function LoginPage({ searchParams }: { searchParams?: LoginSearchParams }) {
  const mobileStudentEntry = searchParams?.next === "/movil/estudiante";
  const redirectTo = mobileStudentEntry ? "/movil/estudiante" : "/portal";
  const { user, profile } = await getAuthContext();

  if (user && !mobileStudentEntry) redirect("/portal");
  if (user && mobileStudentEntry && profile?.rol === "estudiante" && profile.id_estudiante) {
    redirect("/movil/estudiante");
  }

  const mobileAccessDenied = Boolean(user && mobileStudentEntry);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-soft md:grid-cols-2">
        <section className="hidden bg-brand-700 p-12 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[.22em] text-teal-100">Universidad Nacional de Trujillo</div>
            <h1 className="mt-7 text-4xl font-semibold leading-tight">ResiliaUNT</h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-teal-50">Seguimiento, hábitos y acompañamiento para estudiantes de Ingeniería de Sistemas.</p>
          </div>
          <p className="text-sm text-teal-100">Plataforma de apoyo. No reemplaza la atención profesional.</p>
        </section>
        <section className="p-7 sm:p-12">
          <div className="mb-8 md:hidden">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-700">UNT · Ingeniería de Sistemas</p>
            <h1 className="mt-2 text-3xl font-semibold">ResiliaUNT</h1>
          </div>
          <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Accede con la cuenta habilitada para ResiliaUNT.</p>
          {searchParams?.error === "auth_callback_failed" && (
            <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              El enlace de autenticación no pudo validarse o ha expirado. Solicita un nuevo enlace.
            </p>
          )}
          {mobileAccessDenied ? (
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">Acceso exclusivo para estudiantes</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                La aplicación móvil está reservada a cuentas vinculadas a un perfil de estudiante. Esta cuenta no tiene ese rol habilitado.
              </p>
              <form action="/api/auth/logout" method="post" className="mt-4">
                <button className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white">
                  Cerrar esta sesión
                </button>
              </form>
            </div>
          ) : (
            <LoginForm redirectTo={redirectTo} />
          )}
          {!mobileStudentEntry && process.env.DEMO_MODE_ENABLED === "true" && (
            <div className="mt-7 rounded-xl border border-line p-4">
              <p className="text-sm font-semibold">¿Quieres probar el prototipo?</p>
              <p className="mt-1 text-xs leading-5 text-muted">Usa identidades sintéticas sin crear cuentas institucionales.</p>
              <Link href="/demo" className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-brand-600 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                Entrar al modo de demostración
              </Link>
            </div>
          )}
          <div className="mt-4 text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <p className="mt-8 rounded-xl bg-canvas p-4 text-xs leading-5 text-muted">
            El acceso requiere habilitación previa por un administrador. Las cuentas nuevas permanecen pendientes y no obtienen permisos automáticamente.
          </p>
        </section>
      </div>
    </main>
  );
}
