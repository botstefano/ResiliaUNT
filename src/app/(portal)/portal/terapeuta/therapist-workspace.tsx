"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Student = { id_estudiante: number; codigo_universitario: string; nombre_visible: string; ciclo_academico: number | null; turno: string | null };
type Session = { id_sesion: number; id_estudiante: number; inicio: string; estado: string; modalidad: string };
type Tab = "clinical" | "support" | "session";
const browserToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export default function TherapistWorkspace() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studentId, setStudentId] = useState("");
  const [tab, setTab] = useState<Tab>("clinical");
  const [date, setDate] = useState(browserToday());
  const [resilience, setResilience] = useState("50");
  const [intrusive, setIntrusive] = useState("0");
  const [period, setPeriod] = useState("30");
  const [sessionCount, setSessionCount] = useState("0");
  const [supportActive, setSupportActive] = useState("true");
  const [contacts, setContacts] = useState("0");
  const [interactions, setInteractions] = useState("0");
  const [sessionAt, setSessionAt] = useState("");
  const [modality, setModality] = useState("Presencial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const [studentResponse, sessionResponse] = await Promise.all([
      fetch("/api/therapist/students", { cache: "no-store" }),
      fetch("/api/sessions", { cache: "no-store" }),
    ]);
    const studentData = await studentResponse.json();
    const sessionData = await sessionResponse.json();
    if (!studentResponse.ok) throw new Error(studentData.error || "No se pudo cargar la cartera.");
    setStudents(studentData.students ?? []);
    if (!studentId && studentData.students?.length) setStudentId(String(studentData.students[0].id_estudiante));
    setSessions(sessionResponse.ok ? (sessionData.sessions ?? []) : []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => { setMessage(error instanceof Error ? error.message : "Error de conexión."); setLoading(false); });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) { setMessage("Selecciona un estudiante."); return; }
    setSaving(true); setMessage("");
    try {
      let endpoint = "";
      let body: Record<string, string | number | boolean> = {};
      if (tab === "clinical") {
        endpoint = "/api/therapist/evaluations";
        body = { id_estudiante: Number(studentId), fecha: date, indice_resiliencia: Number(resilience), pensamientos_intrusivos: Number(intrusive), periodo_referencia_dias: Number(period), cantidad_sesiones: Number(sessionCount) };
      } else if (tab === "support") {
        endpoint = "/api/therapist/support-network";
        body = { id_estudiante: Number(studentId), fecha: date, periodo_referencia_dias: Number(period), red_apoyo_activa: supportActive === "true", contactos_activos: Number(contacts), interacciones_sociales: Number(interactions) };
      } else {
        endpoint = "/api/sessions";
        body = { id_estudiante: Number(studentId), inicio: new Date(sessionAt).toISOString(), modalidad };
      }

      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el registro.");
      setMessage(result.datamartRefreshed === false ? "Guardado. La actualización del DataMart quedó pendiente." : "Registro guardado correctamente.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally { setSaving(false); }
  }

  async function updateSessionStatus(sessionId: number, status: string) {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_sesion: sessionId, estado: status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la sesión.");
      setMessage("Estado de sesión actualizado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally { setSaving(false); }
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "clinical", label: "Evaluación clínica" },
    { key: "support", label: "Red de apoyo" },
    { key: "session", label: "Programar sesión" },
  ];

  if (loading) return <p className="text-sm text-muted">Cargando cartera profesional...</p>;
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Cartera asignada</h2><p className="mt-1 text-xs text-muted">Solo aparecen estudiantes relacionados con tu perfil profesional.</p></div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{students.length} estudiantes</span>
        </div>
        {students.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => <article key={student.id_estudiante} className={"rounded-xl border p-4 " + (studentId === String(student.id_estudiante) ? "border-brand-500 bg-brand-50" : "border-line")}>
            <button type="button" onClick={() => setStudentId(String(student.id_estudiante))} className="w-full text-left">
              <p className="text-sm font-semibold">{student.nombre_visible}</p>
              <p className="mt-1 text-xs text-muted">{student.codigo_universitario}</p>
              <p className="mt-2 text-xs text-muted">Ciclo {student.ciclo_academico ?? "—"} · {student.turno ?? "—"}</p>
            </button>
            <Link href={"/portal/terapeuta/estudiantes/" + student.id_estudiante} className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline">Abrir Perfil 360 →</Link>
          </article>)
        </div> : <p className="mt-4 rounded-xl bg-canvas p-4 text-sm text-muted">Todavía no tienes estudiantes asignados. El administrador debe registrar las relaciones profesionales.</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap gap-2 border-b border-line pb-4">
          {tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)}
            className={"rounded-lg px-3 py-2 text-sm font-medium " + (tab === item.key ? "bg-brand-600 text-white" : "bg-canvas text-muted hover:text-ink")}>{item.label}</button>)}
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="student" className="mb-2 block text-sm font-medium">Estudiante</label>
            <select id="student" required value={studentId} onChange={(event) => setStudentId(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
              <option value="">Selecciona un estudiante</option>
              {students.map((student) => <option key={student.id_estudiante} value={student.id_estudiante}>{student.nombre_visible} · {student.codigo_universitario}</option>)}
            </select>
          </div>

          {tab !== "session" && <div>
            <label htmlFor="date" className="mb-2 block text-sm font-medium">Fecha de evaluación</label>
            <input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" />
          </div>}

          {tab === "clinical" && <>
            <div><label htmlFor="resilience" className="mb-2 block text-sm font-medium">Índice de resiliencia (0–100)</label><input id="resilience" type="number" min="0" max="100" step="0.01" value={resilience} onChange={(event) => setResilience(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" /></div>
            <div><label htmlFor="intrusive" className="mb-2 block text-sm font-medium">Frecuencia de pensamientos intrusivos</label><input id="intrusive" type="number" min="0" step="1" value={intrusive} onChange={(event) => setIntrusive(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" /></div>
            <div><label htmlFor="period" className="mb-2 block text-sm font-medium">Período de referencia (días)</label><input id="period" type="number" min="1" max="365" value={period} onChange={(event) => setPeriod(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" /></div>
            <div><label htmlFor="sessions" className="mb-2 block text-sm font-medium">Sesiones acumuladas</label><input id="sessions" type="number" min="0" value={sessionCount} onChange={(event) => setSessionCount(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" /></div>
          </>}

          {tab === "support" && <>
            <div><label htmlFor="supportActive" className="mb-2 block text-sm font-medium">¿Red de apoyo activa?</label><select id="supportActive" value={supportActive} onChange={(event) => setSupportActive(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3"><option value="true">Sí</option><option value="false">No</option></select></div>
            <div><label htmlFor="contacts" className="mb-2 block text-sm font-medium">Contactos activos</label><input id="contacts" type="number" min="0" value={contacts} onChange={(event) => setContacts(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" /></div>
            <div><label htmlFor="interactions" className="mb-2 block text-sm font-medium">Interacciones en el período</label><input id="interactions" type="number" min="0" value={interactions} onChange={(event) => setInteractions(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" /></div>
          </>}

          {tab === "session" && <>
            <div><label htmlFor="sessionAt" className="mb-2 block text-sm font-medium">Fecha y hora</label><input id="sessionAt" type="datetime-local" value={sessionAt} onChange={(event) => setSessionAt(event.target.value)} required className="w-full rounded-xl border border-line px-3 py-3" /></div>
            <div><label htmlFor="modality" className="mb-2 block text-sm font-medium">Modalidad</label><select id="modality" value={modality} onChange={(event) => setModality(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3"><option>Presencial</option><option>Virtual</option><option>Mixta</option></select></div>
          </>}

          <div className="md:col-span-2">
            <button disabled={saving || !students.length} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : tab === "session" ? "Programar sesión" : "Guardar evaluación"}</button>
          </div>
        </form>
        {message && <p role="status" className="mt-4 rounded-lg bg-canvas p-3 text-sm text-muted">{message}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="mb-4"><h2 className="font-semibold">Próximas y recientes sesiones</h2><p className="mt-1 text-xs text-muted">Las sesiones están limitadas por la cartera autorizada de tu cuenta.</p></div>
        {sessions.length ? <div className="divide-y divide-line">
          {sessions.map((session) => <div key={session.id_sesion} className="flex flex-wrap justify-between gap-3 py-3 first:pt-0">
            <div><p className="text-sm font-medium">{students.find((student) => student.id_estudiante === session.id_estudiante)?.nombre_visible || "Estudiante asignado"}</p><p className="mt-1 text-xs text-muted">{new Date(session.inicio).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })} · {session.modalidad}</p></div>
            <select aria-label="Estado de sesión" value={session.estado} disabled={saving}
              onChange={(event) => updateSessionStatus(session.id_sesion, event.target.value)}
              className="rounded-lg border border-line px-2 py-1 text-xs text-brand-700 disabled:opacity-50">
              <option>Programada</option><option>Realizada</option><option>Cancelada</option><option>No asistió</option>
            </select>
          </div>)}
        </div> : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">No hay sesiones registradas.</p>}
      </section>
      <p className="text-xs leading-5 text-muted">Registra valores obtenidos mediante el instrumento y protocolo aprobados por el responsable profesional. Este sistema no determina diagnósticos ni sugiere decisiones clínicas.</p>
    </div>
  );
}
