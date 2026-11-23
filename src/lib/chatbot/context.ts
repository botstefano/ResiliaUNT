import "server-only";

import { todayInPeru } from "@/lib/dates";

const PAGE_SIZE = 1000;
const DM = "datamart_resiliencia";
const OLTP = "oltp_resiliencia";

type ChatStudent = {
  id_estudiante: number;
  codigo_universitario: string;
  nombre_visible: string;
  ciclo_academico: number | null;
  turno: string | null;
};

type ChatRole = "estudiante" | "terapeuta";

const dateInt = (value: string) => Number(value.replaceAll("-", ""));
function daysAgo(days: number): number {
  const date = new Date(todayInPeru() + "T12:00:00-05:00");
  date.setDate(date.getDate() - days);
  return dateInt(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date));
}
function dateFromKey(key: number): string {
  const raw = String(key);
  return raw.length === 8 ? raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8) : "";
}
function average(values: number[]): number | null {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
}
function percent(numerator: number, denominator: number): number | null {
  return denominator ? Number((numerator * 100 / denominator).toFixed(1)) : null;
}

async function fetchAll(makeQuery: () => any): Promise<any[]> {
  const output: any[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("No fue posible consultar los datos autorizados del asistente.");
    const page = data ?? [];
    output.push(...page);
    if (page.length < PAGE_SIZE) return output;
  }
}

