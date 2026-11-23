import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.DEMO_MODE_ENABLED !== "true") {
    return NextResponse.json({ error: "El modo de demostración está deshabilitado." }, { status: 404 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.schema("oltp_resiliencia").from("estudiante")
      .select("id_estudiante, codigo_universitario, nombre_visible, ciclo_academico, turno")
      .like("codigo_universitario", "DEMO-%")
      .eq("activo", true)
      .order("codigo_universitario")
      .limit(250);

    if (error) {
      console.error("Error consultando estudiantes sintéticos para móvil:", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ error: "No se pudieron cargar los estudiantes sintéticos." }, { status: 500 });
    }

    return NextResponse.json({ students: data ?? [] }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("Error cargando estudiantes móviles:", error);
    return NextResponse.json({ error: "El servicio de demostración no está configurado." }, { status: 503 });
  }
}
