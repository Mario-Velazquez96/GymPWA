import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkoutLog } from "@/lib/types";
import {
  addDaysISO,
  clampISO,
  formatDateEs,
  formatKg,
  groupByDate,
  todayLocalISO,
} from "@/lib/utils";

/** Fila mínima de workout_logs para los tests de agrupación (06_history). */
function makeLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "log-1",
    user_id: "user-1",
    exercise_id: "0001",
    plan_exercise_id: "pe-1",
    performed_at: "2026-08-03",
    set_number: 1,
    reps: 10,
    weight_kg: 22.5,
    created_at: "2026-08-03T18:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("todayLocalISO (R2 — fecha local del dispositivo, nunca UTC)", () => {
  it("devuelve la fecha local aunque en UTC ya sea el día siguiente (23:59 local)", () => {
    // 1 ene 2026, 23:59 hora LOCAL: en cualquier zona al oeste de UTC (p. ej.
    // America/Mexico_City) la fecha UTC ya es 2 de enero — una implementación
    // basada en toISOString() devolvería "2026-01-02" y fallaría aquí.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 23, 59, 0));

    expect(todayLocalISO()).toBe("2026-01-01");
  });

  it("devuelve la fecha local aunque en UTC todavía sea el día anterior (00:10 local)", () => {
    // 1 ene 2026, 00:10 hora LOCAL: en zonas al este de UTC la fecha UTC aún
    // sería 31 de diciembre. Junto con el caso anterior, cubre ambos bordes.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 0, 10, 0));

    expect(todayLocalISO()).toBe("2026-01-01");
  });

  it("coincide siempre con los componentes locales de Date (invariante anti-UTC)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));

    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
    expect(todayLocalISO()).toBe(local);
  });
});

describe("formatDateEs (R2 — 'lun 3 ago' en es-MX)", () => {
  it("formatea un lunes de agosto como 'lun 3 ago'", () => {
    expect(formatDateEs("2026-08-03")).toBe("lun 3 ago");
  });

  it("formatea el primer día del año como 'jue 1 ene'", () => {
    expect(formatDateEs("2026-01-01")).toBe("jue 1 ene");
  });

  it("interpreta el ISO como fecha local (sin corrimiento de zona horaria)", () => {
    // new Date("2026-08-03") se parsearía como UTC y en zonas negativas caería
    // en el día anterior (domingo 2). El formateo debe seguir siendo lunes 3.
    expect(formatDateEs("2026-08-03")).toContain("3");
    expect(formatDateEs("2026-08-03")).toContain("lun");
  });

  it("con { year: true } agrega el año: 'lun 3 ago 2026' (06_history R2)", () => {
    expect(formatDateEs("2026-08-03", { year: true })).toBe("lun 3 ago 2026");
  });

  it("con { year: false } se comporta como sin opciones (sin año)", () => {
    expect(formatDateEs("2026-08-03", { year: false })).toBe("lun 3 ago");
  });
});

describe("formatKg (06_history R2, R7 — peso con unidad)", () => {
  it("un peso entero se formatea sin decimales: '22 kg'", () => {
    expect(formatKg(22)).toBe("22 kg");
  });

  it("un peso fraccionario conserva el medio kilo: '22.5 kg'", () => {
    expect(formatKg(22.5)).toBe("22.5 kg");
  });

  it("cero se formatea como '0 kg'", () => {
    expect(formatKg(0)).toBe("0 kg");
  });

  it("redondea a dos decimales y elimina ceros de cola", () => {
    expect(formatKg(20.0)).toBe("20 kg");
    expect(formatKg(7.25)).toBe("7.25 kg");
  });
});

describe("groupByDate (06_history R1 — sesiones por performed_at)", () => {
  it("una lista vacía produce cero sesiones", () => {
    expect(groupByDate([])).toEqual([]);
  });

  it("agrupa varias series del mismo día en una sola sesión, en orden de entrada", () => {
    const s1 = makeLog({ id: "a", performed_at: "2026-08-03", set_number: 1 });
    const s2 = makeLog({ id: "b", performed_at: "2026-08-03", set_number: 2 });
    const s3 = makeLog({ id: "c", performed_at: "2026-08-03", set_number: 3 });

    const sessions = groupByDate([s1, s2, s3]);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].date).toBe("2026-08-03");
    expect(sessions[0].sets).toEqual([s1, s2, s3]);
  });

  it("separa días distintos en sesiones distintas preservando el orden newest-first", () => {
    // La consulta trae performed_at desc: el más reciente primero.
    const newA = makeLog({ id: "a", performed_at: "2026-08-05", set_number: 1 });
    const newB = makeLog({ id: "b", performed_at: "2026-08-05", set_number: 2 });
    const oldA = makeLog({ id: "c", performed_at: "2026-08-01", set_number: 1 });

    const sessions = groupByDate([newA, newB, oldA]);

    expect(sessions.map((s) => s.date)).toEqual(["2026-08-05", "2026-08-01"]);
    expect(sessions[0].sets).toEqual([newA, newB]);
    expect(sessions[1].sets).toEqual([oldA]);
  });

  it("reagrupa filas de la misma fecha aunque lleguen no contiguas (robustez)", () => {
    const d1a = makeLog({ id: "a", performed_at: "2026-08-05", set_number: 1 });
    const d2 = makeLog({ id: "b", performed_at: "2026-08-01", set_number: 1 });
    const d1b = makeLog({ id: "c", performed_at: "2026-08-05", set_number: 2 });

    const sessions = groupByDate([d1a, d2, d1b]);

    expect(sessions.map((s) => s.date)).toEqual(["2026-08-05", "2026-08-01"]);
    expect(sessions[0].sets).toEqual([d1a, d1b]);
    expect(sessions[1].sets).toEqual([d2]);
  });
});

describe("addDaysISO (R6)", () => {
  it("suma un día dentro del mismo mes", () => {
    expect(addDaysISO("2026-08-03", 1)).toBe("2026-08-04");
  });

  it("resta un día cruzando el límite de mes", () => {
    expect(addDaysISO("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("cruza el límite de año hacia adelante", () => {
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("clampISO (R6 — bordes del plan)", () => {
  const min = "2026-08-03";
  const max = "2026-08-07";

  it("devuelve la misma fecha si está dentro del rango", () => {
    expect(clampISO("2026-08-05", min, max)).toBe("2026-08-05");
  });

  it("acota por abajo a start_date", () => {
    expect(clampISO("2026-08-01", min, max)).toBe(min);
  });

  it("acota por arriba a end_date", () => {
    expect(clampISO("2026-08-10", min, max)).toBe(max);
  });

  it("los propios bordes son válidos", () => {
    expect(clampISO(min, min, max)).toBe(min);
    expect(clampISO(max, min, max)).toBe(max);
  });
});
