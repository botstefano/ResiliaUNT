"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, AuthError, Session } from "@supabase/supabase-js";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data, error: sessionError }: { data: { session: Session | null }; error: AuthError | null }) => {
      if (!active) return;
      if (sessionError || !data.session) setError("El enlace no es válido o ha expirado. Solicita uno nuevo.");
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setError("");
        setReady(true);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Contraseña actualizada correctamente. Redirigiendo al portal...");
      window.setTimeout(() => {
        router.replace("/portal");
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <p className="mt-7 text-sm text-muted">Validando el enlace...</p>;

  if (error && !message) {
    return (
      <div className="mt-7 space-y-4">
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>
        <Link href="/forgot-password" className="inline-block text-sm font-semibold text-brand-700 hover:underline">Solicitar otro enlace</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <div>
        <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">Nueva contraseña</label>
        <input id="newPassword" type="password" autoComplete="new-password" required minLength={10} value={password}
          onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-line px-4 py-3" />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirmar contraseña</label>
        <input id="confirmPassword" type="password" autoComplete="new-password" required minLength={10} value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-line px-4 py-3" />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}
      <button disabled={loading || !password || !confirmation} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? "Actualizando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
