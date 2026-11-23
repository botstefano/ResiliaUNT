import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") || "/portal";
  // Solo se admiten los dos destinos internos que utiliza el flujo de autenticación.
  // Así se evita cualquier open redirect por rutas relativas ambiguas.
  const allowedDestinations = new Set(["/portal", "/reset-password"]);
  const next = allowedDestinations.has(requestedNext) ? requestedNext : "/portal";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("No se pudo completar el callback de Supabase:", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
