import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!profile || !["terapeuta", "administrador"].includes(profile.rol)) {
    return NextResponse.json({ error: "Acceso exclusivo para terapeuta o administrador." }, { status: 403 });
  }

  const studentId = Number(params.id);
  if (!Number.isSafeInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: "Identificador de estudiante inválido." }, { status: 400 });
  }

  if (profile.rol === "terapeuta") {
    if (!profile.id_terapeuta) return NextResponse.json({ error: "Perfil profesional incompleto." }, { status: 403 });
    const { data: assignment } = await supabase.from("terapeuta_estudiante")
      .select("id_asignacion")
      .eq("id_terapeuta", profile.id_terapeuta)
      .eq("id_estudiante", studentId)
      .eq("activo", true)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: "No tienes acceso al estudiante solicitado." }, { status: 403 });
  }

  const { data: student, error: studentError } = await supabase.from("estudiante")
    .select("id_estudiante, codigo_universitario, nombre_visible, ciclo_academico, turno")
    .eq("id_estudiante", studentId).maybeSingle();
  if (studentError || !student) return NextResponse.json({ error: "No se encontró el estudiante o no tienes acceso." }, { status: 404 });

  const [clinical, habits, goals, networks, sessions, habitCatalog] = await Promise.all([
    supabase.from("evaluacion_clinica").select("fecha, indice_resiliencia, pensamientos_intrusivos, periodo_referencia_dias, cantidad_sesiones").eq("id_estudiante", studentId).order("fecha", { ascending: false }).limit(24),
    supabase.from("registro_habito").select("fecha, id_habito, intensidad, completado").eq("id_estudiante", studentId).order("fecha", { ascending: false }).limit(60),
    supabase.from("meta_personal").select("id_meta, categoria, descripcion, fecha_objetivo, activa").eq("id_estudiante", studentId).eq("activa", true).order("fecha_creacion", { ascending: false }),
    supabase.from("evaluacion_red_apoyo").select("fecha, red_apoyo_activa, contactos_activos, interacciones_sociales, periodo_referencia_dias").eq("id_estudiante", studentId).order("fecha", { ascending: false }).limit(24),
    supabase.from("sesion_terapia").select("inicio, estado, modalidad").eq("id_estudiante", studentId).order("inicio", { ascending: false }).limit(20),
    supabase.from("habito").select("id_habito, nombre").eq("activo", true),
  ]);

  if ([clinical, habits, goals, networks, sessions, habitCatalog].some((result) => result.error)) {
    return NextResponse.json({ error: "No se pudo recuperar el historial estructurado." }, { status: 500 });
  }

  const goalIds = (goals.data ?? []).map((goal) => goal.id_meta);
  let goalRecords: Array<{ id_meta: number; fecha: string; estado: string }> = [];
  if (goalIds.length) {
    const result = await supabase.from("registro_meta").select("id_meta, fecha, estado")
      .in("id_meta", goalIds).order("fecha", { ascending: false });
    if (result.error) return NextResponse.json({ error: "No se pudo consultar el historial de metas." }, { status: 500 });
    goalRecords = result.data ?? [];
  }

  const latestGoal = new Map<number, { fecha: string; estado: string }>();
  goalRecords.forEach((row) => { if (!latestGoal.has(row.id_meta)) latestGoal.set(row.id_meta, { fecha: row.fecha, estado: row.estado }); });
  const habitsById = new Map((habitCatalog.data ?? []).map((habit) => [habit.id_habito, habit.nombre]));

  return NextResponse.json({
    student,
    evaluations: clinical.data ?? [],
    habits: (habits.data ?? []).map((row) => ({ ...row, nombre_habito: habitsById.get(row.id_habito) ?? "Hábito" })),
    goals: (goals.data ?? []).map((goal) => ({ ...goal, ultimo_estado: latestGoal.get(goal.id_meta)?.estado ?? "Pendiente", fecha_estado: latestGoal.get(goal.id_meta)?.fecha ?? null })),
    networks: networks.data ?? [],
    sessions: sessions.data ?? [],
  });
}
