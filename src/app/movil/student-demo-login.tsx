"use client";

import { useEffect, useMemo, useState } from "react";

type StudentProfile = {
  id_estudiante: number;
  codigo_universitario: string;
  nombre_visible: string;
  ciclo_academico: number | null;
  turno: string | null;
};

export default function StudentDemoLogin() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/demo/student-profiles", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los estudiantes.");
        if (active) setStudents(data.students ?? []);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Error de conexión.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return students;
    return students.filter((student) =>
      student.nombre_visible.toLocaleLowerCase("es").includes(normalized) ||
      student.codigo_universitario.toLocaleLowerCase("es").includes(normalized)
    );
  }, [students, query]);

  async function enterAsStudent(id: number) {
    if (selectedId !== null) return;
    setSelectedId(id);
    setError("");
    try {
      const response = await fetch("/api/demo/mobile-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar la sesión.");
      window.location.assign("/movil/estudiante");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar la sesión.");
      setSelectedId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <label htmlFor="student-search" className="mb-2 block text-sm font-medium text-ink">Buscar estudiante</label>
        <input
          id="student-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o código sintético"
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {loading ? (
        <p className="rounded-xl bg-white p-5 text-sm text-muted">Cargando estudiantes desde ResiliaUNT…</p>
      ) : filteredStudents.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-muted">No hay estudiantes que coincidan con la búsqueda.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">{filteredStudents.length} perfiles de estudiante disponibles</p>
          {filteredStudents.map((student) => (
            <article key={student.id_estudiante} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-soft">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {student.nombre_visible.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{student.nombre_visible}</p>
                <p className="mt-0.5 text-xs text-muted">{student.codigo_universitario}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Ciclo {student.ciclo_academico ?? "—"} · Turno {student.turno ?? "—"}
                </p>
              </div>
              <button
                type="button"
                disabled={selectedId !== null}
                onClick={() => enterAsStudent(student.id_estudiante)}
                className="shrink-0 rounded-xl bg-brand-700 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {selectedId === student.id_estudiante ? "Ingresando…" : "Ingresar"}
              </button>
            </article>
          ))}
        </div>
      )}
      <p className="rounded-xl bg-white p-3 text-xs leading-5 text-muted">
        Este acceso solo ofrece perfiles de estudiantes. Los perfiles son ficticios y sus registros se consultan desde la base sintética de Supabase.
      </p>
    </section>
  );
}
