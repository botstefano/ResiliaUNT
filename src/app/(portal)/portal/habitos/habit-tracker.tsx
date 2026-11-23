"use client";

import { useEffect, useState } from "react";

type Habit = { id_habito: number; nombre: string; categoria: string };
type RecordRow = { id_registro_habito: number; id_habito: number; intensidad: string; completado: boolean };
type Payload = { habits: Habit[]; records: RecordRow[]; date: string };

export default function HabitTracker() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [habitId, setHabitId] = useState("");
  const [intensity, setIntensity] = useState("Media");
  const [completed, setCompleted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/habits", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "No se pudieron cargar los hábitos.");
    else {
      setPayload(data);
      if (!habitId && data.habits.length) setHabitId(String(data.habits[0].id_habito));
      const current = data.records.find((row: RecordRow) => String(row.id_habito) === habitId);
      if (current) { setIntensity(current.intensidad); setCompleted(current.completado); }
    }
    setLoading(false);
  }

  useEffect(() => { load().catch(() => { setMessage("Error de conexión."); setLoading(false); }); }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload || !habitId) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/habits", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_habito: Number(habitId), fecha: payload.date, intensidad: intensity, completado: completed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
      setMessage(data.datamartRefreshed ? "Registro guardado y DataMart actualizado." : "Registro guardado. El DataMart requiere actualización de servidor.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }

  const selected = payload?.records.find((row) => String(row.id_habito) === habitId);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <h2 className="font-semibold">Registro del día</h2>
        <p className="mt-1 text-sm text-muted">Fecha: {payload?.date || "—"}</p>
        {loading ? <p className="mt-6 text-sm text-muted">Cargando...</p> : (
          <form onSubmit={save} className="mt-6 space-y-5">
            <div>
              <label htmlFor="habit" className="mb-2 block text-sm font-medium">Hábito</label>
              <select id="habit" value={habitId} onChange={(event) => setHabitId(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3">
                {(payload?.habits ?? []).map((habit) => <option key={habit.id_habito} value={habit.id_habito}>{habit.nombre} · {habit.categoria}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="intensity" className="mb-2 block text-sm font-medium">Intensidad percibida</label>
              <select id="intensity" value={intensity} onChange={(event) => setIntensity(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
                <option>Alta</option><option>Media</option><option>Baja</option>
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-xl bg-canvas p-3 text-sm">
              <input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} className="h-4 w-4 accent-brand-600" />
              Marcar como completado
            </label>
            {selected && <p className="text-xs text-muted">Ya existe un registro para este hábito y día. Al guardar se actualizará ese registro.</p>}
            <button disabled={saving || !payload?.habits.length} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar registro"}</button>
          </form>
        )}
        {message && <p role="status" className="mt-4 rounded-lg bg-canvas p-3 text-sm text-muted">{message}</p>}
      </section>
      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <h2 className="font-semibold">Registros de hoy</h2>
        <p className="mt-1 text-sm text-muted">Un registro por hábito y fecha.</p>
        <div className="mt-5 space-y-3">
          {(payload?.records ?? []).length ? payload?.records.map((record) => {
            const habit = payload.habits.find((item) => item.id_habito === record.id_habito);
            return <div key={record.id_registro_habito} className="flex items-center justify-between rounded-xl border border-line p-4">
              <div><p className="text-sm font-medium">{habit?.nombre || "Hábito"}</p><p className="mt-1 text-xs text-muted">Intensidad {record.intensidad}</p></div>
              <span className={"rounded-full px-3 py-1 text-xs font-medium " + (record.completado ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{record.completado ? "Completado" : "Pendiente"}</span>
            </div>;
          }) : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">Todavía no hay registros para hoy.</p>}
        </div>
      </section>
    </div>
  );
}
