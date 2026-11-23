import "server-only";

import { todayInPeru } from "@/lib/dates";

export type ChatAlertType = "solicitud_contacto" | "prioridad_seguridad";

export async function createStudentAlert(admin: any, studentId: number, type: ChatAlertType): Promise<boolean> {
  const today = todayInPeru();
  const { data: assignments, error: assignmentError } = await admin.schema("oltp_resiliencia")
    .from("terapeuta_estudiante").select("id_terapeuta")
    .eq("id_estudiante", studentId).eq("activo", true)
    .lte("fecha_inicio", today).or("fecha_fin.is.null,fecha_fin.gte." + today);
  if (assignmentError) {
    console.error("No se pudo resolver el destinatario de la alerta del chatbot:", assignmentError.message);
    return false;
  }
  const therapistIds = [...new Set((assignments ?? []).map((row: any) => Number(row.id_terapeuta)))];
  if (!therapistIds.length) return false;

  const { data: therapists, error: therapistError } = await admin.schema("oltp_resiliencia")
    .from("terapeuta").select("id_terapeuta,codigo_terapeuta")
    .in("id_terapeuta", therapistIds).eq("activo", true).like("codigo_terapeuta", "DEMO-%");
  if (therapistError || !therapists?.length) return false;

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: recent, error: recentError } = await admin.from("chatbot_alertas")
    .select("id_alerta,id_terapeuta").eq("id_estudiante", studentId)
    .eq("tipo", type).eq("estado", "pendiente").gte("creada_en", since);
  if (recentError) {
    console.error("No se pudo comprobar si ya existe una alerta pendiente:", recentError.message);
    return false;
  }
  const existing = new Set((recent ?? []).map((row: any) => Number(row.id_terapeuta)));
  const missing = therapists.filter((row: any) => !existing.has(Number(row.id_terapeuta)));
  if (!missing.length) return true;

  const rows = missing.map((row: any) => ({
    id_estudiante: studentId,
    id_terapeuta: Number(row.id_terapeuta),
    tipo: type,
    estado: "pendiente",
  }));
  const { error: insertError } = await admin.from("chatbot_alertas").insert(rows);
  if (insertError) {
    console.error("No se pudo registrar la alerta del chatbot:", insertError.message);
    return false;
  }
  return true;
}
