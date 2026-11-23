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

/**
 * Correlación de Pearson descriptiva. Requiere un mínimo de pares para
 * reducir resultados demasiado inestables en muestras pequeñas.
 */
export function pearsonCorrelation(
  xValues: number[],
  yValues: number[],
  minimumPairs = 10,
): number | null {
  if (xValues.length !== yValues.length || !Number.isInteger(minimumPairs) || minimumPairs < 2) {
    return null;
  }

  const pairs = xValues.map((x, index) => ({ x, y: yValues[index] }))
    .filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y));
  if (pairs.length < minimumPairs) return null;

  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;

  pairs.forEach(({ x, y }) => {
    const deltaX = x - meanX;
    const deltaY = y - meanY;
    covariance += deltaX * deltaY;
    varianceX += deltaX * deltaX;
    varianceY += deltaY * deltaY;
  });

  const denominator = Math.sqrt(varianceX * varianceY);
  if (denominator === 0) return null;
  return Math.max(-1, Math.min(1, covariance / denominator));
}
