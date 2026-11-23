"use client";

import { useEffect, useState } from "react";

type Session = { id_sesion: number; id_estudiante: number; inicio: string; fin: string | null; estado: string; modalidad: string; sala_terapia: { nombre_sala: string; pabellon: string | null } | null };

export default function SessionsList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sessions", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las sesiones.");
        setSessions(data.sessions);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error de conexión."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Cargando sesiones...</p>;
  if (error) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p>;
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Agenda</h2>
        <span className="text-xs text-muted">{sessions.length} sesiones</span>
      </div>
      {sessions.length ? <div className="divide-y divide-line">
        {sessions.map((session) => <article key={session.id_sesion} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div>
            <p className="text-sm font-semibold">{new Date(session.inicio).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</p>
            <p className="mt-1 text-xs text-muted">Modalidad {session.modalidad}{session.sala_terapia ? " · " + session.sala_terapia.nombre_sala : ""}</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{session.estado}</span>
        </article>)}
      </div> : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">No hay sesiones visibles para esta cuenta.</p>}
    </section>
  );
}
