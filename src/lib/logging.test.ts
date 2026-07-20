import { describe, expect, it } from "vitest";
import {
  buildInitialRows,
  firstNumber,
  formatKg,
  resolvePrefill,
  validateSet,
} from "@/lib/logging";
import type { WorkoutLog } from "@/lib/types";

function makeLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "log-1",
    user_id: "user-1",
    exercise_id: "0001",
    plan_exercise_id: "pe-1",
    performed_at: "2026-07-17",
    set_number: 1,
    reps: 10,
    weight_kg: 22.5,
    created_at: "2026-07-17T18:00:00Z",
    ...overrides,
  };
}

describe("validateSet — matriz de validación (R7)", () => {
  it.each([
    [{ weight_kg: 22.5, reps: 10 }],
    [{ weight_kg: 0, reps: 1 }], // peso corporal, mínimo de reps
    [{ weight_kg: 0.5, reps: 30 }],
    [{ weight_kg: 200, reps: 5 }],
  ])("acepta valores válidos %j", (values) => {
    expect(validateSet(values)).toBeNull();
  });

  it.each([
    [{ weight_kg: -2.5, reps: 10 }, "El peso no puede ser negativo"],
    [{ weight_kg: -0.5, reps: 1 }, "El peso no puede ser negativo"],
    [{ weight_kg: Number.NaN, reps: 10 }, "El peso no puede ser negativo"],
    [{ weight_kg: Number.POSITIVE_INFINITY, reps: 10 }, "El peso no puede ser negativo"],
    [{ weight_kg: 22.3, reps: 10 }, "El peso debe ir en pasos de 0.5 kg"],
    [{ weight_kg: 10.25, reps: 10 }, "El peso debe ir en pasos de 0.5 kg"],
    [{ weight_kg: 20, reps: 0 }, "Las repeticiones deben ser un entero de 1 o más"],
    [{ weight_kg: 20, reps: -1 }, "Las repeticiones deben ser un entero de 1 o más"],
    [{ weight_kg: 20, reps: 8.5 }, "Las repeticiones deben ser un entero de 1 o más"],
    [{ weight_kg: 20, reps: Number.NaN }, "Las repeticiones deben ser un entero de 1 o más"],
  ])("rechaza %j con mensaje en español", (values, message) => {
    expect(validateSet(values)).toBe(message);
  });

  it("con varias violaciones reporta primero la del peso", () => {
    expect(validateSet({ weight_kg: -1, reps: 0 })).toBe("El peso no puede ser negativo");
  });
});

describe("firstNumber (R3)", () => {
  it.each([
    ["8-12", 8],
    ["10", 10],
    ["5", 5],
    ["12-15 por pierna", 12],
  ])("'%s' → %d", (text, expected) => {
    expect(firstNumber(text)).toBe(expected);
  });

  it.each([["al fallo"], [""], ["0"]])("'%s' → null (sin número utilizable)", (text) => {
    expect(firstNumber(text)).toBeNull();
  });
});

describe("resolvePrefill — cadena de prefill (R3)", () => {
  const previous = [
    makeLog({ set_number: 1, weight_kg: 22.5, reps: 10 }),
    makeLog({ id: "log-2", set_number: 2, weight_kg: 25, reps: 8 }),
  ];

  it("1º: serie con el mismo set_number de la sesión anterior", () => {
    expect(
      resolvePrefill({
        setNumber: 2,
        previous,
        priorRow: { weight_kg: 50, reps: 5 },
        targetReps: "8-12",
      }),
    ).toEqual({ weight_kg: 25, reps: 8 });
  });

  it("2º: sin serie anterior con ese número usa la fila n−1 de la UI actual", () => {
    expect(
      resolvePrefill({
        setNumber: 3,
        previous,
        priorRow: { weight_kg: 27.5, reps: 9 },
        targetReps: "8-12",
      }),
    ).toEqual({ weight_kg: 27.5, reps: 9 });
  });

  it("3º: sin nada, peso 0 y reps = primer número de target_reps", () => {
    expect(
      resolvePrefill({ setNumber: 1, previous: [], priorRow: null, targetReps: "8-12" }),
    ).toEqual({ weight_kg: 0, reps: 8 });
  });

  it("3º con target_reps sin número ('al fallo'): fallback reps 10", () => {
    expect(
      resolvePrefill({ setNumber: 1, previous: [], priorRow: null, targetReps: "al fallo" }),
    ).toEqual({ weight_kg: 0, reps: 10 });
  });
});

