import MetricCard from "@/components/metric-card";
import DashboardChart from "@/components/dashboard-chart";
import { getAuthContext } from "@/lib/auth/context";
import { emptyDashboard, getDashboardSummary } from "@/lib/analytics/dashboard";

const format = (value: number | null, suffix = "") => value === null ? "—" : value.toFixed(1) + suffix;

export default async function PortalHomePage() {
  const { supabase, profile } = await getAuthContext();
  let summary = emptyDashboard;
  let loadError = "";
  try {
    summary = await getDashboardSummary(supabase);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el resumen.";
  }

  const isStudent = profile?.rol === "estudiante";
  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-700">{isStudent ? "Mi espacio" : "Panel de seguimiento"}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{isStudent ? "Mi progreso" : "Resumen general"}</h1>
        <p className="mt-2 text-sm text-muted">Indicadores descriptivos del período móvil de 12 meses. Los datos visibles dependen de tu perfil y asignaciones.</p>
      </div>

      {loadError && <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {loadError} Revisa que se ejecutaron los scripts de Supabase y que los esquemas están expuestos en la API.
      </div>}

      <section aria-label="Indicadores oficiales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Índice de resiliencia" value={format(summary.resilience)} note={summary.evaluatedStudentsCount + " estudiantes · " + summary.evaluationsCount + " evaluaciones; cada estudiante cuenta una vez"} />
        <MetricCard label="Pensamientos intrusivos" value={format(summary.intrusivePer30Days)} note="Frecuencia promedio normalizada a 30 días" accent="bg-amber-500" />
        <MetricCard label="Cumplimiento de metas" value={format(summary.goalCompletionPct, "%")} note={summary.goalsCount + " metas con estado observado en el período"} accent="bg-indigo-500" />
        <MetricCard label="Red de apoyo activa" value={format(summary.activeSupportPct, "%")} note={summary.supportStudentsCount + " estudiantes · última valoración de cada uno en el período"} accent="bg-sky-500" />
      </section>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="font-semibold">Evolución de indicadores clínicos</h2>
            <p className="mt-1 text-xs text-muted">Promedios mensuales primero por estudiante y mes, luego entre estudiantes. Las series usan escalas distintas y ejes independientes.</p>
          </div>
          <DashboardChart data={summary.trend} />
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">Variables complementarias</h2>
          <p className="mt-1 text-xs text-muted">No constituyen KPI oficiales adicionales.</p>
          <div className="mt-7 space-y-6">
            <div><p className="text-sm text-muted">Contactos activos promedio</p><p className="mt-1 text-2xl font-semibold">{format(summary.activeContactsAvg)}</p></div>
            <div className="h-px bg-line" />
            <div><p className="text-sm text-muted">Interacciones sociales promedio</p><p className="mt-1 text-2xl font-semibold">{format(summary.interactionsAvg)}</p></div>
            <div className="h-px bg-line" />
            <div>
              <p className="text-sm text-muted">Registros de hábitos completados</p>
              <p className="mt-1 text-2xl font-semibold">{format(summary.habitsCompletionPct, "%")}</p>
              <p className="mt-1 text-xs text-muted">{summary.habitRecordsCount} registros de hábitos en el período</p>
            </div>
            <div className="rounded-xl bg-canvas p-4 text-xs leading-5 text-muted">Hábitos, contactos e interacciones son variables complementarias, no KPI oficiales. Una asociación estadística no demuestra que un hábito cause un cambio en los otros indicadores.</div>
          </div>
        </section>
      </div>
      {!isStudent && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-700">Analítica exploratoria</p>
            <h2 className="mt-1 text-lg font-semibold">Relación entre hábitos e indicadores</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Correlación de Pearson entre promedios del período por estudiante, calculados a partir de los meses en que existen registros de hábitos y evaluación clínica. Se requieren al menos 10 estudiantes para mostrar un coeficiente.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl bg-canvas p-4">
              <p className="text-sm text-muted">Hábitos ↔ resiliencia</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {summary.habitResilienceCorrelation === null ? "—" : summary.habitResilienceCorrelation.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted">Coeficiente r de Pearson</p>
            </article>
            <article className="rounded-xl bg-canvas p-4">
              <p className="text-sm text-muted">Hábitos ↔ pensamientos intrusivos</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {summary.habitIntrusiveCorrelation === null ? "—" : summary.habitIntrusiveCorrelation.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted">Coeficiente r de Pearson</p>
            </article>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            {summary.habitAssociationStudents < 10
              ? "Hay " + summary.habitAssociationStudents + " estudiantes con datos emparejados; aún no se alcanza el mínimo de 10."
              : summary.habitResilienceCorrelation === null && summary.habitIntrusiveCorrelation === null
                ? "La correlación no es calculable con estos datos (por ejemplo, por falta de variabilidad)."
                : "Base: " + summary.habitAssociationStudents + " estudiantes, una observación agregada por persona."}
            {" "}Es una asociación descriptiva: no demuestra causalidad ni sustituye una evaluación profesional.
          </p>
        </section>
      )}

      <p className="mt-6 text-xs leading-5 text-muted">ResiliaUNT es una herramienta de seguimiento y apoyo. No realiza diagnósticos, no interpreta síntomas individuales y no sustituye la atención de profesionales.</p>
    </>
  );
}
