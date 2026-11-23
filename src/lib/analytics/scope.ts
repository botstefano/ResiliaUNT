import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth/context";

export async function getVisibleStudentIds(
  supabase: SupabaseClient,
  role: AppRole,
  studentId: number | null,
  therapistId: number | null,
): Promise<number[] | undefined> {
  if (role === "estudiante") return studentId ? [studentId] : [];
  if (role === "terapeuta") {
    if (!therapistId) return [];
    const { data, error } = await supabase.schema("oltp_resiliencia").from("terapeuta_estudiante")
      .select("id_estudiante").eq("id_terapeuta", therapistId).eq("activo", true);
    if (error) throw new Error("No se pudo determinar la cartera asignada.");
    return [...new Set((data ?? []).map((row) => Number(row.id_estudiante)))];
  }
  return undefined;
}
