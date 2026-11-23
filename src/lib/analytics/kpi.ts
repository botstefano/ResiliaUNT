/** Funciones puras de cálculo: se comparten entre el tablero y las pruebas. */
export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeTo30Days(count: number, referenceDays: number): number | null {
  if (!Number.isFinite(count) || !Number.isFinite(referenceDays) || referenceDays <= 0) return null;
  return (count / referenceDays) * 30;
}

export function percentage(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return (part / total) * 100;
}
