import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DIET_SNAPSHOT_KEY,
  DIET_SNAPSHOT_VERSION,
  formatSavedAt,
  readDietSnapshot,
  writeDietSnapshot,
} from "@/lib/dietCache";
import type { DietPlanFull } from "@/lib/types";

/** Plan completo con las cuatro hijas pobladas y desordenables a voluntad. */
function makePlan(overrides: Partial<DietPlanFull> = {}): DietPlanFull {
  return {
    id: "diet-1",
    user_id: "user-1",
    name: "Recomposición — Septiembre 2026",
    goal: null,
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    status: "active",
    kcal_objetivo: 2000,
    proteina_g: 160,
    carbohidrato_g: 195,
    grasa_g: 65,
    ventana_inicio: "10:00:00",
    ventana_fin: "18:00:00",
    created_at: "2026-09-01T00:00:00Z",
    diet_meals: [
      {
        id: "meal-1",
        diet_plan_id: "diet-1",
        position: 1,
        title: "Desayuno fuerte",
        hora: "10:00:00",
        kcal: 1050,
        proteina_g: 85,
        items: ["4 huevos enteros"],
        notes: null,
      },
    ],
    diet_checklist_items: [
      {
        id: "chk-1",
        diet_plan_id: "diet-1",
        kind: "super",
        position: 1,
        categoria: "Proteínas",
        item: "Pollo",
        cantidad: "1.6 kg",
      },
      {
        id: "chk-2",
        diet_plan_id: "diet-1",
        kind: "meal_prep",
        position: 2,
        categoria: null,
        item: "Cocer arroz",
        cantidad: null,
      },
    ],
    diet_supplements: [
      {
        id: "sup-1",
        diet_plan_id: "diet-1",
        position: 1,
        nombre: "Creatina monohidratada",
        dosis: "5 g",
        momento: "Diario",
        nota: null,
        recomendado: true,
      },
    ],
    diet_sections: [
      {
        id: "sec-1",
        diet_plan_id: "diet-1",
        position: 1,
        kind: "reglas",
        title: "Reglas del plan",
        body_md: "**Proteína** en cada comida",
      },
    ],
    ...overrides,
  };
}

