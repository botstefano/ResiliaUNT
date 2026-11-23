import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import GoalsManager from "./goals-manager";

export default async function GoalsPage() {
  const { profile } = await getAuthContext();
  if (profile?.rol !== "estudiante") redirect("/portal");

  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-700">Organización personal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis metas</h1>
        <p className="mt-2 text-sm text-muted">Define metas que quieras seguir y actualiza su estado. Puedes modificar el estado durante el proceso.</p>
      </div>
      <GoalsManager />
    </>
  );
}
