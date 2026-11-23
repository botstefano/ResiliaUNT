import HabitTracker from "./habit-tracker";

export default function HabitsPage() {
  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-700">Seguimiento personal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis hábitos</h1>
        <p className="mt-2 text-sm text-muted">Registra tus hábitos del día. Estos datos apoyan el seguimiento y no forman un quinto indicador oficial.</p>
      </div>
      <HabitTracker />
    </>
  );
}
