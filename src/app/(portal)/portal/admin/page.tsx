import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import AdminWorkspace from "./admin-workspace";

export default async function AdminPage() {
  const { user, profile } = await getAuthContext();
  if (!user) redirect("/login");
  if (profile?.rol !== "administrador") redirect("/portal");

  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-700">Administración institucional</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Usuarios y asignaciones</h1>
        <p className="mt-2 text-sm text-muted">Habilita cuentas institucionales y gestiona las relaciones entre terapeutas y estudiantes.</p>
      </div>
      <AdminWorkspace />
    </>
  );
}
