/**
 * Unidades de peso (08_weight_units): conversión, formato, validación y
 * persistencia de la preferencia por ejercicio. Módulo PURO — sin React y sin
 * acceso a datos.
 *
 * Regla de oro: **el almacenamiento sigue siendo canónico en kg**
 * (`workout_logs.weight_kg` es el contrato con el repo `Gym`). Las libras son
 * exclusivamente un asunto de entrada y presentación (R14).
 */

/** Unidad con la que el usuario captura y lee el peso de un ejercicio. */
export type WeightUnit = "kg" | "lb";

/** Factor exacto (definición internacional de la libra avoirdupois) (R7). */
export const LB_IN_KG = 0.45359237;

/** Paso del stepper de peso por unidad: ±2.5 kg / ±5 lb (R4). */
export const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

/** Rejilla mínima de entrada por unidad: 0.5 kg / 0.1 lb (R5, R9). */
export const WEIGHT_GRAIN: Record<WeightUnit, number> = { kg: 0.5, lb: 0.1 };

/** Decimales con los que se presenta cada unidad (R7). */
const DECIMALS: Record<WeightUnit, number> = { kg: 2, lb: 1 };

/** Tolerancia del check de rejilla, para absorber el ruido del binario flotante. */
const GRID_EPSILON = 1e-9;

/** Detalles solo en consola de desarrollo, nunca en la UI (R13). */
function debugUnits(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[units]", ...details);
  }
}

/** Redondeo a `decimals` decimales; propaga NaN/Infinity sin disfrazarlos. */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Valor expresado en `unit` → kg canónico redondeado a 2 decimales, compatible
 * con `numeric(6,2)` y con el check `weight_kg >= 0` (R7, R14).
 * `45 lb → 20.41 kg`.
 */
export function toKg(value: number, unit: WeightUnit): number {
  return roundTo(unit === "lb" ? value * LB_IN_KG : value, 2);
}

/**
 * kg canónico → valor en `unit`, con la precisión de esa unidad (2 decimales en
 * kg, 1 en lb) (R7). `20.41 kg → 45 lb` (no "45.0001").
 */
export function fromKg(kg: number, unit: WeightUnit): number {
  return roundTo(unit === "lb" ? kg / LB_IN_KG : kg, DECIMALS[unit]);
}

/**
 * Cuantiza a la rejilla de display de su unidad lo que el usuario teclea (R5):
 * en lb, 45.37 → 45.4; en kg se conserva el comportamiento de 05 tal cual (la
 * regla de 0.5 kg la aplica la validación, no la entrada).
 */
export function quantize(value: number, unit: WeightUnit): number {
  return unit === "lb" ? roundTo(value, DECIMALS.lb) : value;
}

/**
 * Peso canónico en kg → texto en la unidad activa, sin ceros de cola (R6, R7):
 * `formatWeight(22.5, "kg")` → "22.5 kg"; `formatWeight(20.41, "lb")` →
 * "45 lb"; con `{ withUnit: false }` devuelve solo el número.
 */
export function formatWeight(
  kg: number,
  unit: WeightUnit,
  options?: { withUnit?: boolean },
): string {
  const value = String(fromKg(kg, unit));
  return options?.withUnit === false ? value : `${value} ${unit}`;
}

/** `true` si `value` cae sobre la rejilla `grain` (con tolerancia flotante). */
function isOnGrid(value: number, grain: number): boolean {
  const steps = value / grain;
  return Math.abs(steps - Math.round(steps)) < GRID_EPSILON;
}

/**
 * Valida un peso EXPRESADO EN `unit` (R9). Devuelve el mensaje en español de la
 * primera violación, o `null`. En lb NO se aplica la regla de 0.5 kg: 45 lb =
 * 20.41 kg es un peso válido aunque no sea múltiplo de medio kilo.
 */
export function validateWeight(value: number, unit: WeightUnit): string | null {
  if (!Number.isFinite(value) || value < 0) {
    return "El peso no puede ser negativo";
  }
  if (!isOnGrid(value, WEIGHT_GRAIN[unit])) {
    return `El peso debe ir en pasos de ${WEIGHT_GRAIN[unit]} ${unit}`;
  }
  return null;
}

/* ── Persistencia de la preferencia por ejercicio (R2, R3, R13) ───────────── */

/** Prefijo de la clave en `localStorage`: `gym:unit:<exercise_id>` (R2). */
export const UNIT_STORAGE_PREFIX = "gym:unit:";

/**
 * `localStorage` o `null` si el entorno no lo expone o lanza al accederlo
 * (Safari en privado con datos bloqueados lanza en el propio getter) (R13).
 */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch (thrown: unknown) {
    debugUnits("localStorage no accesible:", thrown);
    return null;
  }
}

/**
 * Unidad guardada del ejercicio. Sin valor, con valor corrupto o con un
 * `localStorage` que lanza → **kg** (R3, R13).
 */
export function readExerciseUnit(exerciseId: string): WeightUnit {
  try {
    const raw = storage()?.getItem(`${UNIT_STORAGE_PREFIX}${exerciseId}`) ?? null;
    return raw === "lb" ? "lb" : "kg";
  } catch (thrown: unknown) {
    debugUnits("lectura de la unidad falló:", thrown);
    return "kg";
  }
}

/**
 * Guarda la unidad del ejercicio best-effort: si `localStorage` lanza (cuota,
 * modo privado) el fallo se traga y la app sigue — el toggle mantiene la unidad
 * en memoria durante la sesión (R13).
 */
export function writeExerciseUnit(exerciseId: string, unit: WeightUnit): void {
  try {
    storage()?.setItem(`${UNIT_STORAGE_PREFIX}${exerciseId}`, unit);
  } catch (thrown: unknown) {
    debugUnits("escritura de la unidad falló:", thrown);
  }
}
