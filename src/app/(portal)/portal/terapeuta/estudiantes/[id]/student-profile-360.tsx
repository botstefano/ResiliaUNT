"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MetricCard from "@/components/metric-card";
import DashboardChart from "@/components/dashboard-chart";

type ProfileData = {
  student: { id_estudiante: number; codigo_universitario: string; nombre_visible: string; ciclo_academico: number | null; turno: string | null };
  evaluations: Array<{ fecha: string; indice_resiliencia: number; pensamientos_intrusivos: number; periodo_referencia_dias: number; cantidad_sesiones: number }>;
  habits: Array<{ fecha: string; nombre_habito: string; intensidad: string; completado: boolean }>;
  goals: Array<{ id_meta: number; categoria: string; descripcion: string; fecha_objetivo: string | null; ultimo_estado: string; fecha_estado: string | null }>;
  networks: Array<{ fecha: string; red_apoyo_activa: boolean; contactos_activos: number; interacciones_sociales: number }>;
  sessions: Array<{ inicio: string; estado: string; modalidad: string }>;
};

const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const fmt = (value: number | null, suffix = "") => value === null ? "—" : value.toFixed(1) + suffix;

export default function StudentProfile360({ studentId }: { studentId: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/therapist/students/" + encodeURIComponent(studentId), { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo abrir el perfil.");
        setData(result);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error de conexión."))
      .finally(() => setLoading(false));
  }, [studentId]);

  const trend = useMemo(() => {
    if (!data) return [];
    const grouped = new Map<string, { resilience: number[]; intrusive: number[] }>();
    data.evaluations.forEach((row) => {
      const key = row.fecha.slice(0, 7);
      const item = grouped.get(key) ?? { resilience: [], intrusive: [] };
      item.resilience.push(Number(row.indice_resiliencia));
      item.intrusive.push((Number(row.pensamientos_intrusivos) / Math.max(1, row.periodo_referencia_dias)) * 30);
      grouped.set(key, item);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => ({
      month: key.slice(5, 7) + "/" + key.slice(2, 4),
      resilience: avg(item.resilience),
      intrusive: avg(item.intrusive),
    }));
  }, [data]);

  if (loading) return <p className="text-sm text-muted">Cargando Perfil 360...</p>;
  if (error || !data) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error || "Perfil no disponible."}</div>;

  const latestNetwork = data.networks[0];
  const goalDone = data.goals.filter((goal) => goal.ultimo_estado === "Cumplida").length;
  const goalPct = data.goals.length ? (goalDone / data.goals.length) * 100 : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/portal/terapeuta" className="text-sm font-medium text-brand-700 hover:underline">← Volver al seguimiento</Link>
          <p className="mt-4 text-sm font-medium text-brand-700">Perfil 360 · estudiante asignado</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.student.nombre_visible}</h1>
          <p className="mt-2 text-sm text-muted">{data.student.codigo_universitario} · Ciclo {data.student.ciclo_academico ?? "—"} · {data.student.turno ?? "—"}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">Acceso autorizado por asignación</span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Resiliencia promedio" value={fmt(avg(data.evaluations.map((row) => Number(row.indice_resiliencia))))} note={data.evaluations.length + " evaluaciones registradas"} />
        <MetricCard label="Intrusivos / 30 días" value={fmt(avg(data.evaluations.map((row) => (Number(row.pensamientos_intrusivos) / Math.max(1, row.periodo_referencia_dias)) * 30)))} note="Frecuencia normalizada según período de referencia" accent="bg-amber-500" />
        <MetricCard label="Metas cumplidas" value={fmt(goalPct, "%")} note={data.goals.length + " metas activas, último estado"} accent="bg-indigo-500" />
        <MetricCard label="Red de apoyo" value={latestNetwork ? (latestNetwork.red_apoyo_activa ? "Activa" : "No activa") : "—"} note={latestNetwork ? "Última valoración: " + latestNetwork.fecha : "Sin valoraciones registradas"} accent="bg-sky-500" />
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Tendencia de evaluaciones</h2>
        <p className="mt-1 text-xs text-muted">Historial agregado por mes; no representa una conclusión clínica automática.</p>
        <div className="mt-4"><DashboardChart data={trend} /></div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">Metas personales</h2>
          <div className="mt-4 space-y-3">
            {data.goals.length ? data.goals.map((goal) => <article key={goal.id_meta} className="rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand-700">{goal.categoria}</p><p className="mt-1 text-sm">{goal.descripcion}</p><p className="mt-1 text-xs text-muted">Estado observado: {goal.fecha_estado || "—"}</p></div>
                <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs " + (goal.ultimo_estado === "Cumplida" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{goal.ultimo_estado}</span></div>
            </article>) : <p className="text-sm text-muted">Sin metas activas.</p>}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">Red de apoyo · historial</h2>
          <div className="mt-4 space-y-3">
            {data.networks.length ? data.networks.map((network) => <article key={network.fecha} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <div><p className="text-sm font-medium">{network.fecha}</p><p className="mt-1 text-xs text-muted">{network.contactos_activos} contactos · {network.interacciones_sociales} interacciones</p></div>
              <span className={"rounded-full px-2.5 py-1 text-xs " + (network.red_apoyo_activa ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{network.red_apoyo_activa ? "Activa" : "No activa"}</span>
            </article>) : <p className="text-sm text-muted">Sin valoraciones registradas.</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Hábitos registrados</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead><tr className="border-b border-line text-xs text-muted"><th className="pb-3 pr-4 font-medium">Fecha</th><th className="pb-3 pr-4 font-medium">Hábito</th><th className="pb-3 pr-4 font-medium">Intensidad</th><th className="pb-3 font-medium">Estado</th></tr></thead>
            <tbody>{data.habits.map((habit, index) => <tr key={habit.fecha + habit.nombre_habito + index} className="border-b border-line last:border-0"><td className="py-3 pr-4">{habit.fecha}</td><td className="py-3 pr-4">{habit.nombre_habito}</td><td className="py-3 pr-4">{habit.intensidad}</td><td className="py-3">{habit.completado ? "Completado" : "Pendiente"}</td></tr>)}</tbody>
          </table>
          {!data.habits.length && <p className="text-sm text-muted">Sin hábitos registrados.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 className="font-semibold">Sesiones</h2>
        <div className="mt-4 space-y-2">
          {data.sessions.length ? data.sessions.map((session, index) => <div key={session.inicio + index} className="flex flex-wrap justify-between gap-2 border-b border-line py-3 last:border-0">
            <span className="text-sm">{new Date(session.inicio).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</span>
            <span className="text-xs text-muted">{session.modalidad} · {session.estado}</span>
          </div>) : <p className="text-sm text-muted">Sin sesiones registradas.</p>}
        </div>
      </section>

      <p className="mt-6 text-xs leading-5 text-muted">Este perfil presenta registros estructurados y descriptivos; no incluye notas narrativas, diagnósticos ni recomendaciones clínicas automatizadas.</p>
    </div>
  );
}
