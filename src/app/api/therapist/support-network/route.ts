import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { refreshDataMart } from "@/lib/supabase/admin";

const schema = z.object({
  id_estudiante: z.coerce.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodo_referencia_dias: z.coerce.number().int().min(1).max(365).default(30),
  red_apoyo_activa: z.boolean(),
  contactos_activos: z.coerce.number().int().min(0).max(1000),
  interacciones_sociales: z.coerce.number().int().min(0).max(100000),
});

export async function POST(request: Request) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "terapeuta" || !profile.id_terapeuta) return NextResponse.json({ error: "Solo un terapeuta puede valorar la red de apoyo." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos de red de apoyo." }, { status: 400 });

  const { data: assignment } = await supabase.from("terapeuta_estudiante")
    .select("id_asignacion").eq("id_terapeuta", profile.id_terapeuta)
    .eq("id_estudiante", parsed.data.id_estudiante).eq("activo", true).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "El estudiante no pertenece a tu cartera asignada." }, { status: 403 });

  const { data, error } = await supabase.from("evaluacion_red_apoyo").upsert({
    ...parsed.data,
    id_terapeuta: profile.id_terapeuta,
  }, { onConflict: "id_estudiante,fecha" })
    .select("id_evaluacion_red, fecha, red_apoyo_activa, contactos_activos, interacciones_sociales").single();
  if (error) return NextResponse.json({ error: "No se pudo guardar la valoración de red." }, { status: 400 });

  const datamartRefreshed = await refreshDataMart();
  return NextResponse.json({ evaluation: data, datamartRefreshed }, { status: 201 });
}
