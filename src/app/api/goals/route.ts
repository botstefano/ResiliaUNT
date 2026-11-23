import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { refreshDataMart } from "@/lib/supabase/admin";
import { todayInPeru } from "@/lib/dates";

const createGoalSchema = z.object({
  categoria: z.string().trim().min(2).max(50),
  descripcion: z.string().trim().min(3).max(180),
  fecha_objetivo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export async function GET() {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "estudiante" || !profile.id_estudiante) return NextResponse.json({ error: "Módulo exclusivo para estudiantes." }, { status: 403 });

  const { data: goals, error } = await supabase.from("meta_personal")
    .select("id_meta, categoria, descripcion, fecha_creacion, fecha_objetivo, activa")
    .eq("id_estudiante", profile.id_estudiante).eq("activa", true).order("fecha_creacion", { ascending: false });
  if (error) return NextResponse.json({ error: "No se pudieron consultar las metas." }, { status: 500 });

  const ids = (goals ?? []).map((goal) => goal.id_meta);
  let records: Array<{ id_meta: number; fecha: string; estado: string }> = [];
  if (ids.length) {
    const result = await supabase.from("registro_meta").select("id_meta, fecha, estado")
      .in("id_meta", ids).order("fecha", { ascending: false });
    if (result.error) return NextResponse.json({ error: "No se pudo consultar el estado de las metas." }, { status: 500 });
    records = result.data ?? [];
  }

  const latest = new Map<number, { fecha: string; estado: string }>();
  records.forEach((row) => { if (!latest.has(row.id_meta)) latest.set(row.id_meta, { fecha: row.fecha, estado: row.estado }); });
  return NextResponse.json({
    goals: (goals ?? []).map((goal) => ({ ...goal, ultimo_estado: latest.get(goal.id_meta)?.estado ?? "Pendiente", fecha_estado: latest.get(goal.id_meta)?.fecha ?? null })),
  });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "estudiante" || !profile.id_estudiante) return NextResponse.json({ error: "Módulo exclusivo para estudiantes." }, { status: 403 });

  const parsed = createGoalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa la categoría, descripción y fecha objetivo." }, { status: 400 });

  const { data: goal, error } = await supabase.from("meta_personal").insert({
    id_estudiante: profile.id_estudiante,
    categoria: parsed.data.categoria,
    descripcion: parsed.data.descripcion,
    fecha_objetivo: parsed.data.fecha_objetivo || null,
  }).select("id_meta").single();
  if (error || !goal) return NextResponse.json({ error: "No se pudo crear la meta." }, { status: 400 });

  const today = todayInPeru();
  const stateResult = await supabase.from("registro_meta").insert({ id_meta: goal.id_meta, fecha: today, estado: "Pendiente" });
  if (stateResult.error) return NextResponse.json({ error: "La meta se creó, pero no se pudo registrar su estado inicial. Contacta al administrador." }, { status: 500 });

  const datamartRefreshed = await refreshDataMart();
  return NextResponse.json({ id_meta: goal.id_meta, datamartRefreshed }, { status: 201 });
}

export async function PUT(request: Request) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "estudiante" || !profile.id_estudiante) return NextResponse.json({ error: "Módulo exclusivo para estudiantes." }, { status: 403 });

  const schema = z.object({ id_meta: z.coerce.number().int().positive(), estado: z.enum(["Cumplida", "Pendiente"]) });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de estado inválidos." }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("registro_meta").upsert(
    { id_meta: parsed.data.id_meta, fecha: today, estado: parsed.data.estado },
    { onConflict: "id_meta,fecha" },
  );
  if (error) return NextResponse.json({ error: "No se pudo actualizar el estado. Verifica que la meta te pertenezca." }, { status: 400 });

  const datamartRefreshed = await refreshDataMart();
  return NextResponse.json({ ok: true, datamartRefreshed });
}