async function fetchDataMart(admin: any, students: ChatStudent[], periodDays: number) {
  if (!students.length) {
    return {
      aggregate: { estudiantes: 0, resilienciaPromedio: null, pensamientosIntrusivosPromedio30Dias: null, cumplimientoMetasPct: null, redApoyoActivaPct: null },
      estudiantes: [], tendenciaMensual: [], habitos: [], metas: { cumplidas: 0, pendientes: 0, porcentajeCumplimiento: null },
      registrosHabitos: { total: 0, completados: 0, sinRegistroReciente: [] },
    };
  }

  const ids = students.map((student) => student.id_estudiante);
  const { data: dimensions, error: dimError } = await admin.schema(DM).from("dim_estudiante")
    .select("estudiante_key,id_estudiante_oltp,codigo_universitario,ciclo_academico,turno")
    .in("id_estudiante_oltp", ids);
  if (dimError) throw new Error("No se pudo resolver el alcance del DataMart.");
  const keyById = new Map<number, number>((dimensions ?? []).map((row: any) => [
    Number(row.id_estudiante_oltp), Number(row.estudiante_key),
  ]));
  const keys = [...keyById.values()];
  if (!keys.length) {
    return {
      aggregate: { estudiantes: students.length, resilienciaPromedio: null, pensamientosIntrusivosPromedio30Dias: null, cumplimientoMetasPct: null, redApoyoActivaPct: null },
      estudiantes: students.map((s) => ({ codigo: s.codigo_universitario, nombre: s.nombre_visible, ciclo: s.ciclo_academico, turno: s.turno, resiliencia: null, pensamientosIntrusivos30Dias: null, ultimaEvaluacion: null, ultimoRegistroHabito: null })),
      tendenciaMensual: [], habitos: [], metas: { cumplidas: 0, pendientes: 0, porcentajeCumplimiento: null },
      registrosHabitos: { total: 0, completados: 0, sinRegistroReciente: [] },
    };
  }

  const from = daysAgo(periodDays);
  const [clinical, habitFacts, goalFacts, networkFacts, habitDimensions, intensityDimensions, networkDimensions] = await Promise.all([
    fetchAll(() => admin.schema(DM).from("fact_evaluacion_clinica")
      .select("tiempo_key,estudiante_key,indice_resiliencia,pensamientos_intrusivos,periodo_referencia_dias")
      .in("estudiante_key", keys).gte("tiempo_key", from).order("tiempo_key")),
    fetchAll(() => admin.schema(DM).from("fact_registro_habitos")
      .select("tiempo_key,estudiante_key,habito_key,intensidad_key,completado_count")
      .in("estudiante_key", keys).gte("tiempo_key", from).order("tiempo_key")),
    fetchAll(() => admin.schema(DM).from("fact_seguimiento_meta")
      .select("id_meta_oltp,tiempo_key,estudiante_key,meta_key,metas_cumplidas,metas_pendientes")
      .in("estudiante_key", keys).gte("tiempo_key", from).order("tiempo_key")),
    fetchAll(() => admin.schema(DM).from("fact_red_apoyo")
      .select("tiempo_key,estudiante_key,red_key,contactos_activos,interacciones_sociales,periodo_referencia_dias")
      .in("estudiante_key", keys).gte("tiempo_key", from).order("tiempo_key")),
    admin.schema(DM).from("dim_habito").select("habito_key,nombre,categoria"),
    admin.schema(DM).from("dim_intensidad").select("intensidad_key,nivel"),
    admin.schema(DM).from("dim_red_apoyo").select("red_key,red_apoyo_activa,estado"),
  ]);
  if (habitDimensions.error || intensityDimensions.error || networkDimensions.error) {
    throw new Error("No se pudieron consultar las dimensiones del DataMart.");
  }

  const habitName = new Map<number, string>((habitDimensions.data ?? []).map((r: any) => [Number(r.habito_key), r.nombre]));
  const intensityName = new Map<number, string>((intensityDimensions.data ?? []).map((r: any) => [Number(r.intensidad_key), r.nivel]));
  const networkActive = new Map<number, boolean | null>((networkDimensions.data ?? []).map((r: any) => [Number(r.red_key), r.red_apoyo_activa]));

  const studentByKey = new Map<number, ChatStudent>();
  for (const student of students) {
    const key = keyById.get(student.id_estudiante);
    if (key !== undefined) studentByKey.set(key, student);
  }

  const latestClinical = new Map<number, any>();
  const monthlyStudent = new Map<string, Map<number, number[]>>();
  for (const row of clinical) {
    const key = Number(row.estudiante_key);
    const previous = latestClinical.get(key);
    if (!previous || Number(row.tiempo_key) > Number(previous.tiempo_key)) latestClinical.set(key, row);

    const month = String(row.tiempo_key).slice(0, 6);
    if (!monthlyStudent.has(month)) monthlyStudent.set(month, new Map());
    const byStudent = monthlyStudent.get(month)!;
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key)!.push(Number(row.indice_resiliencia));
  }

  const latestNetwork = new Map<number, any>();
  for (const row of networkFacts) {
    const key = Number(row.estudiante_key);
    const previous = latestNetwork.get(key);
    if (!previous || Number(row.tiempo_key) > Number(previous.tiempo_key)) latestNetwork.set(key, row);
  }

  const latestGoals = new Map<number, any>();
  for (const row of goalFacts) {
    const key = Number(row.id_meta_oltp);
    const previous = latestGoals.get(key);
    if (!previous || Number(row.tiempo_key) > Number(previous.tiempo_key)) latestGoals.set(key, row);
  }
  const goalRows = [...latestGoals.values()];
  const goalsDone = goalRows.filter((row) => Number(row.metas_cumplidas) === 1).length;
  const goalsPending = goalRows.filter((row) => Number(row.metas_pendientes) === 1).length;

  const habitGroups = new Map<string, { registros: number; completados: number; participantes: Set<number>; intensidad: Map<string, number> }>();
  const latestHabitDate = new Map<number, number>();
  const currentMonthStart = dateInt(todayInPeru().slice(0, 7) + "-01");
  let currentMonthRecords = 0;
  let currentMonthCompleted = 0;
  for (const row of habitFacts) {
    const studentKey = Number(row.estudiante_key);
    const habit = habitName.get(Number(row.habito_key)) ?? "Hábito no identificado";
    const intensity = intensityName.get(Number(row.intensidad_key)) ?? "No especificada";
    if (!habitGroups.has(habit)) habitGroups.set(habit, { registros: 0, completados: 0, participantes: new Set(), intensidad: new Map() });
    const group = habitGroups.get(habit)!;
    group.registros += 1;
    group.completados += Number(row.completado_count) === 1 ? 1 : 0;
    group.participantes.add(studentKey);
    group.intensidad.set(intensity, (group.intensidad.get(intensity) ?? 0) + 1);
    const key = Number(row.tiempo_key);
    if (!latestHabitDate.has(studentKey) || key > latestHabitDate.get(studentKey)!) latestHabitDate.set(studentKey, key);
    if (key >= currentMonthStart) {
      currentMonthRecords += 1;
      currentMonthCompleted += Number(row.completado_count) === 1 ? 1 : 0;
    }
  }

  const clinicalValues = [...latestClinical.values()];
  const resilience = clinicalValues.map((r) => Number(r.indice_resiliencia));
  const intrusive = clinicalValues.map((r) => Number(r.pensamientos_intrusivos) * 30 / Math.max(1, Number(r.periodo_referencia_dias)));
  const activeNetworks = [...latestNetwork.values()].filter((r) => networkActive.get(Number(r.red_key)) === true);
  const assessedNetworks = [...latestNetwork.values()].filter((r) => networkActive.get(Number(r.red_key)) !== null && networkActive.get(Number(r.red_key)) !== undefined);

  const roster = students.map((student) => {
    const key = keyById.get(student.id_estudiante);
    const evaluation = key === undefined ? null : latestClinical.get(key);
    const habitKey = key === undefined ? undefined : latestHabitDate.get(key);
    return {
      codigo: student.codigo_universitario,
      nombre: student.nombre_visible,
      ciclo: student.ciclo_academico,
      turno: student.turno,
      resiliencia: evaluation ? Number(evaluation.indice_resiliencia) : null,
      pensamientosIntrusivos30Dias: evaluation
        ? Number((Number(evaluation.pensamientos_intrusivos) * 30 / Math.max(1, Number(evaluation.periodo_referencia_dias))).toFixed(2)) : null,
      ultimaEvaluacion: evaluation ? dateFromKey(Number(evaluation.tiempo_key)) : null,
      ultimoRegistroHabito: habitKey ? dateFromKey(habitKey) : null,
    };
  });

  const cycleGroups = new Map<number, number[]>();
  for (const row of roster) {
    if (row.ciclo === null || row.resiliencia === null) continue;
    if (!cycleGroups.has(row.ciclo)) cycleGroups.set(row.ciclo, []);
    cycleGroups.get(row.ciclo)!.push(row.resiliencia);
  }
  const cycleSummary = [...cycleGroups.entries()].sort((a, b) => a[0] - b[0]).map(([ciclo, values]) => ({
    ciclo, estudiantesEvaluados: values.length, resilienciaPromedio: average(values),
  }));

  const monthlyTrend = [...monthlyStudent.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, byStudent]) => {
    const studentMeans = [...byStudent.values()].map(average).filter((value): value is number => value !== null);
    return { mes: month.slice(0, 4) + "-" + month.slice(4, 6), estudiantes: studentMeans.length, resilienciaPromedio: average(studentMeans) };
  });

  const withoutRecentHabit = roster.filter((student) => !student.ultimoRegistroHabito ||
    Number(student.ultimoRegistroHabito.replaceAll("-", "")) < daysAgo(10));
  return {
    aggregate: {
      estudiantes: students.length,
      estudiantesConEvaluacion: clinicalValues.length,
      resilienciaPromedio: average(resilience),
      pensamientosIntrusivosPromedio30Dias: average(intrusive),
      cumplimientoMetasPct: percent(goalsDone, goalRows.length),
      metasObservadas: goalRows.length,
      redApoyoActivaPct: percent(activeNetworks.length, assessedNetworks.length),
      estudiantesConRedEvaluada: assessedNetworks.length,
    },
    estudiantes: roster,
    porCiclo: cycleSummary,
    tendenciaMensual: monthlyTrend,
    habitos: [...habitGroups.entries()].map(([nombre, value]) => ({
      nombre, registros: value.registros, completados: value.completados,
      participantes: value.participantes.size,
      intensidad: [...value.intensidad.entries()].map(([nivel, cantidad]) => ({ nivel, cantidad })),
    })).sort((a, b) => b.registros - a.registros),
    metas: { cumplidas: goalsDone, pendientes: goalsPending, porcentajeCumplimiento: percent(goalsDone, goalRows.length) },
    registrosHabitos: {
      total: currentMonthRecords, completados: currentMonthCompleted,
      sinRegistroReciente: withoutRecentHabit.map((s) => ({ codigo: s.codigo, nombre: s.nombre, ciclo: s.ciclo, turno: s.turno, ultimoRegistro: s.ultimoRegistroHabito })),
    },
  };
}

