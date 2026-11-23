"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.replace("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">Correo institucional</label>
        <input id="email" type="email" autoComplete="username" required value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" required value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500" />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
