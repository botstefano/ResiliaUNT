import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import TherapistWorkspace from "./therapist-workspace";

export default async function TherapistPage() {
  const { profile } = await getAuthContext();
  if (!profile || !["terapeuta", "administrador"].includes(profile.rol)) redirect("/portal");

  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-700">Portal profesional</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Seguimiento de estudiantes</h1>
        <p className="mt-2 text-sm text-muted">Consulta tu cartera asignada y registra mediciones estructuradas, sesiones y valoración de red de apoyo.</p>
      </div>
      <TherapistWorkspace />
    </>
  );
}
