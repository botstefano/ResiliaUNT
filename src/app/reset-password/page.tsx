import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-700">ResiliaUNT · Seguridad</p>
        <h1 className="mt-4 text-2xl font-semibold">Establecer nueva contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Usa una contraseña nueva que no compartas con otras personas.</p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
