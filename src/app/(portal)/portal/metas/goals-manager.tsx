"use client";

import { FormEvent, useEffect, useState } from "react";

type Goal = {
  id_meta: number; categoria: string; descripcion: string; fecha_objetivo: string | null;
  ultimo_estado: "Cumplida" | "Pendiente"; fecha_estado: string | null;
};

export default function GoalsManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [category, setCategory] = useState("Bienestar");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/goals", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "No se pudieron cargar las metas.");
    else setGoals(data.goals);
    setLoading(false);
  }
  useEffect(() => { load().catch(() => { setMessage("Error de conexión."); setLoading(false); }); }, []);

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: category, descripcion: description, fecha_objetivo: targetDate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear la meta.");
      setDescription(""); setTargetDate("");
      setMessage(data.datamartRefreshed ? "Meta creada y sincronizada." : "Meta creada; la sincronización del DataMart está pendiente.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear la meta."); }
    finally { setSaving(false); }
  }

  async function changeStatus(goal: Goal) {
    const nextStatus = goal.ultimo_estado === "Cumplida" ? "Pendiente" : "Cumplida";
    setMessage("");
    const response = await fetch("/api/goals", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_meta: goal.id_meta, estado: nextStatus }),
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "No se pudo actualizar.");
    else { setMessage(data.datamartRefreshed ? "Estado actualizado." : "Estado actualizado; DataMart pendiente de refresco."); await load(); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <h2 className="font-semibold">Crear una meta</h2>
        <form onSubmit={createGoal} className="mt-5 space-y-4">
          <div><label htmlFor="category" className="mb-2 block text-sm font-medium">Categoría</label>
            <select id="category" value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
              <option>Bienestar</option><option>Organización personal</option><option>Académica</option><option>Social</option><option>Desarrollo personal</option><option>Otra</option>
            </select>
          </div>
          <div><label htmlFor="description" className="mb-2 block text-sm font-medium">Descripción breve</label>
            <textarea id="description" required maxLength={180} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-xl border border-line px-3 py-3" placeholder="Describe una meta concreta y realista." />
          </div>
          <div><label htmlFor="target" className="mb-2 block text-sm font-medium">Fecha objetivo (opcional)</label>
            <input id="target" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3" />
          </div>
          <button disabled={saving || description.trim().length < 3} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Crear meta"}</button>
        </form>
        {message && <p role="status" className="mt-4 rounded-lg bg-canvas p-3 text-sm text-muted">{message}</p>}
      </section>
      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <h2 className="font-semibold">Metas activas</h2>
        <p className="mt-1 text-sm text-muted">El tablero cuenta el último estado registrado de cada meta del período.</p>
        {loading ? <p className="mt-5 text-sm text-muted">Cargando...</p> : (
          <div className="mt-5 space-y-3">
            {goals.length ? goals.map((goal) => <article key={goal.id_meta} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><span className="text-xs font-medium text-brand-700">{goal.categoria}</span>
                  <p className="mt-1 text-sm font-medium">{goal.descripcion}</p>
                  <p className="mt-2 text-xs text-muted">Objetivo: {goal.fecha_objetivo || "Sin fecha"}</p>
                </div>
                <span className={"rounded-full px-3 py-1 text-xs font-medium " + (goal.ultimo_estado === "Cumplida" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{goal.ultimo_estado}</span>
              </div>
              <button onClick={() => changeStatus(goal)} className="mt-4 text-xs font-semibold text-brand-700 hover:text-brand-900">
                Marcar como {goal.ultimo_estado === "Cumplida" ? "pendiente" : "cumplida"}
              </button>
            </article>) : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">Todavía no tienes metas registradas.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
