import type { SupabaseClient } from "@supabase/supabase-js";
import { average, latestByKey, normalizeTo30Days, pearsonCorrelation, percentage } from "@/lib/analytics/kpi";
import { todayInPeru } from "@/lib/dates";

type ClinicalRow = { tiempo_key: number; estudiante_key: number; indice_resiliencia: number; pensamientos_intrusivos: number; periodo_referencia_dias: number };
type GoalRow = { id_meta_oltp: number; estudiante_key: number; tiempo_key: number; metas_cumplidas: number; metas_pendientes: number };
type NetworkRow = { tiempo_key: number; estudiante_key: number; red_key: number; contactos_activos: number; interacciones_sociales: number };
type HabitRow = { tiempo_key: number; estudiante_key: number; completado_count: number };
type NetworkDimension = { red_key: number; red_apoyo_activa: boolean | null };

export type DashboardSummary = {
  resilience: number | null;
  intrusivePer30Days: number | null;
  goalCompletionPct: number | null;
  activeSupportPct: number | null;
  activeContactsAvg: number | null;
  interactionsAvg: number | null;
  evaluationsCount: number;
  evaluatedStudentsCount: number;
  goalsCount: number;
  supportEvaluationsCount: number;
  supportStudentsCount: number;
  habitsCompletionPct: number | null;
  habitRecordsCount: number;
  habitResilienceCorrelation: number | null;
  habitIntrusiveCorrelation: number | null;
  habitAssociationStudents: number;
  trend: Array<{ month: string; resilience: number | null; intrusive: number | null }>;
};

type RangeableQuery<T> = {
  range(from: number, to: number): PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>;
};

const PAGE_SIZE = 1000;

