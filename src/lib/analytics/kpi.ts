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

/**
 * Devuelve una única observación por entidad, conservando la de mayor orden temporal.
 * Los elementos sin fecha válida no sustituyen observaciones válidas anteriores.
 */
export function latestByKey<T>(
  items: T[],
  keyOf: (item: T) => string | number,
  orderOf: (item: T) => number,
): T[] {
  const latest = new Map<string | number, T>();
  for (const item of items) {
    const key = keyOf(item);
    const order = orderOf(item);
    if (!Number.isFinite(order)) continue;
    const current = latest.get(key);
    if (!current || order > orderOf(current)) latest.set(key, item);
  }
  return [...latest.values()];
}
