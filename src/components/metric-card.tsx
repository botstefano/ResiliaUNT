type Props = { label: string; value: string; note: string; accent?: string };

export default function MetricCard({ label, value, note, accent = "bg-brand-500" }: Props) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className={"absolute inset-y-0 left-0 w-1 " + accent} />
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
    </article>
  );
}
