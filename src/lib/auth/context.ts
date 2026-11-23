import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "pendiente" | "estudiante" | "terapeuta" | "administrador";
export type AppProfile = { id: string; rol: AppRole; id_estudiante: number | null; id_terapeuta: number | null; nombre_visible: string | null };

export async function getAuthContext() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { supabase, user: null, profile: null as AppProfile | null };
  const { data: profile } = await supabase.from("perfiles_app")
    .select("id, rol, id_estudiante, id_terapeuta, nombre_visible")
    .eq("id", authData.user.id).maybeSingle();
  return { supabase, user: authData.user, profile: (profile ?? null) as AppProfile | null };
}
