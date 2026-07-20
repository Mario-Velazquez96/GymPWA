import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildInitialRows,
  resolvePrefill,
  validateSet,
  type SetRowState,
  type SetValues,
} from "@/lib/logging";
import type { PlanExercise, WorkoutLog } from "@/lib/types";
import { todayLocalISO } from "@/lib/utils";
import { getPreviousSession, getSessionSets, logSet } from "@/services/logs";

export interface WorkoutLogState {
  /** `true` mientras se cargan sesión anterior + series de hoy. */
  loading: boolean;
  /** Mensaje en español si la carga inicial falló, o `null`. */
  error: string | null;
  /** Sesión anterior del ejercicio para la columna "Anterior" (R2). */
  previous: WorkoutLog[];
  /** Filas de la sección: guardadas hoy + editables hasta target_sets + extra (R1, R8). */
  rows: SetRowState[];
  /** Reintenta la carga inicial tras un error. */
  retry: () => void;
  /** Edita peso/reps de una fila editable; las ediciones del usuario ganan (R3, R4). */
  updateRow: (setNumber: number, values: Partial<SetValues>) => void;
  /** Valida y guarda una fila: un insert exacto por serie (R5, R6, R7, R10). */
  saveRow: (setNumber: number) => Promise<void>;
  /** "Agregar serie": agrega una fila editable al final con su prefill (R1). */
  addRow: () => void;
}

/** Resultado de la carga inicial, etiquetado con la clave id#intento. */
interface LoadedResult {
  key: string;
  error: string | null;
  previous: WorkoutLog[];
}

/**
 * Estado de la sección de registro de un ejercicio del plan: carga en paralelo
 * la sesión anterior (R2) y las series ya guardadas hoy (R8), inicializa las
 * filas con la cadena de prefill (R1, R3) y gobierna la máquina de estados por
 * fila. El guard de doble-tap es un `Set` síncrono en ref: dos taps antes del
 * re-render no pueden producir dos inserts (R10).
 */
export function useWorkoutLog(planExercise: PlanExercise): WorkoutLogState {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadedResult | null>(null);
  const [rows, setRows] = useState<SetRowState[]>([]);

  const key = `${planExercise.id}#${attempt}`;
  const { id: planExerciseId, exercise_id, target_sets, target_reps } = planExercise;

  // Espejo de `rows` para que saveRow lea el estado vigente sin closures viejos.
  const rowsRef = useRef<SetRowState[]>(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Guard síncrono de inserts en vuelo por set_number (R10).
  const inFlight = useRef<Set<number>>(new Set());

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const today = todayLocalISO();
      const [previousResult, todayResult] = await Promise.all([
        getPreviousSession(exercise_id, today),
        getSessionSets(exercise_id, today),
      ]);
      if (!active) {
        return;
      }

      const loadError = previousResult.error ?? todayResult.error;
      if (loadError !== null) {
        setLoaded({ key, error: loadError, previous: [] });
        return;
      }

      // Con error null el patrón Result garantiza data no nula en ambos.
      const previous = previousResult.data ?? [];
      const saved = todayResult.data ?? [];
      setRows(
        buildInitialRows({
          targetSets: target_sets,
          targetReps: target_reps,
          previous,
          saved,
        }),
      );
      setLoaded({ key, error: null, previous });
    })();

    return () => {
      active = false;
    };
  }, [key, exercise_id, target_sets, target_reps]);

  const patchRow = useCallback((setNumber: number, patch: Partial<SetRowState>): void => {
    setRows((current) =>
      current.map((row) => (row.setNumber === setNumber ? { ...row, ...patch } : row)),
    );
  }, []);

  const updateRow = useCallback(
    (setNumber: number, values: Partial<SetValues>): void => {
      const row = rowsRef.current.find((candidate) => candidate.setNumber === setNumber);
      if (row === undefined || row.status === "saving" || row.status === "saved") {
        return;
      }
      patchRow(setNumber, { ...values, status: "editable", message: null });
    },
    [patchRow],
  );

  const saveRow = useCallback(
    async (setNumber: number): Promise<void> => {
      if (inFlight.current.has(setNumber)) {
        return; // R10: ya hay un insert en vuelo para esta serie
      }
      const row = rowsRef.current.find((candidate) => candidate.setNumber === setNumber);
      if (row === undefined || row.status === "saving" || row.status === "saved") {
        return;
      }

      const violation = validateSet({ weight_kg: row.weight_kg, reps: row.reps });
      if (violation !== null) {
        patchRow(setNumber, { status: "error", message: violation }); // R7
        return;
      }

      inFlight.current.add(setNumber);
      patchRow(setNumber, { status: "saving", message: null });

      const result = await logSet({
        exercise_id,
        plan_exercise_id: planExerciseId,
        performed_at: todayLocalISO(), // fecha local del dispositivo, nunca el default de la BD
        set_number: setNumber,
        reps: row.reps,
        weight_kg: row.weight_kg,
      });

      inFlight.current.delete(setNumber);

      if (result.error !== null) {
        patchRow(setNumber, { status: "error", message: result.error }); // R6: valores intactos
        return;
      }

      patchRow(setNumber, {
        status: "saved",
        message: null,
        weight_kg: result.data.weight_kg,
        reps: result.data.reps,
      });
    },
    [exercise_id, planExerciseId, patchRow],
  );

  const addRow = useCallback((): void => {
    const previous = loaded?.error === null ? loaded.previous : [];
    setRows((current) => {
      const last = current[current.length - 1] ?? null;
      const setNumber = (last?.setNumber ?? 0) + 1;
      const prefill = resolvePrefill({
        setNumber,
        previous,
        priorRow: last !== null ? { weight_kg: last.weight_kg, reps: last.reps } : null,
        targetReps: target_reps,
      });
      return [...current, { setNumber, ...prefill, status: "editable", message: null }];
    });
  }, [loaded, target_reps]);

  const settled = loaded !== null && loaded.key === key;

  return {
    loading: !settled,
    error: settled ? loaded.error : null,
    previous: settled && loaded.error === null ? loaded.previous : [],
    rows: settled && loaded.error === null ? rows : [],
    retry,
    updateRow,
    saveRow,
    addRow,
  };
}
