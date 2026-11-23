import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { refreshDataMart } from "@/lib/supabase/admin";
import { todayInPeru } from "@/lib/dates";

const habitSchema = z.object({
  id_habito: z.coerce.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intensidad: z.enum(["Alta", "Media", "Baja"]),
  completado: z.boolean(),
});

export async function GET(request: Request) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "estudiante" || !profile.id_estudiante) return NextResponse.json({ error: "Módulo exclusivo para estudiantes." }, { status: 403 });

  const url = new URL(request.url);
  const date = url.searchParams.get("fecha") || todayInPeru();
  const [habitsResult, recordsResult] = await Promise.all([
    supabase.schema("oltp_resiliencia").from("habito").select("id_habito, nombre, categoria").eq("activo", true).order("nombre"),
    supabase.schema("oltp_resiliencia").from("registro_habito").select("id_registro_habito, id_habito, fecha, intensidad, completado").eq("id_estudiante", profile.id_estudiante).eq("fecha", date).order("id_habito"),
  ]);
  if (habitsResult.error || recordsResult.error) return NextResponse.json({ error: "No se pudieron cargar los hábitos." }, { status: 500 });
  return NextResponse.json({ habits: habitsResult.data ?? [], records: recordsResult.data ?? [], date });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "estudiante" || !profile.id_estudiante) return NextResponse.json({ error: "Módulo exclusivo para estudiantes." }, { status: 403 });

  const parsed = habitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de hábito inválidos." }, { status: 400 });

  const payload = { ...parsed.data, id_estudiante: profile.id_estudiante };
  const { data, error } = await supabase.schema("oltp_resiliencia").from("registro_habito")
    .upsert(payload, { onConflict: "id_estudiante,id_habito,fecha" })
    .select("id_registro_habito, id_habito, fecha, intensidad, completado").single();
  if (error) return NextResponse.json({ error: "No se pudo guardar el registro. Verifica el catálogo y la configuración RLS." }, { status: 400 });

  const datamartRefreshed = await refreshDataMart();
  return NextResponse.json({ record: data, datamartRefreshed }, { status: 201 });
}
