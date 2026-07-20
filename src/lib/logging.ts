import type { WorkoutLog } from "@/lib/types";

/**
 * Lógica pura del registro de series (05_workout_logging): validación (R7),
 * cadena de prefill (R3) y construcción inicial de filas (R1, R8). Sin acceso
 * a datos ni a React — unit-testeable al 100%.
 */

/** Paso del stepper de peso (R4). */
export const WEIGHT_STEP_KG = 2.5;
/** Paso del stepper de repeticiones (R4). */
export const REPS_STEP = 1;
/** Fallback de reps cuando `target_reps` no trae ningún número (R3). */
export const DEFAULT_REPS = 10;

/** Valores editables de una serie. */
export interface SetValues {
  weight_kg: number;
  reps: number;
}

/** Máquina de estados por fila: editable → saving → saved | error (design). */
export type SetRowStatus = "editable" | "saving" | "saved" | "error";

/** Estado de una fila de serie en la sección de registro. */
export interface SetRowState extends SetValues {
  setNumber: number;
  status: SetRowStatus;
  /** Mensaje inline en español (validación R7 o fallo de guardado R6). */
  message: string | null;
}

/** "22.5" / "20" — peso en kg sin ceros de cola (formato consistente en la app). */
export function formatKg(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Primer número de `target_reps` ("8-12" → 8, "5" → 5); `null` si no hay
 * número utilizable ("al fallo") o si es < 1 (R3).
 */
export function firstNumber(text: string): number | null {
  const match = /\d+/.exec(text);
  if (match === null) {
    return null;
  }
  const parsed = Number.parseInt(match[0], 10);
  return parsed >= 1 ? parsed : null;
}

/**
 * Validación cliente antes del insert (R7): peso ≥ 0 en pasos de 0.5 kg y
 * reps entero ≥ 1. Devuelve el mensaje en español de la primera violación, o
 * `null` si los valores son válidos. Los checks de la BD (01) son el respaldo.
 */
export function validateSet({ weight_kg, reps }: SetValues): string | null {
  if (!Number.isFinite(weight_kg) || weight_kg < 0) {
    return "El peso no puede ser negativo";
  }
  if (!Number.isInteger(weight_kg * 2)) {
    return "El peso debe ir en pasos de 0.5 kg";
  }
  if (!Number.isInteger(reps) || reps < 1) {
    return "Las repeticiones deben ser un entero de 1 o más";
  }
  return null;
}

export interface PrefillArgs {
  /** Número de serie (1, 2, 3…) de la fila que se inicializa. */
  setNumber: number;
  /** Filas de la sesión anterior del ejercicio (puede ser vacía). */
  previous: WorkoutLog[];
  /** Valores actuales de la fila n−1 en la UI, o `null` si no hay. */
  priorRow: SetValues | null;
  /** `target_reps` del plan ("8-12", "al fallo", …). */
  targetReps: string;
}

/**
 * Cadena de prefill (R3): serie n de la sesión anterior → valores de la fila
 * n−1 de la sesión actual → { peso 0 kg, reps = primer número de target_reps,
 * fallback 10 }. Se computa una sola vez al inicializar; después ganan las
 * ediciones del usuario.
 */
export function resolvePrefill({
  setNumber,
  previous,
  priorRow,
  targetReps,
}: PrefillArgs): SetValues {
  const match = previous.find((log) => log.set_number === setNumber);
  if (match !== undefined) {
    return { weight_kg: match.weight_kg, reps: match.reps };
  }
  if (priorRow !== null) {
    return { weight_kg: priorRow.weight_kg, reps: priorRow.reps };
  }
  return { weight_kg: 0, reps: firstNumber(targetReps) ?? DEFAULT_REPS };
}

export interface InitialRowsArgs {
  /** `target_sets` del plan (R1). */
  targetSets: number;
  /** `target_reps` del plan, para el fallback del prefill (R3). */
  targetReps: string;
  /** Sesión anterior del ejercicio (R2, R3). */
  previous: WorkoutLog[];
  /** Series ya guardadas HOY para el ejercicio (R8). */
  saved: WorkoutLog[];
}

/**
 * Filas iniciales de la sección (R1, R8): las series guardadas hoy (ordenadas
 * por `set_number`, estado `saved`) seguidas de filas editables hasta
 * `target_sets`, cada una con su prefill (R3). Las filas extra las agrega el
 * usuario con "Agregar serie".
 */
export function buildInitialRows({
  targetSets,
  targetReps,
  previous,
  saved,
}: InitialRowsArgs): SetRowState[] {
  const rows: SetRowState[] = [...saved]
    .sort((a, b) => a.set_number - b.set_number)
    .map((log) => ({
      setNumber: log.set_number,
      weight_kg: log.weight_kg,
      reps: log.reps,
      status: "saved",
      message: null,
    }));

  const firstEditable = (rows[rows.length - 1]?.setNumber ?? 0) + 1;
  for (let setNumber = firstEditable; setNumber <= targetSets; setNumber += 1) {
    const prior = rows[rows.length - 1] ?? null;
    const prefill = resolvePrefill({
      setNumber,
      previous,
      priorRow: prior !== null ? { weight_kg: prior.weight_kg, reps: prior.reps } : null,
      targetReps,
    });
    rows.push({ setNumber, ...prefill, status: "editable", message: null });
  }

  return rows;
}
