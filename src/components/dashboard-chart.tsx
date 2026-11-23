"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { month: string; resilience: number | null; intrusive: number | null };

export default function DashboardChart({ data }: { data: Point[] }) {
  if (!data.length) return <div className="flex h-72 items-center justify-center rounded-xl bg-canvas text-sm text-muted">Aún no hay evaluaciones registradas para el período.</div>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -15, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EE" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
          <Tooltip /><Legend />
          <Line yAxisId="left" type="monotone" dataKey="resilience" name="Resiliencia (promedio)" stroke="#397D79" strokeWidth={3} dot={{ r: 3 }} connectNulls />
          <Line yAxisId="right" type="monotone" dataKey="intrusive" name="Intrusivos / 30 días" stroke="#D18A48" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
