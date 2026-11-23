import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const invitationSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (profile?.rol !== "administrador") {
    return NextResponse.json({ error: "Esta operación requiere rol de administrador." }, { status: 403 });
  }

  const parsed = invitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Introduce un correo electrónico válido." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "Falta configurar NEXT_PUBLIC_APP_URL en el servidor." }, { status: 500 });
  }

  try {
    const origin = new URL(appUrl);
    if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") {
      return NextResponse.json({ error: "La URL pública de la aplicación debe utilizar HTTPS." }, { status: 500 });
    }

    const redirectTo = new URL("/auth/callback?next=/reset-password", origin).toString();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo,
    });

    if (error) {
      console.error("Supabase rechazó la invitación administrativa:", error.message);
      return NextResponse.json({
        error: "No se pudo enviar la invitación. Verifica si la cuenta ya existe y revisa la configuración de correo de Supabase Auth.",
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
      message: "Invitación enviada. El usuario podrá establecer su contraseña y luego quedará pendiente de habilitación.",
    }, { status: 201 });
  } catch (error) {
    console.error("Error enviando invitación de ResiliaUNT:", error);
    return NextResponse.json({ error: "No se pudo generar la URL segura de invitación." }, { status: 500 });
  }
}
