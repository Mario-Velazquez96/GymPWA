import { describe, expect, it } from "vitest";
import type { DietMeal } from "@/lib/types";
import {
  DIET_TIME_ZONE,
  formatHora,
  formatMinutes,
  getWindowState,
  nowLocalHM,
  parseHM,
  sortByPosition,
} from "@/lib/diet";

function makeMeal(overrides: Partial<DietMeal> & { id: string; position: number }): DietMeal {
  return {
    diet_plan_id: "diet-1",
    title: `Comida ${overrides.position}`,
    hora: null,
    kcal: null,
    proteina_g: null,
    items: [],
    notes: null,
    ...overrides,
  };
}

/** Plan de referencia del criterio 2: ventana 10:00–18:00 (R8). */
const WINDOW = { ventana_inicio: "10:00:00", ventana_fin: "18:00:00" };

const desayuno = makeMeal({ id: "m-1", position: 1, title: "Desayuno fuerte", hora: "10:00:00" });
const comida = makeMeal({ id: "m-2", position: 2, title: "Comida", hora: "14:00:00" });
const cena = makeMeal({ id: "m-3", position: 3, title: "Cena ligera", hora: "17:00:00" });
const MEALS = [desayuno, comida, cena];

const HM = (text: string): number => {
  const parsed = parseHM(text);
  if (parsed === null) {
    throw new Error(`hora de prueba inválida: ${text}`);
  }
  return parsed;
};

describe("nowLocalHM (R7)", () => {
  it("la zona fija es America/Mexico_City", () => {
    expect(DIET_TIME_ZONE).toBe("America/Mexico_City");
  });

  it("15:00Z → 09:00 en CDMX (UTC−6 todo el año desde 2022)", () => {
    expect(nowLocalHM(new Date("2026-09-10T15:00:00Z"))).toBe("09:00");
  });

  it("05:59Z del día siguiente → 23:59 (no cambia de día ni emite 24:xx)", () => {
    expect(nowLocalHM(new Date("2026-09-11T05:59:00Z"))).toBe("23:59");
  });

  it("06:00Z → 00:00 (medianoche en h23, nunca 24:00)", () => {
    expect(nowLocalHM(new Date("2026-09-11T06:00:00Z"))).toBe("00:00");
  });

  it("sin argumento usa el reloj y devuelve HH:MM", () => {
    expect(nowLocalHM()).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });
});

describe("parseHM", () => {
  it.each([
    ["10:00:00", 600],
    ["10:00", 600],
    ["00:00", 0],
    ["23:59:59", 1439],
    ["9:05", 545],
  ])("%s → %d minutos", (input, expected) => {
    expect(parseHM(input)).toBe(expected);
  });

  it.each([null, "x", "", "25:00", "10:60", "10", "10:0", "diez"])(
    "valor inválido %s → null",
    (input) => {
      expect(parseHM(input)).toBeNull();
    },
  );
});

describe("formatHora (R11)", () => {
  it("recorta los segundos de PostgREST", () => {
    expect(formatHora("10:00:00")).toBe("10:00");
  });

  it("deja HH:MM sin cambios", () => {
    expect(formatHora("10:00")).toBe("10:00");
  });
});