describe("buildInitialRows (R1, R3, R8)", () => {
  const previous = [
    makeLog({ set_number: 1, weight_kg: 22.5, reps: 10 }),
    makeLog({ id: "log-2", set_number: 2, weight_kg: 25, reps: 8 }),
  ];

  it("sin series guardadas crea target_sets filas editables numeradas desde 1", () => {
    const rows = buildInitialRows({ targetSets: 4, targetReps: "8-12", previous: [], saved: [] });

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.setNumber)).toEqual([1, 2, 3, 4]);
    expect(rows.every((row) => row.status === "editable")).toBe(true);
    // Sin historial: fila 1 usa el fallback y las demás copian a su anterior.
    expect(rows[0]).toMatchObject({ weight_kg: 0, reps: 8 });
    expect(rows[3]).toMatchObject({ weight_kg: 0, reps: 8 });
  });

  it("prefill por serie: sesión anterior para 1-2, copia de la fila previa para 3-4 (R3)", () => {
    const rows = buildInitialRows({ targetSets: 4, targetReps: "8-12", previous, saved: [] });

    expect(rows[0]).toMatchObject({ weight_kg: 22.5, reps: 10 });
    expect(rows[1]).toMatchObject({ weight_kg: 25, reps: 8 });
    expect(rows[2]).toMatchObject({ weight_kg: 25, reps: 8 }); // copia de la fila 2
    expect(rows[3]).toMatchObject({ weight_kg: 25, reps: 8 });
  });

  it("series guardadas hoy se renderizan como filas saved con sus valores (R8)", () => {
    const saved = [
      makeLog({ performed_at: "2026-07-19", set_number: 1, weight_kg: 30, reps: 12 }),
      makeLog({
        id: "log-3",
        performed_at: "2026-07-19",
        set_number: 2,
        weight_kg: 32.5,
        reps: 10,
      }),
    ];

    const rows = buildInitialRows({ targetSets: 4, targetReps: "8-12", previous, saved });

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ setNumber: 1, weight_kg: 30, reps: 12, status: "saved" });
    expect(rows[1]).toMatchObject({ setNumber: 2, weight_kg: 32.5, reps: 10, status: "saved" });
    // La 3 no existe en la sesión anterior → copia la fila previa (la 2 guardada).
    expect(rows[2]).toMatchObject({ setNumber: 3, weight_kg: 32.5, reps: 10, status: "editable" });
    expect(rows[3]).toMatchObject({ setNumber: 4, status: "editable" });
  });

  it("ordena por set_number las series guardadas que lleguen desordenadas", () => {
    const saved = [
      makeLog({ id: "b", performed_at: "2026-07-19", set_number: 2, weight_kg: 32.5, reps: 10 }),
      makeLog({ id: "a", performed_at: "2026-07-19", set_number: 1, weight_kg: 30, reps: 12 }),
    ];

    const rows = buildInitialRows({ targetSets: 2, targetReps: "10", previous: [], saved });

    expect(rows.map((row) => row.setNumber)).toEqual([1, 2]);
    expect(rows[0].weight_kg).toBe(30);
  });

  it("con todas las series objetivo ya guardadas no agrega filas editables", () => {
    const saved = [1, 2, 3].map((setNumber) =>
      makeLog({ id: `log-${setNumber}`, performed_at: "2026-07-19", set_number: setNumber }),
    );

    const rows = buildInitialRows({ targetSets: 3, targetReps: "10", previous: [], saved });

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "saved")).toBe(true);
  });

  it("series extra guardadas (más que target_sets) también se renderizan (R8)", () => {
    const saved = [1, 2, 3, 4, 5].map((setNumber) =>
      makeLog({ id: `log-${setNumber}`, performed_at: "2026-07-19", set_number: setNumber }),
    );

    const rows = buildInitialRows({ targetSets: 4, targetReps: "10", previous: [], saved });

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.status === "saved")).toBe(true);
  });
});

describe("formatKg", () => {
  it.each([
    [22.5, "22.5"],
    [20, "20"],
    [0, "0"],
    [102.75, "102.75"],
  ])("%d → '%s'", (value, expected) => {
    expect(formatKg(value)).toBe(expected);
  });
});
