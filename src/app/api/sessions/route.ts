import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { refreshDataMart } from "@/lib/supabase/admin";

export async function GET() {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!profile || !["estudiante", "terapeuta", "administrador"].includes(profile.rol)) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });

  let query = supabase.from("sesion_terapia")
    .select("id_sesion, id_estudiante, inicio, fin, estado, modalidad")
    .order("inicio", { ascending: false }).limit(100);
  if (profile.rol === "estudiante" && profile.id_estudiante) query = query.eq("id_estudiante", profile.id_estudiante);
  if (profile.rol === "terapeuta" && profile.id_terapeuta) query = query.eq("id_terapeuta", profile.id_terapeuta);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "No se pudieron cargar las sesiones." }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "terapeuta" || !profile.id_terapeuta) return NextResponse.json({ error: "Solo un terapeuta puede programar sesiones." }, { status: 403 });

  const schema = z.object({
    id_estudiante: z.coerce.number().int().positive(),
    inicio: z.string().datetime(),
    modalidad: z.enum(["Presencial", "Virtual", "Mixta"]),
  });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de sesión inválidos." }, { status: 400 });

  const { data: assignment } = await supabase.from("terapeuta_estudiante")
    .select("id_asignacion").eq("id_terapeuta", profile.id_terapeuta)
    .eq("id_estudiante", parsed.data.id_estudiante).eq("activo", true).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "El estudiante no pertenece a tu cartera asignada." }, { status: 403 });

  const { data, error } = await supabase.from("sesion_terapia").insert({
    id_estudiante: parsed.data.id_estudiante,
    id_terapeuta: profile.id_terapeuta,
    inicio: parsed.data.inicio,
    modalidad: parsed.data.modalidad,
    estado: "Programada",
  }).select("id_sesion, id_estudiante, inicio, estado, modalidad").single();
  if (error) return NextResponse.json({ error: "No se pudo programar la sesión." }, { status: 400 });

  const datamartRefreshed = await refreshDataMart();
  return NextResponse.json({ session: data, datamartRefreshed }, { status: 201 });
}


export async function PATCH(request: Request) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "terapeuta" || !profile.id_terapeuta) {
    return NextResponse.json({ error: "Solo un terapeuta puede actualizar el estado de una sesión." }, { status: 403 });
  }

  const schema = z.object({
    id_sesion: z.coerce.number().int().positive(),
    estado: z.enum(["Programada", "Realizada", "Cancelada", "No asistió"]),
  });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Estado de sesión inválido." }, { status: 400 });

  const { data, error } = await supabase.from("sesion_terapia")
    .update({ estado: parsed.data.estado })
    .eq("id_sesion", parsed.data.id_sesion)
    .eq("id_terapeuta", profile.id_terapeuta)
    .select("id_sesion, estado")
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "No se pudo actualizar. Verifica que la sesión esté asignada a tu perfil." }, { status: 400 });
  const datamartRefreshed = await refreshDataMart();
  return NextResponse.json({ session: data, datamartRefreshed });
}
