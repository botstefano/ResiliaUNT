import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEMO_SESSION_COOKIE, DEMO_SESSION_SECONDS, signDemoSession } from "@/lib/auth/demo-session";

export const dynamic = "force-dynamic";
const schema = z.object({
  role: z.enum(["estudiante", "terapeuta"]),
  id: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  if (process.env.DEMO_MODE_ENABLED !== "true") {
    return NextResponse.json({ error: "El modo de demostración está deshabilitado." }, { status: 404 });
  }
  if (!process.env.DEMO_SESSION_SECRET) {
    return NextResponse.json({ error: "Falta configurar el secreto del modo demo en el servidor." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Selecciona un perfil sintético válido." }, { status: 400 });

  try {
    const supabase = createSupabaseAdminClient();
    let claims;

    if (parsed.data.role === "estudiante") {
      const { data, error } = await supabase.schema("oltp_resiliencia").from("estudiante")
        .select("id_estudiante, codigo_universitario, nombre_visible")
        .eq("id_estudiante", parsed.data.id).like("codigo_universitario", "DEMO-%")
        .eq("activo", true).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "El estudiante demo no existe o está inactivo." }, { status: 404 });

      claims = {
        sub: "demo:student:" + data.codigo_universitario,
        role: "estudiante" as const,
        id_estudiante: Number(data.id_estudiante),
        id_terapeuta: null,
        nombre_visible: data.nombre_visible,
        exp: Math.floor(Date.now() / 1000) + DEMO_SESSION_SECONDS,
      };
    } else {
      const { data, error } = await supabase.schema("oltp_resiliencia").from("terapeuta")
        .select("id_terapeuta, codigo_terapeuta, nombre")
        .eq("id_terapeuta", parsed.data.id).like("codigo_terapeuta", "DEMO-%")
        .eq("activo", true).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "El terapeuta demo no existe o está inactivo." }, { status: 404 });

      claims = {
        sub: "demo:therapist:" + data.codigo_terapeuta,
        role: "terapeuta" as const,
        id_estudiante: null,
        id_terapeuta: Number(data.id_terapeuta),
        nombre_visible: data.nombre,
        exp: Math.floor(Date.now() / 1000) + DEMO_SESSION_SECONDS,
      };
    }

    const response = NextResponse.json({ ok: true, destination: "/portal" });
    response.cookies.set(DEMO_SESSION_COOKIE, signDemoSession(claims), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEMO_SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("No se pudo crear la sesión demo:", error);
    return NextResponse.json({ error: "No se pudo iniciar la demostración. Revisa la configuración del servidor." }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
