import Link from "next/link";
import DemoLogin from "./demo-login";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  if (process.env.DEMO_MODE_ENABLED !== "true") {
    return <main className="flex min-h-screen items-center justify-center px-5">
      <section className="max-w-lg rounded-2xl border border-line bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-semibold">Modo de demostración deshabilitado</h1>
        <p className="mt-3 text-sm leading-6 text-muted">El administrador del despliegue debe habilitar el entorno sintético.</p>
        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-brand-700 hover:underline">Volver al inicio de sesión</Link>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-canvas px-5 py-12">
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-700">UNT · ResiliaUNT</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Modo de demostración</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Selecciona una identidad ficticia para recorrer los portales de estudiante y terapeuta. No necesitas correo, contraseña ni una cuenta de Supabase Auth.</p>
      </div>
      <DemoLogin />
      <p className="mt-6 text-xs leading-5 text-muted">Todos los perfiles, mediciones, hábitos, metas y sesiones de esta modalidad son sintéticos. No introduzcas información personal ni utilices este modo para atención real.</p>
      <Link href="/login" className="mt-5 inline-block text-sm font-medium text-brand-700 hover:underline">Volver al acceso institucional</Link>
    </div>
  </main>;
}
