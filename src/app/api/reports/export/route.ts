import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { getDashboardSummary } from "@/lib/analytics/dashboard";
import { todayInPeru } from "@/lib/dates";

export const dynamic = "force-dynamic";

const csvCell = (value: string | number | null) =>
  '"' + String(value ?? "").replaceAll('"', '""') + '"';

export async function GET() {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!profile || profile.rol === "pendiente") {
    return NextResponse.json({ error: "La cuenta no tiene un perfil habilitado." }, { status: 403 });
  }

  try {
    const today = todayInPeru();
    const [year, month] = today.split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, month - 1 - 11, 1));
    const periodStart = firstDay.toISOString().slice(0, 10);
    const summary = await getDashboardSummary(supabase);

    const rows: Array<Array<string | number | null>> = [
      ["Fecha de generación", today],
      ["Inicio del período", periodStart],
      ["Fin del período", today],
      [],
      ["Indicador", "Valor", "Unidad", "Base de cálculo"],
      ["KPI 1 - Resiliencia", summary.resilience, "Puntaje promedio", "Última evaluación de cada estudiante; n=" + summary.evaluatedStudentsCount],
      ["KPI 2 - Pensamientos intrusivos", summary.intrusivePer30Days, "Frecuencia normalizada / 30 días", "Última evaluación de cada estudiante; n=" + summary.evaluatedStudentsCount],
      ["KPI 3 - Cumplimiento de metas", summary.goalCompletionPct, "%", "Último estado de cada meta; n=" + summary.goalsCount],
      ["KPI 4 - Red de apoyo activa", summary.activeSupportPct, "%", "Última valoración por estudiante; n=" + summary.supportStudentsCount],
      [],
      ["Variables complementarias", "Valor", "Unidad", "Base de cálculo"],
      ["Contactos activos promedio", summary.activeContactsAvg, "Contactos", "Última valoración por estudiante"],
      ["Interacciones sociales promedio", summary.interactionsAvg, "Interacciones", "Última valoración por estudiante"],
      ["Hábitos completados", summary.habitsCompletionPct, "%", "Registros diarios; n=" + summary.habitRecordsCount],
    ];

    if (profile.rol !== "estudiante") {
      rows.push(
        [],
        ["Asociaciones exploratorias", "Coeficiente r de Pearson", "Unidad", "Base de cálculo"],
        ["Hábitos - resiliencia", summary.habitResilienceCorrelation, "r", "Una observación agregada por estudiante; n=" + summary.habitAssociationStudents],
        ["Hábitos - pensamientos intrusivos", summary.habitIntrusiveCorrelation, "r", "Una observación agregada por estudiante; n=" + summary.habitAssociationStudents],
      );
    }

    rows.push(
      [],
      ["Nota", "Indicadores descriptivos; no representan diagnósticos ni recomendaciones clínicas."],
      ["Privacidad", "Este archivo contiene solo agregados; no incluye nombres, códigos universitarios ni UUID."],
    );

    const csv = "\uFEFF" + rows.map((row) => row.map((value) => csvCell(value ?? "")).join(",")).join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="resiliaunt-resumen-' + today + '.csv"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("No se pudo generar el informe ResiliaUNT:", error);
    return NextResponse.json({ error: "No se pudo generar el informe. Revisa la conexión al DataMart." }, { status: 500 });
  }
}
