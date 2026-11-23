import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth/context";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const { user } = await getAuthContext();
  if (user) redirect("/portal");
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
          <p className="mt-2 text-sm leading-6 text-muted">Accede con la cuenta institucional habilitada para el sistema.</p>
          {searchParams?.error === "auth_callback_failed" && (
            <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              El enlace de autenticación no pudo validarse o ha expirado. Solicita un nuevo enlace.
            </p>
          )}
          <LoginForm />
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
