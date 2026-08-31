import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LB_IN_KG,
  UNIT_STORAGE_PREFIX,
  WEIGHT_GRAIN,
  WEIGHT_STEP,
  formatWeight,
  fromKg,
  quantize,
  readExerciseUnit,
  toKg,
  validateWeight,
  writeExerciseUnit,
} from "@/lib/units";

/** Pesos de placa/mancuerna habituales en un gym, en libras (R8). */
const COMMON_LB = [0, 2.5, 5, 10, 20, 25, 35, 45, 50, 70, 90, 95, 100, 135, 185, 225, 315];
/** Pesos habituales en kilogramos (R8). */
const COMMON_KG = [0, 2.5, 5, 10, 20, 22.5, 40, 60, 100];

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("constantes de unidad (R4, R5, R7)", () => {
  it("el factor es el exacto de la libra avoirdupois", () => {
    expect(LB_IN_KG).toBe(0.45359237);
  });

  it("el stepper avanza ±2.5 kg y ±5 lb", () => {
    expect(WEIGHT_STEP).toEqual({ kg: 2.5, lb: 5 });
  });

  it("la rejilla de entrada es 0.5 kg y 0.1 lb", () => {
    expect(WEIGHT_GRAIN).toEqual({ kg: 0.5, lb: 0.1 });
  });
});