describe("formatMinutes (R11)", () => {
  it.each([
    [0, "0 min"],
    [5, "5 min"],
    [59, "59 min"],
    [60, "60 min"],
    [61, "1 h 1 min"],
    [90, "1 h 30 min"],
    [120, "2 h"],
    [600, "10 h"],
  ])("%d → %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});

describe("sortByPosition (R4)", () => {
  it("ordena por position ascendente", () => {
    const rows = [
      { id: "c", position: 3 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ];
    expect(sortByPosition(rows).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("no muta la entrada", () => {
    const rows = [
      { id: "b", position: 2 },
      { id: "a", position: 1 },
    ];
    const snapshot = rows.map((row) => ({ ...row }));
    sortByPosition(rows);
    expect(rows).toEqual(snapshot);
  });

  it("es estable: empata por id para no reordenar entre renders", () => {
    const rows = [
      { id: "z", position: 1 },
      { id: "a", position: 1 },
    ];
    expect(sortByPosition(rows).map((row) => row.id)).toEqual(["a", "z"]);
    expect(sortByPosition([...rows].reverse()).map((row) => row.id)).toEqual(["a", "z"]);
  });

  it("con lista vacía devuelve lista vacía", () => {
    expect(sortByPosition([])).toEqual([]);
  });
});

describe("getWindowState — tabla de casos del design (R8)", () => {
  it("00:00 → antes, 600 min para Desayuno fuerte", () => {
    expect(getWindowState(WINDOW, MEALS, HM("00:00"))).toEqual({
      kind: "antes",
      opensAt: "10:00",
      minutesToNext: 600,
      nextMeal: desayuno,
    });
  });

  it("09:00 → antes, 60 min para Desayuno fuerte (criterio 2)", () => {
    expect(getWindowState(WINDOW, MEALS, HM("09:00"))).toEqual({
      kind: "antes",
      opensAt: "10:00",
      minutesToNext: 60,
      nextMeal: desayuno,
    });
  });

  it("09:59 → antes, 1 min", () => {
    const state = getWindowState(WINDOW, MEALS, HM("09:59"));
    expect(state.kind).toBe("antes");
    expect(state).toMatchObject({ minutesToNext: 1, nextMeal: desayuno });
  });

  it("10:00 → dentro (límite inclusivo), siguiente Desayuno fuerte", () => {
    expect(getWindowState(WINDOW, MEALS, HM("10:00"))).toEqual({
      kind: "dentro",
      closesAt: "18:00",
      nextMeal: desayuno,
    });
  });

  it("10:01 → dentro, siguiente Comida", () => {
    expect(getWindowState(WINDOW, MEALS, HM("10:01"))).toMatchObject({
      kind: "dentro",
      nextMeal: comida,
    });
  });

  it("14:00 → dentro, siguiente Comida (hora exacta cuenta como siguiente)", () => {
    expect(getWindowState(WINDOW, MEALS, HM("14:00"))).toMatchObject({
      kind: "dentro",
      nextMeal: comida,
    });
  });

  it("17:30 → dentro, sin comidas restantes; cierra a las 18:00", () => {
    expect(getWindowState(WINDOW, MEALS, HM("17:30"))).toEqual({
      kind: "dentro",
      closesAt: "18:00",
      nextMeal: null,
    });
  });

  it("18:00 → despues (límite exclusivo), próxima Desayuno fuerte", () => {
    expect(getWindowState(WINDOW, MEALS, HM("18:00"))).toEqual({
      kind: "despues",
      opensAt: "10:00",
      nextMeal: desayuno,
    });
  });

  it("19:00 → despues (criterio 2)", () => {
    expect(getWindowState(WINDOW, MEALS, HM("19:00"))).toEqual({
      kind: "despues",
      opensAt: "10:00",
      nextMeal: desayuno,
    });
  });

  it("23:59 → despues", () => {
    expect(getWindowState(WINDOW, MEALS, HM("23:59")).kind).toBe("despues");
  });

  it("09:00 sin comidas → antes, 60 min contando a la apertura, nextMeal null", () => {
    expect(getWindowState(WINDOW, [], HM("09:00"))).toEqual({
      kind: "antes",
      opensAt: "10:00",
      minutesToNext: 60,
      nextMeal: null,
    });
  });

  it("19:00 sin comidas → despues con nextMeal null", () => {
    expect(getWindowState(WINDOW, [], HM("19:00"))).toEqual({
      kind: "despues",
      opensAt: "10:00",
      nextMeal: null,
    });
  });

  it("una comida sin hora al principio se ignora: Desayuno fuerte sigue siendo la siguiente", () => {
    const sinHora = makeMeal({ id: "m-0", position: 0, title: "Snack libre", hora: null });
    expect(getWindowState(WINDOW, [sinHora, ...MEALS], HM("09:00"))).toMatchObject({
      kind: "antes",
      nextMeal: desayuno,
    });
  });

  it("una comida con hora mal formada se ignora sin romper", () => {
    const rota = makeMeal({ id: "m-x", position: 0, title: "Rota", hora: "a las diez" });
    expect(getWindowState(WINDOW, [rota, ...MEALS], HM("09:00"))).toMatchObject({
      kind: "antes",
      nextMeal: desayuno,
    });
    expect(getWindowState(WINDOW, [rota], HM("19:00"))).toMatchObject({
      kind: "despues",
      nextMeal: null,
    });
  });

  it("las comidas se evalúan por hora aunque lleguen desordenadas por position", () => {
    expect(getWindowState(WINDOW, [cena, comida, desayuno], HM("19:00"))).toMatchObject({
      nextMeal: desayuno,
    });
    expect(getWindowState(WINDOW, [cena, comida, desayuno], HM("12:00"))).toMatchObject({
      nextMeal: comida,
    });
  });

  it("acepta horas con segundos y sin segundos en la ventana", () => {
    const short = { ventana_inicio: "10:00", ventana_fin: "18:00" };
    expect(getWindowState(short, MEALS, HM("12:00")).kind).toBe("dentro");
  });
});

describe("getWindowState — sin ventana (R9)", () => {
  it("ventana_inicio null → sin_ventana", () => {
    expect(
      getWindowState({ ventana_inicio: null, ventana_fin: "18:00:00" }, MEALS, HM("09:00")),
    ).toEqual({ kind: "sin_ventana" });
  });

  it("ventana_fin null → sin_ventana", () => {
    expect(
      getWindowState({ ventana_inicio: "10:00:00", ventana_fin: null }, MEALS, HM("09:00")),
    ).toEqual({ kind: "sin_ventana" });
  });

  it("ventana mal formada → sin_ventana en lugar de romper", () => {
    expect(
      getWindowState({ ventana_inicio: "diez", ventana_fin: "18:00:00" }, MEALS, HM("09:00")),
    ).toEqual({ kind: "sin_ventana" });
  });
});