/** Escribe un valor crudo en la clave del snapshot, saltándose la API. */
function seedRaw(raw: string): void {
  localStorage.setItem(DIET_SNAPSHOT_KEY, raw);
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("readDietSnapshot — valores ausentes o corruptos (R1, R2)", () => {
  it("sin clave devuelve null (R1)", () => {
    expect(readDietSnapshot()).toBeNull();
  });

  it("con JSON inválido devuelve null sin lanzar (R2)", () => {
    seedRaw("{no-es-json");

    expect(readDietSnapshot()).toBeNull();
  });

  it("con una versión distinta (v: 2) ignora el snapshot (R2)", () => {
    seedRaw(JSON.stringify({ v: 2, plan: makePlan(), savedAt: "2026-09-10T15:15:00.000Z" }));

    expect(readDietSnapshot()).toBeNull();
  });

  it("sin savedAt string devuelve null (R2)", () => {
    seedRaw(JSON.stringify({ v: DIET_SNAPSHOT_VERSION, plan: makePlan(), savedAt: 123 }));

    expect(readDietSnapshot()).toBeNull();
  });

  it("con plan.id que no es string devuelve null (R2)", () => {
    seedRaw(
      JSON.stringify({
        v: DIET_SNAPSHOT_VERSION,
        plan: { ...makePlan(), id: 7 },
        savedAt: "2026-09-10T15:15:00.000Z",
      }),
    );

    expect(readDietSnapshot()).toBeNull();
  });

  it("sin plan o con un plan que no es objeto devuelve null (R2)", () => {
    seedRaw(JSON.stringify({ v: 1, plan: "texto", savedAt: "2026-09-10T15:15:00.000Z" }));
    expect(readDietSnapshot()).toBeNull();

    seedRaw(JSON.stringify({ v: 1, plan: null, savedAt: "2026-09-10T15:15:00.000Z" }));
    expect(readDietSnapshot()).toBeNull();

    seedRaw(JSON.stringify({ v: 1, savedAt: "2026-09-10T15:15:00.000Z" }));
    expect(readDietSnapshot()).toBeNull();
  });

  it("con una hija que no es array devuelve null (R2)", () => {
    seedRaw(
      JSON.stringify({
        v: DIET_SNAPSHOT_VERSION,
        plan: { ...makePlan(), diet_supplements: null },
        savedAt: "2026-09-10T15:15:00.000Z",
      }),
    );

    expect(readDietSnapshot()).toBeNull();
  });

  it("con un valor que no es objeto (array, número) devuelve null (R2)", () => {
    seedRaw(JSON.stringify([1, 2, 3]));
    expect(readDietSnapshot()).toBeNull();

    seedRaw("42");
    expect(readDietSnapshot()).toBeNull();

    seedRaw("null");
    expect(readDietSnapshot()).toBeNull();
  });

  it("un snapshot inválido NO se borra: la siguiente escritura OK lo sustituye (R2, R3)", () => {
    seedRaw("{no-es-json");
    expect(readDietSnapshot()).toBeNull();
    expect(localStorage.getItem(DIET_SNAPSHOT_KEY)).toBe("{no-es-json");

    const plan = makePlan();
    writeDietSnapshot(plan, new Date("2026-09-10T15:15:00Z"));

    expect(readDietSnapshot()?.plan).toEqual(plan);
  });
});

describe("writeDietSnapshot / readDietSnapshot — round-trip (R3, R4, R14)", () => {
  it("guarda { v, plan, savedAt } y lo devuelve igual, con ids y orden intactos (R3, R14)", () => {
    const plan = makePlan();

    writeDietSnapshot(plan, new Date("2026-09-10T15:15:00Z"));
    const snapshot = readDietSnapshot();

    expect(snapshot).toEqual({
      v: 1,
      plan,
      savedAt: "2026-09-10T15:15:00.000Z",
    });
    // R14: los ids del tachado (clave gym:diet:check:<planId>:<kind>) deben
    // sobrevivir tal cual, o el estado de 11 dejaría de aplicar sin red.
    expect(snapshot?.plan.id).toBe("diet-1");
    expect(snapshot?.plan.diet_checklist_items.map((item) => item.id)).toEqual(["chk-1", "chk-2"]);
    expect(snapshot?.plan.diet_checklist_items[0].position).toBe(1);
    expect(snapshot?.plan.diet_checklist_items[1].position).toBe(2);
  });

  it("sin `now` usa la hora actual en ISO UTC (R1, R3)", () => {
    writeDietSnapshot(makePlan());

    const savedAt = readDietSnapshot()?.savedAt ?? "";
    expect(savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Math.abs(Date.now() - new Date(savedAt).getTime())).toBeLessThan(5_000);
  });

  it("una segunda escritura sustituye el snapshot anterior (R8)", () => {
    writeDietSnapshot(makePlan(), new Date("2026-09-10T15:15:00Z"));
    writeDietSnapshot(
      makePlan({ id: "diet-2", name: "Octubre" }),
      new Date("2026-10-01T12:00:00Z"),
    );

    const snapshot = readDietSnapshot();
    expect(snapshot?.plan.id).toBe("diet-2");
    expect(snapshot?.savedAt).toBe("2026-10-01T12:00:00.000Z");
  });

  it("writeDietSnapshot(null) borra la clave: 'sin plan' = sin snapshot (R4)", () => {
    writeDietSnapshot(makePlan(), new Date("2026-09-10T15:15:00Z"));
    expect(readDietSnapshot()).not.toBeNull();

    writeDietSnapshot(null);

    expect(localStorage.getItem(DIET_SNAPSHOT_KEY)).toBeNull();
    expect(readDietSnapshot()).toBeNull();
  });

  it("writeDietSnapshot(null) sin snapshot previo es inocuo (R4)", () => {
    expect(() => writeDietSnapshot(null)).not.toThrow();
    expect(readDietSnapshot()).toBeNull();
  });
});

describe("almacenamiento hostil (R2, R5)", () => {
  it("si getItem lanza, la lectura devuelve null sin propagar (R2)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: acceso a almacenamiento bloqueado");
    });

    expect(readDietSnapshot()).toBeNull();
  });

  it("si setItem lanza (cuota), la escritura se traga el fallo (R5)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writeDietSnapshot(makePlan())).not.toThrow();
  });

  it("si removeItem lanza, el borrado se traga el fallo (R5)", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => writeDietSnapshot(null)).not.toThrow();
  });

  it("sin localStorage en el entorno, lectura null y escritura inocua (R2, R5)", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(readDietSnapshot()).toBeNull();
    expect(() => writeDietSnapshot(makePlan())).not.toThrow();

    vi.unstubAllGlobals();
  });

  it("si el propio acceso a localStorage lanza (Safari privado), nada propaga (R2, R5)", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: el acceso a localStorage está bloqueado");
      },
    });

    try {
      expect(readDietSnapshot()).toBeNull();
      expect(() => writeDietSnapshot(makePlan())).not.toThrow();
      expect(() => writeDietSnapshot(null)).not.toThrow();
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(globalThis, "localStorage");
      } else {
        Object.defineProperty(globalThis, "localStorage", original);
      }
    }

    // Restaurado el entorno, el almacenamiento vuelve a funcionar.
    const plan = makePlan();
    writeDietSnapshot(plan, new Date("2026-09-10T15:15:00Z"));
    expect(readDietSnapshot()?.plan).toEqual(plan);
  });
});

describe("formatSavedAt (R13)", () => {
  it("formatea en es-MX y America/Mexico_City (UTC−6): 15:15Z → 09:15", () => {
    // La abreviatura del mes varía entre versiones de ICU ("sep" / "sept").
    expect(formatSavedAt("2026-09-10T15:15:00Z")).toMatch(/^10 sept? 09:15$/);
  });

  it("no adelanta el día: 05:59Z del 11 sigue siendo el 10 a las 23:59 local", () => {
    expect(formatSavedAt("2026-09-11T05:59:00Z")).toMatch(/^10 sept? 23:59$/);
  });

  it("usa reloj de 24 h (sin 'a. m.'/'p. m.')", () => {
    const formatted = formatSavedAt("2026-09-10T23:30:00Z") ?? "";

    expect(formatted).toMatch(/^10 sept? 17:30$/);
    expect(formatted).not.toMatch(/m\./);
  });

  it("no deja el punto de la abreviatura del mes", () => {
    expect(formatSavedAt("2026-09-10T15:15:00Z")).not.toContain(".");
  });

  it("con un ISO inválido devuelve null (R13)", () => {
    expect(formatSavedAt("no-es-fecha")).toBeNull();
    expect(formatSavedAt("")).toBeNull();
  });
});
