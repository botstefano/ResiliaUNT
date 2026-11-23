import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEMO_SESSION_COOKIE, verifyDemoSession } from "@/lib/auth/demo-session";

export type AppRole = "pendiente" | "estudiante" | "terapeuta" | "administrador";
export type AppProfile = {
  id: string;
  rol: AppRole;
  id_estudiante: number | null;
  id_terapeuta: number | null;
  nombre_visible: string | null;
  isDemo?: boolean;
};
export type AppUser = { id: string; email?: string | null; isDemo?: boolean };

export async function getAuthContext() {
  const cookieStore = cookies();
  const demoToken = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  const isMobileStudent = cookieStore.get("resilia_mobile_student")?.value === "1";

  if (process.env.DEMO_MODE_ENABLED === "true" && demoToken) {
    const claims = verifyDemoSession(demoToken);
    if (claims) {
      const supabase = createSupabaseAdminClient();
      const profile: AppProfile = {
        id: claims.sub,
        rol: claims.role,
        id_estudiante: claims.id_estudiante,
        id_terapeuta: claims.id_terapeuta,
        nombre_visible: claims.nombre_visible,
        isDemo: true,
      };
      const user: AppUser = {
        id: claims.sub,
        email: claims.sub + "@demo.resiliaunt.local",
        isDemo: true,
      };
      return { supabase, user, profile, isMobileStudent };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      supabase,
      user: null as AppUser | null,
      profile: null as AppProfile | null,
      isMobileStudent,
    };
  }

  const { data: profile } = await supabase.from("perfiles_app")
    .select("id, rol, id_estudiante, id_terapeuta, nombre_visible")
    .eq("id", authData.user.id).maybeSingle();

  return {
    supabase,
    user: authData.user as AppUser,
    profile: (profile ?? null) as AppProfile | null,
    isMobileStudent,
  };
}
