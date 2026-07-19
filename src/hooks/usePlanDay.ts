import { useCallback, useEffect, useState } from "react";
import type { Plan, PlanDay, PlanExerciseWithExercise } from "@/lib/types";
import { getActivePlan, getDayExercises, getPlanDay } from "@/services/plans";

export interface PlanDayState {
  /** `true` mientras se resuelven las consultas de la fecha seleccionada (R8). */
  loading: boolean;
  /** Mensaje en español si alguna consulta falló, o `null` (R8). */
  error: string | null;
  /** Plan activo, o `null` si no hay (R5) — solo significativo con `loading: false`. */
  plan: Plan | null;
  /** Día del plan para la fecha, o `null` si la fecha no tiene día asignado (R4). */
  day: PlanDay | null;
  /** Ejercicios del día ordenados por `position`; vacío en descanso/sin día (R1, R3). */
  exercises: PlanExerciseWithExercise[];
}

/** Resultado de una carga completa, etiquetado con la clave fecha#intento. */
interface LoadedResult {
  key: string;
  error: string | null;
  plan: Plan | null;
  day: PlanDay | null;
  exercises: PlanExerciseWithExercise[];
}

/**
 * Compone las tres consultas de la pantalla Hoy por fecha seleccionada
 * (R1, R8): plan activo → día del plan → ejercicios del día. Corta temprano
 * en "sin plan", "sin día" y "descanso" (no pide ejercicios que no se
 * mostrarán). `loading` se deriva de comparar la clave de la carga vigente con
 * la última resuelta (sin setState síncrono en el efecto). `retry` repite la
 * carga completa tras un error.
 */
export function usePlanDay(selectedDate: string): PlanDayState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadedResult | null>(null);

  const key = `${selectedDate}#${attempt}`;

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const finish = (partial: Omit<LoadedResult, "key">): void => {
      if (active) {
        setResult({ key, ...partial });
      }
    };

    void (async () => {
      const planResult = await getActivePlan();
      if (!active) {
        return;
      }
      if (planResult.error !== null) {
        finish({ error: planResult.error, plan: null, day: null, exercises: [] });
        return;
      }

      const plan = planResult.data;
      if (plan === null) {
        finish({ error: null, plan: null, day: null, exercises: [] });
        return;
      }

      const dayResult = await getPlanDay(plan.id, selectedDate);
      if (!active) {
        return;
      }
      if (dayResult.error !== null) {
        finish({ error: dayResult.error, plan, day: null, exercises: [] });
        return;
      }

      const day = dayResult.data;
      if (day === null || day.is_rest) {
        finish({ error: null, plan, day, exercises: [] });
        return;
      }

      const exercisesResult = await getDayExercises(day.id);
      if (!active) {
        return;
      }
      if (exercisesResult.error !== null) {
        finish({ error: exercisesResult.error, plan, day, exercises: [] });
        return;
      }

      finish({ error: null, plan, day, exercises: exercisesResult.data });
    })();

    return () => {
      active = false;
    };
  }, [key, selectedDate]);

  if (result === null || result.key !== key) {
    // Carga en curso: se conserva el plan previo para no desmontar la
    // navegación de días al cambiar de fecha (R6).
    return {
      loading: true,
      error: null,
      plan: result?.plan ?? null,
      day: null,
      exercises: [],
      retry,
    };
  }

  return {
    loading: false,
    error: result.error,
    plan: result.plan,
    day: result.day,
    exercises: result.exercises,
    retry,
  };
}