export async function buildTherapistContext(admin: any, therapistId: number) {
  const today = todayInPeru();
  const { data: therapist, error: therapistError } = await admin.schema(OLTP).from("terapeuta")
    .select("id_terapeuta,codigo_terapeuta,nombre,activo")
    .eq("id_terapeuta", therapistId).eq("activo", true).like("codigo_terapeuta", "DEMO-%").maybeSingle();
  if (therapistError || !therapist) throw new Error("El perfil profesional no está habilitado para el asistente sintético.");

  const { data: assignments, error: assignmentError } = await admin.schema(OLTP).from("terapeuta_estudiante")
    .select("id_estudiante")
    .eq("id_terapeuta", therapistId).eq("activo", true)
    .lte("fecha_inicio", today).or("fecha_fin.is.null,fecha_fin.gte." + today);
  if (assignmentError) throw new Error("No se pudo comprobar la cartera profesional.");
  const ids = [...new Set((assignments ?? []).map((row: any) => Number(row.id_estudiante)))];
  if (!ids.length) {
    return { rol: "terapeuta", terapeuta: therapist.nombre, alcance: "cartera asignada", totalEstudiantes: 0, datos: await fetchDataMart(admin, [], 180) };
  }

  const { data: students, error: studentError } = await admin.schema(OLTP).from("estudiante")
    .select("id_estudiante,codigo_universitario,nombre_visible,ciclo_academico,turno")
    .in("id_estudiante", ids).eq("activo", true).like("codigo_universitario", "DEMO-%")
    .order("ciclo_academico").order("turno");
  if (studentError) throw new Error("No se pudo recuperar la cartera sintética.");
  const roster = (students ?? []) as ChatStudent[];
  const data = await fetchDataMart(admin, roster, 180);
  return {
    rol: "terapeuta",
    terapeuta: therapist.nombre,
    alcance: "solo estudiantes sintéticos activos con asignación vigente al terapeuta autenticado",
    totalEstudiantes: roster.length,
    periodoAnalisisDias: 180,
    avisoAnalitico: "Datos descriptivos; una asociación no implica causalidad. No contiene diagnósticos ni clasificaciones clínicas.",
    datos: data,
  };
}

