import SessionsList from "./sessions-list";

export default function SessionsPage() {
  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-700">Atención y agenda</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis sesiones</h1>
        <p className="mt-2 text-sm text-muted">Consulta las sesiones que te corresponden según tu perfil y asignación.</p>
      </div>
      <SessionsList />
    </>
  );
}
