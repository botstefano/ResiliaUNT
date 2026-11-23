"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, BookOpen, Bot, CalendarClock, Check, CircleAlert, Compass, Leaf, MessageCircle, Send, ShieldCheck, Target, X } from "lucide-react";

type Role = "estudiante" | "terapeuta";
type ChatMessage = { role: "user" | "assistant"; content: string; kind?: string; offerContact?: boolean; showSafetyLinks?: boolean };
type AlertItem = { id: number; tipo: "solicitud_contacto" | "prioridad_seguridad"; creadaEn: string; estudiante: string; codigo: string; ciclo: number | null; turno: string | null };

const suggestions: Record<Role, string[]> = {
  estudiante: ["¿Cómo registro un hábito?", "Explícame mi índice de resiliencia", "¿Cuándo es mi próxima sesión?"],
  terapeuta: ["Resume los KPI de mi cartera", "¿Cómo evolucionó la resiliencia?", "Compara los resultados por ciclo"],
};

export default function ChatbotWidget({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingContact, setSendingContact] = useState(false);
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    kind: role === "estudiante" ? "welcome" : undefined,
    content: role === "terapeuta"
      ? "Hola. Soy Nexo, tu asistente analítico de ResiliaUNT. Puedo resumir datos descriptivos de tu cartera sintética asignada."
      : "Hola. Soy Brújula, tu asistente de ResiliaUNT. Puedo ayudarte a navegar la plataforma y consultar la información disponible de tu perfil.",
  }]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const isTherapist = role === "terapeuta";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, notice]);

  const loadAlerts = useCallback(async () => {
    if (!isTherapist) return;
    setLoadingAlerts(true);
    setAlertsError("");
    try {
      const response = await fetch("/api/chatbot/alerts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron consultar los avisos.");
      setAlerts(result.alerts ?? []);
    } catch (error) {
      setAlertsError(error instanceof Error ? error.message : "Error de conexión.");
    } finally { setLoadingAlerts(false); }
  }, [isTherapist]);

  useEffect(() => {
    if (open && isTherapist) void loadAlerts();
  }, [open, isTherapist, loadAlerts]);

  async function send(event?: FormEvent<HTMLFormElement>, text?: string) {
    event?.preventDefault();
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const prior = messages;
    setMessages((current) => [...current, { role: "user", content }, { role: "assistant", content: "Estoy consultando la información autorizada…", kind: "pending" }]);
    setInput("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: prior.some((message) => message.role === "assistant" && (message.kind === "bridge" || message.kind === "crisis"))
            ? []
            : prior.filter((message) => message.kind !== "pending").slice(-8).map(({ role: messageRole, content: messageContent }) => ({ role: messageRole, content: messageContent })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo obtener una respuesta.");
      setMessages((current) => [
        ...current.filter((message) => message.kind !== "pending"),
        { role: "assistant", content: result.reply, kind: result.kind, offerContact: result.offerContact, showSafetyLinks: result.showSafetyLinks },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current.filter((message) => message.kind !== "pending"),
        { role: "assistant", content: error instanceof Error ? error.message : "No se pudo completar la consulta." },
      ]);
    } finally { setBusy(false); }
  }

  async function requestContact() {
    setSendingContact(true);
    setNotice("");
    try {
      const response = await fetch("/api/chatbot/alerts", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo registrar el aviso.");
      setNotice(result.message || "Aviso registrado en el panel profesional.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo registrar el aviso.");
    } finally { setSendingContact(false); }
  }

  async function markAttended(id: number) {
    try {
      const response = await fetch("/api/chatbot/alerts", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar el aviso.");
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    } catch (error) {
      setAlertsError(error instanceof Error ? error.message : "No se pudo actualizar el aviso.");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label={isTherapist ? "Asistente analítico Nexo" : "Asistente de estudiante Brújula"}
          className="mb-3 flex h-[min(76vh,680px)] w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-2"><Bot size={21} /></div>
              <div>
                <p className="text-sm font-semibold">{isTherapist ? "Nexo" : "Brújula"}</p>
                <p className="text-[11px] text-white/80">{isTherapist ? "Asistente analítico · Terapeuta" : "Acompañamiento · Estudiante"}</p>
              </div>
            </div>
            <button type="button" aria-label="Cerrar chat" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/15"><X size={18} /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/70 p-3">
            {!isTherapist && (
              <div className="rounded-xl border border-line bg-white px-3 py-2 text-[11px] leading-5 text-muted">
                Brújula solo consulta tus propios registros. No ofrece diagnósticos ni sustituye a tu terapeuta.
              </div>
            )}
            {isTherapist && (
              <section className="rounded-xl border border-line bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-semibold"><CalendarClock size={15} /> Avisos de seguimiento</p>
                  <button type="button" onClick={loadAlerts} className="text-[11px] font-medium text-brand-700 hover:underline">Actualizar</button>
                </div>
                {loadingAlerts ? <p className="text-xs text-muted">Cargando avisos…</p>
                  : alertsError ? <p role="alert" className="text-xs text-red-700">{alertsError}</p>
                  : alerts.length === 0 ? <p className="text-xs text-muted">No hay avisos pendientes.</p>
                  : <div className="space-y-2">
                    {alerts.map((alert) => (
                      <article key={alert.id} className="rounded-lg bg-canvas p-2.5">
                        <div className="flex items-start gap-2">
                          <CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold">{alert.tipo === "prioridad_seguridad" ? "Aviso prioritario" : "Solicitud de contacto"}</p>
                            <p className="mt-0.5 text-xs text-muted">{alert.estudiante} · {alert.codigo}</p>
                            <p className="text-[11px] text-muted">Ciclo {alert.ciclo ?? "—"} · {alert.turno ?? "—"}</p>
                            <p className="mt-1 text-[10px] text-muted">{new Date(alert.creadaEn).toLocaleString("es-PE")}</p>
                          </div>
                          <button type="button" title="Marcar como atendida" onClick={() => markAttended(alert.id)}
                            className="rounded-lg border border-line bg-white p-2 text-brand-700 hover:bg-brand-50"><Check size={15} /></button>
                        </div>
                      </article>
                    ))}
                  </div>}
              </section>
            )}

            {messages.map((message, index) => (
              <div key={index} className={"flex " + (message.role === "user" ? "justify-end" : "justify-start")}>
                {message.kind === "welcome" && role === "estudiante" ? (
                  <article className="w-full max-w-[96%] overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
                    <div className="border-b border-brand-100 bg-brand-50 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                          <Compass size={21} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold tracking-tight text-ink">Hola, soy Brújula</p>
                          <p className="mt-0.5 text-[11px] font-medium text-brand-700">Tu asistente de ResiliaUNT</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted">
                        Puedo ayudarte a encontrar las herramientas de la plataforma y consultar la información disponible en tu perfil.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3">
                      <div className="min-w-0 rounded-xl border border-line bg-white p-2.5">
                        <div className="flex items-center gap-1.5 text-brand-700">
                          <BookOpen size={15} className="shrink-0" />
                          <p className="text-[11px] font-semibold text-ink">Plataforma</p>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-muted">Encuentra evaluaciones, hábitos, metas y agenda.</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-line bg-white p-2.5">
                        <div className="flex items-center gap-1.5 text-brand-700">
                          <BarChart3 size={15} className="shrink-0" />
                          <p className="text-[11px] font-semibold text-ink">Indicadores</p>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-muted">Consulta resiliencia, indicadores personales y red de apoyo.</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-line bg-white p-2.5">
                        <div className="flex items-center gap-1.5 text-brand-700">
                          <Leaf size={15} className="shrink-0" />
                          <p className="text-[11px] font-semibold text-ink">Hábitos</p>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-muted">Revisa tus registros, frecuencia e intensidad.</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-line bg-white p-2.5">
                        <div className="flex items-center gap-1.5 text-brand-700">
                          <Target size={15} className="shrink-0" />
                          <p className="text-[11px] font-semibold text-ink">Metas</p>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-muted">Comprueba avances, pendientes y cumplimiento.</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-line bg-white p-2.5">
                        <div className="flex items-center gap-1.5 text-brand-700">
                          <CalendarClock size={15} className="shrink-0" />
                          <p className="text-[11px] font-semibold text-ink">Sesiones</p>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-muted">Consulta fecha, hora, modalidad y profesional.</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-line bg-white p-2.5">
                        <div className="flex items-center gap-1.5 text-brand-700">
                          <MessageCircle size={15} className="shrink-0" />
                          <p className="text-[11px] font-semibold text-ink">Tus consultas</p>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-muted">Pregunta por los datos disponibles en tu perfil.</p>
                      </div>
                    </div>

                    <div className="border-t border-line bg-canvas/70 px-3 py-3">
                      <div className="flex items-start gap-2">
                        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-600" />
                        <p className="text-[10px] leading-4 text-muted">
                          Brújula consulta únicamente los datos autorizados de tu perfil y no accede a la información de otros estudiantes. Si un dato no está registrado, te lo indicaré.
                        </p>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-ink">¿Qué te gustaría revisar primero?</p>
                    </div>
                  </article>
                ) : (
                  <div className={"max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-6 " +
                    (message.role === "user" ? "rounded-br-md bg-brand-700 text-white" : "rounded-bl-md border border-line bg-white text-ink")}>
                    {message.content}
                    {message.showSafetyLinks && (
                      <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
                        <a href="tel:113" className="block rounded-lg border border-line px-3 py-2 font-semibold text-brand-700 hover:bg-brand-50">Llamar a Línea 113 · opción 5</a>
                        <a href="tel:106" className="block rounded-lg border border-line px-3 py-2 font-semibold text-brand-700 hover:bg-brand-50">SAMU 106 · emergencia médica</a>
                        <p className="text-muted">Acércate también a una persona adulta de confianza y pide apoyo presencial. No esperes una respuesta del chat.</p>
                      </div>
                    )}
                    {message.offerContact && (
                      <button type="button" onClick={requestContact} disabled={sendingContact}
                        className="mt-3 block w-full rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                        {sendingContact ? "Registrando…" : "Solicitar contacto con mi terapeuta"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {notice && <p role="status" className="rounded-lg border border-line bg-white px-3 py-2 text-xs text-muted">{notice}</p>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions[role].map((suggestion) => (
                <button type="button" key={suggestion} disabled={busy}
                  onClick={() => send(undefined, suggestion)}
                  className="rounded-full border border-line px-2.5 py-1.5 text-[10px] font-medium text-muted hover:border-brand-300 hover:text-brand-700 disabled:opacity-50">
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={send} className="flex items-end gap-2">
              <textarea value={input} onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
                rows={2} maxLength={1200} placeholder="Escribe tu pregunta…"
                className="max-h-28 min-h-[44px] flex-1 resize-y rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar mensaje"
                className="rounded-xl bg-brand-700 p-3 text-white disabled:opacity-50"><Send size={17} /></button>
            </form>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted">
              <ShieldCheck size={12} /> {isTherapist ? "Datos sintéticos de tu cartera. Análisis no clínico." : "Mensajes no guardados como historial clínico."}
            </p>
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
        className="ml-auto flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-brand-800">
        {open ? <X size={19} /> : <MessageCircle size={19} />}
        <span>{open ? "Cerrar" : isTherapist ? "Nexo" : "Brújula"}</span>
      </button>
    </div>
  );
}