describe("toKg / fromKg — conversión y redondeo (R7)", () => {
  it("el caso del contrato: 45 lb → 20.41 kg → 45 lb", () => {
    expect(toKg(45, "lb")).toBe(20.41);
    expect(fromKg(20.41, "lb")).toBe(45);
    expect(formatWeight(20.41, "lb")).toBe("45 lb");
  });

  it.each([
    [0, 0],
    [2.5, 1.13],
    [5, 2.27],
    [10, 4.54],
    [45, 20.41],
    [100, 45.36],
    [135, 61.23],
    [225, 102.06],
  ])("toKg(%d lb) = %d kg (2 decimales)", (lb, kg) => {
    expect(toKg(lb, "lb")).toBe(kg);
  });

  it("en kg toKg/fromKg solo normalizan a 2 decimales, no convierten", () => {
    expect(toKg(22.5, "kg")).toBe(22.5);
    expect(fromKg(22.5, "kg")).toBe(22.5);
    expect(toKg(22.499, "kg")).toBe(22.5);
  });

  it("22.5 kg se lee como 49.6 lb", () => {
    expect(fromKg(22.5, "lb")).toBe(49.6);
  });

  it("propaga los valores no finitos sin disfrazarlos", () => {
    expect(Number.isNaN(toKg(Number.NaN, "lb"))).toBe(true);
    expect(fromKg(Number.POSITIVE_INFINITY, "lb")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("ida y vuelta estable (R8)", () => {
  it.each(COMMON_LB)("lb → kg → lb devuelve exactamente %d lb", (lb) => {
    expect(fromKg(toKg(lb, "lb"), "lb")).toBe(lb);
  });

  it.each(COMMON_LB)("%d lb se formatea sin cola de decimales espurios", (lb) => {
    expect(formatWeight(toKg(lb, "lb"), "lb")).toBe(`${lb} lb`);
  });

  it.each(COMMON_KG)("kg → display → kg devuelve exactamente %d kg", (kg) => {
    expect(toKg(fromKg(kg, "kg"), "kg")).toBe(kg);
  });

  it("toda la rejilla de 0.1 lb entre 0 y 320 lb sobrevive el ida y vuelta", () => {
    for (let tenths = 0; tenths <= 3200; tenths += 1) {
      const lb = tenths / 10;
      expect(fromKg(toKg(lb, "lb"), "lb")).toBe(lb);
    }
  });

  it("dos valores contiguos de la rejilla nunca colapsan en el mismo kg", () => {
    expect(toKg(45, "lb")).not.toBe(toKg(45.1, "lb"));
  });
});

describe("quantize — entrada directa (R5)", () => {
  it.each([
    [45, 45],
    [45.37, 45.4],
    [45.34, 45.3],
    [0.04, 0],
  ])("en lb cuantiza %d → %d", (value, expected) => {
    expect(quantize(value, "lb")).toBe(expected);
  });

  it("en kg no cuantiza: conserva el valor tecleado (comportamiento de 05)", () => {
    expect(quantize(22.3, "kg")).toBe(22.3);
    expect(quantize(10.25, "kg")).toBe(10.25);
  });

  it("45.37 lb tecleado termina en 20.59 kg almacenados", () => {
    expect(toKg(quantize(45.37, "lb"), "lb")).toBe(20.59);
  });
});

describe("formatWeight (R6, R7)", () => {
  it.each([
    [22.5, "kg", "22.5 kg"],
    [20, "kg", "20 kg"],
    [0, "kg", "0 kg"],
    [102.75, "kg", "102.75 kg"],
    [20.41, "lb", "45 lb"],
    [22.5, "lb", "49.6 lb"],
    [0, "lb", "0 lb"],
  ] as const)("formatWeight(%d, '%s') = '%s'", (kg, unit, expected) => {
    expect(formatWeight(kg, unit)).toBe(expected);
  });

  it("con { withUnit: false } devuelve solo el número", () => {
    expect(formatWeight(22.5, "kg", { withUnit: false })).toBe("22.5");
    expect(formatWeight(20.41, "lb", { withUnit: false })).toBe("45");
  });

  it("un entero nunca arrastra ceros de cola", () => {
    expect(formatWeight(45.36, "lb")).toBe("100 lb");
    expect(formatWeight(40, "kg")).toBe("40 kg");
  });
});

describe("validateWeight — matriz por unidad (R9)", () => {
  it.each([
    [22.5, "kg"],
    [0, "kg"],
    [0.5, "kg"],
    [200, "kg"],
    [45, "lb"],
    [0, "lb"],
    [2.5, "lb"],
    [45.4, "lb"],
  ] as const)("acepta %d %s", (value, unit) => {
    expect(validateWeight(value, unit)).toBeNull();
  });

  it.each([
    [-2.5, "kg", "El peso no puede ser negativo"],
    [Number.NaN, "kg", "El peso no puede ser negativo"],
    [Number.POSITIVE_INFINITY, "kg", "El peso no puede ser negativo"],
    [22.3, "kg", "El peso debe ir en pasos de 0.5 kg"],
    [10.25, "kg", "El peso debe ir en pasos de 0.5 kg"],
    [-5, "lb", "El peso no puede ser negativo"],
    [Number.NaN, "lb", "El peso no puede ser negativo"],
    [45.37, "lb", "El peso debe ir en pasos de 0.1 lb"],
    [0.05, "lb", "El peso debe ir en pasos de 0.1 lb"],
  ] as const)("rechaza %d %s con mensaje en español", (value, unit, message) => {
    expect(validateWeight(value, unit)).toBe(message);
  });

  it("20.41 (45 lb) es válido leído en lb e inválido leído en kg", () => {
    expect(validateWeight(fromKg(20.41, "lb"), "lb")).toBeNull();
    expect(validateWeight(20.41, "kg")).toBe("El peso debe ir en pasos de 0.5 kg");
  });
});

describe("persistencia de la preferencia (R2, R3, R13)", () => {
  it("sin valor guardado la unidad es kg", () => {
    expect(readExerciseUnit("0001")).toBe("kg");
  });

  it("escribe y relee la unidad bajo la clave gym:unit:<exercise_id>", () => {
    writeExerciseUnit("0003", "lb");

    expect(localStorage.getItem(`${UNIT_STORAGE_PREFIX}0003`)).toBe("lb");
    expect(readExerciseUnit("0003")).toBe("lb");
  });

  it("la preferencia es por ejercicio: no contamina a los demás", () => {
    writeExerciseUnit("0003", "lb");

    expect(readExerciseUnit("0003")).toBe("lb");
    expect(readExerciseUnit("0001")).toBe("kg");
  });

  it("volver a kg sobrescribe el valor guardado", () => {
    writeExerciseUnit("0003", "lb");
    writeExerciseUnit("0003", "kg");

    expect(readExerciseUnit("0003")).toBe("kg");
  });

  it.each([["libras"], [""], ["LB"], ["null"], ["{}"]])(
    "un valor corrupto ('%s') se lee como kg (R3)",
    (raw) => {
      localStorage.setItem(`${UNIT_STORAGE_PREFIX}0003`, raw);

      expect(readExerciseUnit("0003")).toBe("kg");
    },
  );

  it("si getItem lanza, la lectura devuelve kg sin propagar (R13)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: acceso a almacenamiento bloqueado");
    });

    expect(readExerciseUnit("0003")).toBe("kg");
  });

  it("si setItem lanza, la escritura se traga el fallo sin propagar (R13)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writeExerciseUnit("0003", "lb")).not.toThrow();
  });

  it("sin localStorage en el entorno, lectura = kg y escritura inocua (R13)", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(readExerciseUnit("0003")).toBe("kg");
    expect(() => writeExerciseUnit("0003", "lb")).not.toThrow();

    vi.unstubAllGlobals();
  });
});

describe("persistencia con el propio localStorage inaccesible (R13)", () => {
  /** Reemplaza `globalThis.localStorage` por un getter que lanza (Safari privado). */
  function withThrowingStorageGetter(run: () => void): void {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: el acceso a localStorage está bloqueado");
      },
    });
    try {
      run();
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(globalThis, "localStorage");
      } else {
        Object.defineProperty(globalThis, "localStorage", original);
      }
    }
  }

  it("si el propio acceso a localStorage lanza, la lectura cae a kg y la escritura no propaga", () => {
    withThrowingStorageGetter(() => {
      expect(readExerciseUnit("0003")).toBe("kg");
      expect(() => writeExerciseUnit("0003", "lb")).not.toThrow();
    });

    // Restaurado el entorno, el almacenamiento vuelve a funcionar con normalidad.
    writeExerciseUnit("0003", "lb");
    expect(readExerciseUnit("0003")).toBe("lb");
  });
});
