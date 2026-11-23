import TherapistWorkspace from "./therapist-workspace";

export default function TherapistPage() {
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
