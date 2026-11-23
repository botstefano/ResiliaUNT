import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Cliente privilegiado; solo debe importarse desde módulos de servidor. */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase reemplaza gradualmente service_role por secret keys (sb_secret_...).
  // Conservamos el nombre anterior como fallback para instalaciones legacy.
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error("Falta configurar SUPABASE_SECRET_KEY en el servidor.");
  }
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** La clave secreta/service_role solo se utiliza en servidor para refrescar el DataMart. */
export async function refreshDataMart(): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc("refrescar_datamart_resilia");
    if (error) {
      console.error("No se pudo refrescar el DataMart:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("No se pudo inicializar el cliente administrativo de Supabase:", error);
    return false;
  }
}
