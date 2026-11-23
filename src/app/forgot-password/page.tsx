import Link from "next/link";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-700">ResiliaUNT · Acceso</p>
        <h1 className="mt-4 text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Escribe el correo asociado a tu cuenta. Si está registrado, Supabase enviará un enlace para restablecer la contraseña.</p>
        <ForgotPasswordForm />
        <Link href="/login" className="mt-7 inline-block text-sm font-medium text-brand-700 hover:underline">← Volver al inicio de sesión</Link>
      </section>
    </main>
  );
}