export async function buildStudentContext(admin: any, studentId: number) {
  const { data: student, error: studentError } = await admin.schema(OLTP).from("estudiante")
    .select("id_estudiante,codigo_universitario,nombre_visible,ciclo_academico,turno")
    .eq("id_estudiante", studentId).eq("activo", true).like("codigo_universitario", "DEMO-%").maybeSingle();
  if (studentError || !student) throw new Error("El perfil estudiantil no está habilitado para el asistente sintético.");

  const data = await fetchDataMart(admin, [student as ChatStudent], 180);
  const now = new Date().toISOString();
  const { data: sessions, error: sessionError } = await admin.schema(OLTP).from("sesion_terapia")
    .select("id_sesion,inicio,modalidad,id_sala,id_terapeuta,estado")
    .eq("id_estudiante", studentId).eq("estado", "Programada")
    .gte("inicio", now).order("inicio").limit(5);
  if (sessionError) throw new Error("No se pudieron consultar las sesiones futuras.");
  const roomIds = [...new Set((sessions ?? []).map((r: any) => Number(r.id_sala)).filter(Boolean))];
  const therapistIds = [...new Set((sessions ?? []).map((r: any) => Number(r.id_terapeuta)).filter(Boolean))];
  const [roomsResult, therapistsResult] = await Promise.all([
    roomIds.length ? admin.schema(OLTP).from("sala_terapia").select("id_sala,nombre_sala,pabellon").in("id_sala", roomIds) : Promise.resolve({ data: [], error: null }),
    therapistIds.length ? admin.schema(OLTP).from("terapeuta").select("id_terapeuta,nombre").in("id_terapeuta", therapistIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (roomsResult.error || therapistsResult.error) throw new Error("No se pudo completar la información de las sesiones.");
  const rooms = new Map((roomsResult.data ?? []).map((r: any) => [Number(r.id_sala), r]));
  const therapists = new Map((therapistsResult.data ?? []).map((r: any) => [Number(r.id_terapeuta), r]));
  const appointments = (sessions ?? []).map((r: any) => {
    const room = rooms.get(Number(r.id_sala));
    const therapist = therapists.get(Number(r.id_terapeuta));
    return {
      fechaHora: r.inicio, modalidad: r.modalidad,
      sala: room?.nombre_sala ?? (r.modalidad === "Virtual" ? "Virtual" : "No especificada"),
      terapeuta: therapist?.nombre ?? "Profesional asignado",
    };
  });

  const { data: assignments, error: assignmentError } = await admin.schema(OLTP).from("terapeuta_estudiante")
    .select("id_terapeuta").eq("id_estudiante", studentId).eq("activo", true)
    .lte("fecha_inicio", todayInPeru()).or("fecha_fin.is.null,fecha_fin.gte." + todayInPeru());
  if (assignmentError) throw new Error("No se pudo consultar el profesional asignado.");
  const therapistList = [...new Set((assignments ?? []).map((a: any) => Number(a.id_terapeuta)))];
  const { data: assigned, error: assignedError } = therapistList.length
    ? await admin.schema(OLTP).from("terapeuta").select("nombre").in("id_terapeuta", therapistList).eq("activo", true).like("codigo_terapeuta", "DEMO-%")
    : { data: [], error: null };
  if (assignedError) throw new Error("No se pudo consultar el profesional asignado.");

  return {
    rol: "estudiante",
    estudiante: {
      nombre: student.nombre_visible, codigo: student.codigo_universitario,
      ciclo: student.ciclo_academico, turno: student.turno,
    },
    profesionalAsignado: (assigned ?? []).map((p: any) => p.nombre),
    periodoAnalisisDias: 180,
    datosPersonalesEstructurados: data,
    proximasSesiones: appointments,
    limitaciones: [
      "Solo contiene indicadores estructurados de este estudiante.",
      "No contiene notas libres, historias clínicas, diagnósticos ni prescripciones.",
      "No se consulta ni se envía información de otros estudiantes.",
    ],
  };
}
