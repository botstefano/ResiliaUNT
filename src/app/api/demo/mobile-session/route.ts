import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEMO_SESSION_COOKIE, DEMO_SESSION_SECONDS, signDemoSession } from "@/lib/auth/demo-session";

export const dynamic = "force-dynamic";

const schema = z.object({ id: z.coerce.number().int().positive() });

export async function POST(request: Request) {
  if (process.env.DEMO_MODE_ENABLED !== "true") {
    return NextResponse.json({ error: "El modo de demostración está deshabilitado." }, { status: 404 });
  }
  if (!process.env.DEMO_SESSION_SECRET) {
    return NextResponse.json({ error: "Falta configurar el secreto del modo demo en el servidor." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Selecciona un estudiante sintético válido." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.schema("oltp_resiliencia").from("estudiante")
      .select("id_estudiante, codigo_universitario, nombre_visible")
      .eq("id_estudiante", parsed.data.id)
      .like("codigo_universitario", "DEMO-%")
      .eq("activo", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "El estudiante sintético no existe o está inactivo." }, { status: 404 });
    }

    const claims = {
      sub: "demo:student:" + data.codigo_universitario,
      role: "estudiante" as const,
      id_estudiante: Number(data.id_estudiante),
      id_terapeuta: null,
      nombre_visible: data.nombre_visible,
      exp: Math.floor(Date.now() / 1000) + DEMO_SESSION_SECONDS,
    };

    const response = NextResponse.json({ ok: true, destination: "/movil/estudiante" });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: DEMO_SESSION_SECONDS,
    };

    response.cookies.set(DEMO_SESSION_COOKIE, signDemoSession(claims), cookieOptions);
    response.cookies.set("resilia_mobile_student", "1", cookieOptions);
    return response;
  } catch (error) {
    console.error("No se pudo crear la sesión móvil:", error);
    return NextResponse.json({ error: "No se pudo iniciar la sesión de estudiante." }, { status: 503 });
  }
}
