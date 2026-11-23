import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!profile || !["terapeuta", "administrador"].includes(profile.rol)) return NextResponse.json({ error: "Acceso exclusivo para terapeuta o administrador." }, { status: 403 });

  const [studentsResult, roomsResult] = await Promise.all([
    supabase.schema("oltp_resiliencia").from("estudiante")
      .select("id_estudiante, codigo_universitario, nombre_visible, ciclo_academico, turno")
      .eq("activo", true).order("nombre_visible"),
    supabase.schema("oltp_resiliencia").from("sala_terapia")
      .select("id_sala, codigo_sala, nombre_sala, pabellon, modalidad")
      .eq("activo", true).order("nombre_sala"),
  ]);
  if (studentsResult.error || roomsResult.error) return NextResponse.json({ error: "No se pudo cargar la cartera o las salas." }, { status: 500 });
  return NextResponse.json({ students: studentsResult.data ?? [], rooms: roomsResult.data ?? [] });
}
