import GoalsManager from "./goals-manager";

export default function GoalsPage() {
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
