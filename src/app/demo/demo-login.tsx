"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Student = {
  id_estudiante: number;
  codigo_universitario: string;
  nombre_visible: string;
  ciclo_academico: number | null;
  turno: string | null;
};
type Therapist = {
  id_terapeuta: number;
  codigo_terapeuta: string;
  nombre: string;
  especialidad: string | null;
};
type Role = "estudiante" | "terapeuta";
type Profiles = { students: Student[]; therapists: Therapist[] };

export default function DemoLogin() {
  const [profiles, setProfiles] = useState<Profiles>({ students: [], therapists: [] });
  const [role, setRole] = useState<Role>("estudiante");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/demo/profiles", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudieron cargar los perfiles.");
        setProfiles(result as Profiles);
        if (result.students?.[0]) setSelectedId(String(result.students[0].id_estudiante));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error cargando perfiles demo."))
      .finally(() => setLoading(false));
  }, []);

  const options = useMemo(() => role === "estudiante" ? profiles.students : profiles.therapists, [role, profiles]);

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    const first = nextRole === "estudiante" ? profiles.students[0] : profiles.therapists[0];
    setSelectedId(first ? String(nextRole === "estudiante" ? (first as Student).id_estudiante : (first as Therapist).id_terapeuta) : "");
    setError("");
  }

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/demo/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, id: Number(selectedId) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo iniciar el modo demo.");
      window.location.assign("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el modo demo.");
      setSubmitting(false);
    }
  }

  return <section className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
    <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" onClick={() => changeRole("estudiante")}
        className={"rounded-xl border p-4 text-left " + (role === "estudiante" ? "border-brand-600 bg-brand-50" : "border-line hover:bg-canvas")}>
        <span className="block text-sm font-semibold">Portal del estudiante</span>
        <span className="mt-1 block text-xs text-muted">Hábitos, metas, progreso y sesiones</span>
      </button>
      <button type="button" onClick={() => changeRole("terapeuta")}
        className={"rounded-xl border p-4 text-left " + (role === "terapeuta" ? "border-brand-600 bg-brand-50" : "border-line hover:bg-canvas")}>
        <span className="block text-sm font-semibold">Portal del terapeuta</span>
        <span className="mt-1 block text-xs text-muted">Cartera asignada, Perfil 360, evaluaciones y agenda</span>
      </button>
    </div>

    {loading ? <p className="mt-6 text-sm text-muted">Cargando perfiles sintéticos...</p> : (
      <form onSubmit={enter} className="mt-6 space-y-4">
        <div>
          <label htmlFor="demoProfile" className="mb-2 block text-sm font-medium">
            {role === "estudiante" ? "Selecciona un estudiante" : "Selecciona un terapeuta"}
          </label>
          <select id="demoProfile" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm" required>
            <option value="">Selecciona un perfil...</option>
            {role === "estudiante"
              ? profiles.students.map((item) => <option key={item.id_estudiante} value={item.id_estudiante}>{item.codigo_universitario} · {item.nombre_visible} · Ciclo {item.ciclo_academico ?? "—"} · {item.turno ?? "—"}</option>)
              : profiles.therapists.map((item) => <option key={item.id_terapeuta} value={item.id_terapeuta}>{item.codigo_terapeuta} · {item.nombre} · {item.especialidad ?? "Demo"}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <button type="submit" disabled={loading || submitting || !selectedId || options.length === 0}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {submitting ? "Ingresando..." : "Entrar al portal seleccionado"}
        </button>
        <p className="text-xs text-muted">{role === "estudiante" ? profiles.students.length + " estudiantes sintéticos disponibles" : profiles.therapists.length + " terapeutas sintéticos disponibles"}</p>
      </form>
    )}
  </section>;
}
