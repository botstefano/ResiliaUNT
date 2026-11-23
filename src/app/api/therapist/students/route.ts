import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";

export async function GET() {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!profile || !["terapeuta", "administrador"].includes(profile.rol)) return NextResponse.json({ error: "Acceso exclusivo para terapeuta o administrador." }, { status: 403 });

  const { data, error } = await supabase.schema("oltp_resiliencia").from("estudiante")
    .select("id_estudiante, codigo_universitario, nombre_visible, ciclo_academico, turno")
    .eq("activo", true).order("nombre_visible");
  if (error) return NextResponse.json({ error: "No se pudo cargar la cartera de estudiantes." }, { status: 500 });
  return NextResponse.json({ students: data ?? [] });
}
