import "server-only";
import { createClient } from "@supabase/supabase-js";

/** service_role solo se utiliza en servidor para refrescar el DataMart. */
export async function refreshDataMart(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.rpc("refrescar_datamart_resilia");
  if (error) { console.error("No se pudo refrescar el DataMart:", error.message); return false; }
  return true;
}
