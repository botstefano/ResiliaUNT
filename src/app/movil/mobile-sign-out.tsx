"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function MobileSignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    if (loading) return;
    setLoading(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      // El cierre de la sesión sintética se procesa de forma independiente abajo.
    }
    try {
      await fetch("/api/demo/session", { method: "DELETE" });
    } finally {
      window.location.replace("/movil");
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-muted shadow-soft disabled:opacity-60"
    >
      {loading ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
