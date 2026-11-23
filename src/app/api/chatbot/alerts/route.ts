/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST schemas are normalized at this server-only boundary. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStudentAlert } from "@/lib/chatbot/alerts";
import { todayInPeru } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "terapeuta" || !profile.id_terapeuta) {
    return NextResponse.json({ error: "Solo el terapeuta asignado puede consultar estos avisos." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient() as any;
  const { data: therapist, error: therapistError } = await admin.schema("oltp_resiliencia").from("terapeuta")
    .select("id_terapeuta,codigo_terapeuta").eq("id_terapeuta", profile.id_terapeuta)
    .eq("activo", true).like("codigo_terapeuta", "DEMO-%").maybeSingle();
  if (therapistError || !therapist) return NextResponse.json({ error: "El asistente solo está disponible para perfiles sintéticos habilitados." }, { status: 403 });

  const today = todayInPeru();
  const { data: assignments, error: assignmentsError } = await admin.schema("oltp_resiliencia")
    .from("terapeuta_estudiante").select("id_estudiante")
    .eq("id_terapeuta", profile.id_terapeuta).eq("activo", true)
    .lte("fecha_inicio", today).or("fecha_fin.is.null,fecha_fin.gte." + today);
  if (assignmentsError) return NextResponse.json({ error: "No se pudo validar la cartera profesional." }, { status: 500 });
  const assignedIds = [...new Set((assignments ?? []).map((row: any) => Number(row.id_estudiante)))];
  if (!assignedIds.length) return NextResponse.json({ alerts: [] });

  const { data: alerts, error } = await admin.from("chatbot_alertas")
    .select("id_alerta,id_estudiante,tipo,estado,creada_en")
    .eq("id_terapeuta", profile.id_terapeuta).eq("estado", "pendiente")
    .in("id_estudiante", assignedIds)
    .order("creada_en", { ascending: false }).limit(25);
  if (error) return NextResponse.json({ error: "No se pudieron cargar los avisos." }, { status: 500 });
  const ids = [...new Set((alerts ?? []).map((row: any) => Number(row.id_estudiante)))];
  const { data: students, error: studentsError } = ids.length
    ? await admin.schema("oltp_resiliencia").from("estudiante")
      .select("id_estudiante,codigo_universitario,nombre_visible,ciclo_academico,turno")
      .in("id_estudiante", ids).eq("activo", true).like("codigo_universitario", "DEMO-%")
    : { data: [], error: null };
  if (studentsError) return NextResponse.json({ error: "No se pudo completar la información de los avisos." }, { status: 500 });
  const byId = new Map((students ?? []).map((s: any) => [Number(s.id_estudiante), s]));
  return NextResponse.json({
    alerts: (alerts ?? []).flatMap((row: any) => {
      const student: any = byId.get(Number(row.id_estudiante));
      return student ? [{
        id: Number(row.id_alerta), tipo: row.tipo, creadaEn: row.creada_en,
        estudiante: student.nombre_visible, codigo: student.codigo_universitario,
        ciclo: student.ciclo_academico, turno: student.turno,
      }] : [];
    }),
  });
}

export async function POST() {
  const { user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "estudiante" || !profile.id_estudiante) {
    return NextResponse.json({ error: "Solo un estudiante puede solicitar contacto." }, { status: 403 });
  }
  const admin = createSupabaseAdminClient() as any;
  const { data: student, error } = await admin.schema("oltp_resiliencia").from("estudiante")
    .select("id_estudiante,codigo_universitario,activo")
    .eq("id_estudiante", profile.id_estudiante).eq("activo", true)
    .like("codigo_universitario", "DEMO-%").maybeSingle();
  if (error || !student) return NextResponse.json({ error: "El perfil no está habilitado para esta acción." }, { status: 403 });

  const created = await createStudentAlert(admin, profile.id_estudiante, "solicitud_contacto");
  if (!created) {
    return NextResponse.json({ error: "No se encontró una asignación activa para registrar el aviso. Contacta directamente con tu servicio de atención." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, message: "Aviso registrado en el panel del profesional asignado." });
}

const patchSchema = z.object({ id: z.number().int().positive() });

export async function PATCH(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "terapeuta" || !profile.id_terapeuta) {
    return NextResponse.json({ error: "Solo el terapeuta asignado puede actualizar avisos." }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Aviso inválido." }, { status: 400 });

  const admin = createSupabaseAdminClient() as any;
  const { data: therapist } = await admin.schema("oltp_resiliencia").from("terapeuta")
    .select("id_terapeuta").eq("id_terapeuta", profile.id_terapeuta)
    .eq("activo", true).like("codigo_terapeuta", "DEMO-%").maybeSingle();
  if (!therapist) return NextResponse.json({ error: "Perfil profesional no habilitado." }, { status: 403 });

  const { data: targetAlert, error: targetError } = await admin.from("chatbot_alertas")
    .select("id_alerta,id_estudiante").eq("id_alerta", parsed.data.id)
    .eq("id_terapeuta", profile.id_terapeuta).eq("estado", "pendiente").maybeSingle();
  if (targetError || !targetAlert) return NextResponse.json({ error: "Aviso no encontrado en tu cartera." }, { status: 404 });
  const today = todayInPeru();
  const { data: assignment } = await admin.schema("oltp_resiliencia").from("terapeuta_estudiante")
    .select("id_asignacion").eq("id_terapeuta", profile.id_terapeuta)
    .eq("id_estudiante", targetAlert.id_estudiante).eq("activo", true)
    .lte("fecha_inicio", today).or("fecha_fin.is.null,fecha_fin.gte." + today).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "El aviso ya no pertenece a una asignación vigente." }, { status: 403 });

  const { data, error } = await admin.from("chatbot_alertas").update({
    estado: "atendida", atendida_en: new Date().toISOString(),
  }).eq("id_alerta", parsed.data.id).eq("id_terapeuta", profile.id_terapeuta)
    .eq("estado", "pendiente").select("id_alerta").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No se pudo actualizar el aviso o no pertenece a tu cartera." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
