import { supabase } from "@/lib/supabase";
import type { PlanExerciseDetail } from "@/lib/types";
import type { Result } from "@/services/plans";

/** Mensaje único de fallo de carga para la pantalla Ejercicio (R9). */
export const EXERCISES_ERROR_LOAD = "No se pudo cargar el ejercicio";

/**
 * Código Postgres "invalid text representation": el id de la URL no es un
 * uuid válido. Se trata como "no existe" para que un id chatarra caiga en el
 * estado "Ejercicio no encontrado" y no en el de error (R7).
 */
const PG_INVALID_TEXT = "22P02";

/** Detalles del error solo en consola de desarrollo, nunca en la UI. */
function debugExercises(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[exercises]", ...details);
  }
}

/**
 * Detalle de un ejercicio del plan: fila de `plan_exercises` con su fila
 * completa de `exercises` embebida (R1). `maybeSingle` → `data: null` sin
 * error cubre por igual ids inexistentes y filas filtradas por RLS de otro
 * usuario (R7); ambos caminos renderizan "Ejercicio no encontrado".
 */
export async function getPlanExerciseDetail(
  planExerciseId: string,
): Promise<Result<PlanExerciseDetail | null>> {
  if (supabase === null) {
    debugExercises("cliente supabase no configurado");
    return { data: null, error: EXERCISES_ERROR_LOAD };
  }

  try {
    const { data, error } = await supabase
      .from("plan_exercises")
      .select("*, exercises(*)")
      .eq("id", planExerciseId)
      .maybeSingle();

    if (error !== null) {
      if (error.code === PG_INVALID_TEXT) {
        debugExercises("getPlanExerciseDetail id no-uuid → no encontrado:", planExerciseId);
        return { data: null, error: null };
      }
      debugExercises("getPlanExerciseDetail falló:", error);
      return { data: null, error: EXERCISES_ERROR_LOAD };
    }

    return { data: data as PlanExerciseDetail | null, error: null };
  } catch (thrown: unknown) {
    debugExercises("getPlanExerciseDetail lanzó excepción:", thrown);
    return { data: null, error: EXERCISES_ERROR_LOAD };
  }
}
