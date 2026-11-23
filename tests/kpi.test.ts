import { describe, expect, it } from "vitest";
import { average, latestByKey, normalizeTo30Days, percentage } from "../src/lib/analytics/kpi";

describe("cálculo de indicadores ResiliaUNT", () => {
  it("devuelve null cuando no hay observaciones", () => {
    expect(average([])).toBeNull();
  });

  it("calcula un promedio aritmético", () => {
    expect(average([40, 50, 60])).toBe(50);
  });

  it("normaliza la frecuencia a 30 días", () => {
    expect(normalizeTo30Days(6, 15)).toBe(12);
  });

  it("no divide cuando el período de referencia es inválido", () => {
    expect(normalizeTo30Days(6, 0)).toBeNull();
  });

  it("calcula porcentajes y protege denominadores vacíos", () => {
    expect(percentage(3, 4)).toBe(75);
    expect(percentage(0, 0)).toBeNull();
  });

  it("conserva solo la observación más reciente por estudiante", () => {
    const rows = [
      { student: 1, date: 20260110, active: true },
      { student: 1, date: 20260210, active: false },
      { student: 2, date: 20260205, active: true },
    ];
    const latest = latestByKey(rows, (row) => row.student, (row) => row.date);
    expect(latest).toHaveLength(2);
    expect(latest.find((row) => row.student === 1)?.active).toBe(false);
    expect(latest.find((row) => row.student === 2)?.active).toBe(true);
  });
});
