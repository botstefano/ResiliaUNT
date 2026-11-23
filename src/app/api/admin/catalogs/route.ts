import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const studentSchema = z.object({
  kind: z.literal("estudiante"),
  codigo_universitario: z.string().trim().min(3).max(20),
  nombre_visible: z.string().trim().min(3).max(150),
  ciclo_academico: z.number().int().min(1).max(14).nullable().optional(),
  turno: z.enum(["Mañana", "Tarde", "Noche"]).nullable().optional(),
});

const therapistSchema = z.object({
  kind: z.literal("terapeuta"),
  codigo_terapeuta: z.string().trim().min(2).max(30),
  nombre: z.string().trim().min(3).max(150),
  especialidad: z.string().trim().max(100).nullable().optional(),
});

const roomSchema = z.object({
  kind: z.literal("sala"),
  codigo_sala: z.string().trim().min(2).max(30),
  nombre_sala: z.string().trim().min(2).max(100),
  pabellon: z.string().trim().max(100).nullable().optional(),
  modalidad: z.enum(["Presencial", "Virtual", "Mixta"]),
  capacidad: z.number().int().min(1).max(100).default(1),
});

const catalogSchema = z.discriminatedUnion("kind", [studentSchema, therapistSchema, roomSchema]);

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "administrador") {
    return NextResponse.json({ error: "Esta operación requiere rol de administrador." }, { status: 403 });
  }

  const parsed = catalogSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del registro institucional." }, { status: 400 });

  try {
    const admin = createSupabaseAdminClient();
    if (parsed.data.kind === "estudiante") {
      const { data, error } = await admin.schema("oltp_resiliencia").from("estudiante").insert({
        codigo_universitario: parsed.data.codigo_universitario,
        nombre_visible: parsed.data.nombre_visible,
        carrera: "Ingeniería de Sistemas",
        ciclo_academico: parsed.data.ciclo_academico ?? null,
        turno: parsed.data.turno ?? null,
        activo: true,
      }).select("id_estudiante, codigo_universitario, nombre_visible, ciclo_academico, turno").single();
      if (error) {
        console.error("No se pudo crear el estudiante:", error.message);
        return NextResponse.json({ error: "No se pudo crear el estudiante. Comprueba que el código universitario no esté registrado." }, { status: 400 });
      }
      return NextResponse.json({ student: data }, { status: 201 });
    }

    if (parsed.data.kind === "terapeuta") {
      const { data, error } = await admin.schema("oltp_resiliencia").from("terapeuta").insert({
        codigo_terapeuta: parsed.data.codigo_terapeuta,
        nombre: parsed.data.nombre,
        especialidad: parsed.data.especialidad || null,
        activo: true,
      }).select("id_terapeuta, codigo_terapeuta, nombre, especialidad").single();
      if (error) {
        console.error("No se pudo crear el terapeuta:", error.message);
        return NextResponse.json({ error: "No se pudo crear el registro profesional. Comprueba que el código no esté registrado." }, { status: 400 });
      }
      return NextResponse.json({ therapist: data }, { status: 201 });
    }

    const { data, error } = await admin.schema("oltp_resiliencia").from("sala_terapia").insert({
      codigo_sala: parsed.data.codigo_sala,
      nombre_sala: parsed.data.nombre_sala,
      pabellon: parsed.data.pabellon || null,
      modalidad: parsed.data.modalidad,
      capacidad: parsed.data.capacidad,
      activo: true,
    }).select("id_sala, codigo_sala, nombre_sala, pabellon, modalidad, capacidad").single();
    if (error) {
      console.error("No se pudo crear la sala:", error.message);
      return NextResponse.json({ error: "No se pudo crear la sala. Comprueba que el código no esté registrado." }, { status: 400 });
    }
    return NextResponse.json({ room: data }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/admin/catalogs:", error);
    return NextResponse.json({ error: "No se pudo inicializar la operación de catálogos." }, { status: 500 });
  }
}
