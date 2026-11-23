"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const redirectTo = new URL("/auth/callback?next=/reset-password", window.location.origin).toString();
      const { error: resetError } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) throw resetError;
      // Mensaje neutro para no revelar si un correo existe en el sistema.
      setMessage("Si el correo corresponde a una cuenta habilitada, recibirás un mensaje con los siguientes pasos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo solicitar la recuperación.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <div>
        <label htmlFor="recoveryEmail" className="mb-2 block text-sm font-medium">Correo institucional</label>
        <input id="recoveryEmail" type="email" required autoComplete="email" value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-line px-4 py-3" />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}