/** PostgREST aplica un máximo por respuesta; pagina hasta recuperar todas las filas. */
async function fetchAllRows<T>(createQuery: () => RangeableQuery<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await createQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

const dateKey = (date: Date) => Number(date.toISOString().slice(0, 10).replaceAll("-", ""));
export const emptyDashboard: DashboardSummary = {
  resilience: null, intrusivePer30Days: null, goalCompletionPct: null, activeSupportPct: null,
  activeContactsAvg: null, interactionsAvg: null, evaluationsCount: 0, evaluatedStudentsCount: 0, goalsCount: 0,
  supportEvaluationsCount: 0, supportStudentsCount: 0, habitsCompletionPct: null, habitRecordsCount: 0,
  habitResilienceCorrelation: null, habitIntrusiveCorrelation: null, habitAssociationStudents: 0, trend: [],
};

export async function getDashboardSummary(supabase: SupabaseClient, visibleStudentIds?: number[]): Promise<DashboardSummary> {
  let visibleStudentKeys: number[] | null = null;
  if (visibleStudentIds !== undefined) {
    if (!visibleStudentIds.length) return emptyDashboard;
    const { data: dimensions, error: dimensionError } = await supabase.schema("datamart_resiliencia")
      .from("dim_estudiante").select("estudiante_key").in("id_estudiante_oltp", visibleStudentIds);
    if (dimensionError) throw new Error("No se pudo resolver el alcance de estudiantes del DataMart.");
    visibleStudentKeys = (dimensions ?? []).map((row) => Number(row.estudiante_key));
    if (!visibleStudentKeys.length) return emptyDashboard;
  }
  const today = todayInPeru();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const start = new Date(Date.UTC(year, month - 1 - 11, 1));
  const fromKey = dateKey(start);
  const toKey = Number(today.replaceAll("-", ""));

  const [clinical, goals, network, habits] = await Promise.all([
    fetchAllRows<ClinicalRow>(() => {
      const base = supabase.schema("datamart_resiliencia").from("fact_evaluacion_clinica")
        .select("tiempo_key, estudiante_key, indice_resiliencia, pensamientos_intrusivos, periodo_referencia_dias");
      const scoped = visibleStudentKeys ? base.in("estudiante_key", visibleStudentKeys) : base;
      return scoped.gte("tiempo_key", fromKey).lte("tiempo_key", toKey).order("tiempo_key").order("eval_key") as unknown as RangeableQuery<ClinicalRow>;
    }),
    fetchAllRows<GoalRow>(() => {
      const base = supabase.schema("datamart_resiliencia").from("fact_seguimiento_meta")
        .select("id_meta_oltp, estudiante_key, tiempo_key, metas_cumplidas, metas_pendientes");
      const scoped = visibleStudentKeys ? base.in("estudiante_key", visibleStudentKeys) : base;
      return scoped.gte("tiempo_key", fromKey).lte("tiempo_key", toKey).order("tiempo_key").order("seguimiento_key") as unknown as RangeableQuery<GoalRow>;
    }),
    fetchAllRows<NetworkRow>(() => {
      const base = supabase.schema("datamart_resiliencia").from("fact_red_apoyo")
        .select("tiempo_key, estudiante_key, red_key, contactos_activos, interacciones_sociales");
      const scoped = visibleStudentKeys ? base.in("estudiante_key", visibleStudentKeys) : base;
      return scoped.gte("tiempo_key", fromKey).lte("tiempo_key", toKey).order("tiempo_key").order("red_apoyo_fact_key") as unknown as RangeableQuery<NetworkRow>;
    }),
    fetchAllRows<HabitRow>(() => {
      const base = supabase.schema("datamart_resiliencia").from("fact_registro_habitos")
        .select("tiempo_key, estudiante_key, completado_count");
      const scoped = visibleStudentKeys ? base.in("estudiante_key", visibleStudentKeys) : base;
      return scoped.gte("tiempo_key", fromKey).lte("tiempo_key", toKey).order("tiempo_key").order("registro_key") as unknown as RangeableQuery<HabitRow>;
    }),
  ]);
  const redKeys = [...new Set(network.map((row) => row.red_key))];
  let networkDimensions: NetworkDimension[] = [];

  if (redKeys.length) {
    const { data, error } = await supabase.schema("datamart_resiliencia").from("dim_red_apoyo").select("red_key, red_apoyo_activa").in("red_key", redKeys);
    if (error) throw new Error("No se pudo consultar la dimensión de red de apoyo.");
    networkDimensions = (data ?? []) as NetworkDimension[];
  }

  // Cada meta cuenta una sola vez: se toma su última observación dentro del período.
  const latestGoalState = new Map<number, GoalRow>();
  [...goals].sort((a, b) => b.tiempo_key - a.tiempo_key).forEach((row) => {
    if (!latestGoalState.has(row.id_meta_oltp)) latestGoalState.set(row.id_meta_oltp, row);
  });
  const goalStates = [...latestGoalState.values()];

  const activeMap = new Map(networkDimensions.map((row) => [row.red_key, row.red_apoyo_activa]));
  // El KPI usa la última valoración de cada estudiante: evaluaciones repetidas
  // no aumentan el peso de una persona en el denominador.
  const latestNetworks = latestByKey(network, (row) => row.estudiante_key, (row) => row.tiempo_key);
  const activeNetworks = latestNetworks.filter((row) => activeMap.get(row.red_key) === true);

  // Empareja los hechos por estudiante y mes para una asociación exploratoria.
  // Cada punto es una observación estudiante-mes, no una muestra independiente de personas.
  const clinicalByStudentMonth = new Map<string, { resilience: number[]; intrusive: number[] }>();
  clinical.forEach((row) => {
    const monthKey = Math.floor(row.tiempo_key / 100);
    const key = row.estudiante_key + ":" + monthKey;
    const values = clinicalByStudentMonth.get(key) ?? { resilience: [], intrusive: [] };
    values.resilience.push(Number(row.indice_resiliencia));
    values.intrusive.push(normalizeTo30Days(Number(row.pensamientos_intrusivos), Number(row.periodo_referencia_dias)) ?? 0);
    clinicalByStudentMonth.set(key, values);
  });

  const habitsByStudentMonth = new Map<string, { completed: number; total: number }>();
  habits.forEach((row) => {
    const monthKey = Math.floor(row.tiempo_key / 100);
    const key = row.estudiante_key + ":" + monthKey;
    const counts = habitsByStudentMonth.get(key) ?? { completed: 0, total: 0 };
    counts.completed += Number(row.completado_count) === 1 ? 1 : 0;
    counts.total += 1;
    habitsByStudentMonth.set(key, counts);
  });

  // Colapsa las observaciones mensuales en un promedio por estudiante antes de
  // calcular Pearson. Así no se cuenta repetidamente a la misma persona como
  // si fueran participantes independientes.
  const associationByStudent = new Map<number, { habits: number[]; resilience: number[]; intrusive: number[] }>();
  clinicalByStudentMonth.forEach((clinicalValues, key) => {
    const habitValues = habitsByStudentMonth.get(key);
    if (!habitValues || habitValues.total === 0) return;
    const habitRate = percentage(habitValues.completed, habitValues.total);
    const resilienceValue = average(clinicalValues.resilience);
    const intrusiveValue = average(clinicalValues.intrusive);
    if (habitRate === null || resilienceValue === null || intrusiveValue === null) return;

    const studentId = Number(key.slice(0, key.indexOf(":")));
    const values = associationByStudent.get(studentId) ?? { habits: [], resilience: [], intrusive: [] };
    values.habits.push(habitRate);
    values.resilience.push(resilienceValue);
    values.intrusive.push(intrusiveValue);
    associationByStudent.set(studentId, values);
  });

  const studentAssociations = [...associationByStudent.values()].map((values) => ({
    habits: average(values.habits),
    resilience: average(values.resilience),
    intrusive: average(values.intrusive),
  })).filter((values): values is { habits: number; resilience: number; intrusive: number } =>
    values.habits !== null && values.resilience !== null && values.intrusive !== null);

  const habitRates = studentAssociations.map((row) => row.habits);
  const matchedResilience = studentAssociations.map((row) => row.resilience);
  const matchedIntrusive = studentAssociations.map((row) => row.intrusive);

  // El resumen general pondera una vez por estudiante; la serie mensual
  // primero resume múltiples evaluaciones de una persona dentro del mismo mes.
  const latestClinical = latestByKey(clinical, (row) => row.estudiante_key, (row) => row.tiempo_key);
  const byMonth = new Map<number, { resilience: number[]; intrusive: number[] }>();
  clinicalByStudentMonth.forEach((values, key) => {
    const monthKey = Number(key.slice(key.indexOf(":") + 1));
    const current = byMonth.get(monthKey) ?? { resilience: [], intrusive: [] };
    const resilienceValue = average(values.resilience);
    const intrusiveValue = average(values.intrusive);
    if (resilienceValue !== null) current.resilience.push(resilienceValue);
    if (intrusiveValue !== null) current.intrusive.push(intrusiveValue);
    byMonth.set(monthKey, current);
  });

  const trend = [...byMonth.entries()].sort(([a], [b]) => a - b).map(([key, values]) => {
    const year = Math.floor(key / 100);
    const month = key % 100;
    const label = new Date(Date.UTC(year, month - 1, 1))
      .toLocaleDateString("es-PE", { month: "short", timeZone: "UTC" }).replace(".", "");
    return { month: label + " " + String(year).slice(-2), resilience: average(values.resilience), intrusive: average(values.intrusive) };
  });

  return {
    resilience: average(latestClinical.map((row) => Number(row.indice_resiliencia))),
    intrusivePer30Days: average(latestClinical.map((row) => normalizeTo30Days(Number(row.pensamientos_intrusivos), Number(row.periodo_referencia_dias)) ?? 0)),
    goalCompletionPct: percentage(goalStates.filter((row) => Number(row.metas_cumplidas) === 1).length, goalStates.length),
    activeSupportPct: percentage(activeNetworks.length, latestNetworks.length),
    activeContactsAvg: average(latestNetworks.map((row) => Number(row.contactos_activos))),
    interactionsAvg: average(latestNetworks.map((row) => Number(row.interacciones_sociales))),
    evaluationsCount: clinical.length,
    evaluatedStudentsCount: latestClinical.length,
    goalsCount: goalStates.length,
    supportEvaluationsCount: network.length,
    supportStudentsCount: latestNetworks.length,
    habitsCompletionPct: percentage(habits.filter((row) => Number(row.completado_count) === 1).length, habits.length),
    habitRecordsCount: habits.length,
    habitResilienceCorrelation: pearsonCorrelation(habitRates, matchedResilience),
    habitIntrusiveCorrelation: pearsonCorrelation(habitRates, matchedIntrusive),
    habitAssociationStudents: habitRates.length,
    trend,
  };
}
