import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.DEMO_MODE_ENABLED !== "true") {
    return NextResponse.json({ error: "El modo de demostración está deshabilitado." }, { status: 404 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const [students, therapists] = await Promise.all([
      supabase.schema("oltp_resiliencia").from("estudiante")
        .select("id_estudiante, codigo_universitario, nombre_visible, ciclo_academico, turno")
        .like("codigo_universitario", "DEMO-%").eq("activo", true)
        .order("codigo_universitario").limit(250),
      supabase.schema("oltp_resiliencia").from("terapeuta")
        .select("id_terapeuta, codigo_terapeuta, nombre, especialidad")
        .like("codigo_terapeuta", "DEMO-%").eq("activo", true)
        .order("codigo_terapeuta").limit(20),
    ]);

    if (students.error || therapists.error) {
      // El detalle queda únicamente en los logs privados de Render.
      console.error("Error consultando perfiles sintéticos:", {
        students: students.error ? {
          code: students.error.code,
          message: students.error.message,
          details: students.error.details,
          hint: students.error.hint,
        } : null,
        therapists: therapists.error ? {
          code: therapists.error.code,
          message: therapists.error.message,
          details: therapists.error.details,
          hint: therapists.error.hint,
        } : null,
      });
      return NextResponse.json({ error: "No se pudieron cargar los perfiles sintéticos." }, { status: 500 });
    }
    return NextResponse.json({ students: students.data ?? [], therapists: therapists.data ?? [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error cargando perfiles demo:", error);
    return NextResponse.json({ error: "El modo demo no está configurado en el servidor." }, { status: 503 });
  }
}
