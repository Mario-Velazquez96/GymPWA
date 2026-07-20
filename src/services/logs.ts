import { supabase } from "@/lib/supabase";
import type { WorkoutLog } from "@/lib/types";
import type { Result } from "@/services/plans";

/**
 * Único servicio con escrituras de toda la app, y escribe SOLO `workout_logs`
 * (R9). Lecturas: sesión anterior (comparación "Anterior", R2) y series ya
 * guardadas hoy (reapertura el mismo día, R8). Escritura: un insert por serie
 * guardada (R5).
 */

/** Mensaje de fallo al cargar sesión anterior / series de hoy (R2, R8). */
export const LOGS_ERROR_LOAD = "No se pudieron cargar las series";

/** Mensaje de fallo al guardar una serie — la fila queda editable (R6). */
export const LOGS_ERROR_SAVE = "No se pudo guardar la serie, reintenta";

/** Payload de inserción de una serie; `user_id` lo agrega el servicio (R5). */
export interface NewLog {
  exercise_id: string;
  plan_exercise_id: string | null;
  performed_at: string; // "YYYY-MM-DD" — SIEMPRE fecha local del dispositivo
  set_number: number;
  reps: number;
  weight_kg: number;
}

/** Detalles del error solo en consola de desarrollo, nunca en la UI. */
function debugLogs(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[logs]", ...details);
  }
}

/**
 * Sesión anterior de un ejercicio: filas del `performed_at` más reciente
 * ESTRICTAMENTE anterior a `beforeISO` (§3.5, R2). Se piden hasta 10 filas
 * ordenadas por fecha desc + serie asc y se filtra en cliente a las de la
 * fecha máxima devuelta ("la última sesión"). Sin historial → lista vacía.
 */
export async function getPreviousSession(
  exerciseId: string,
  beforeISO: string,
): Promise<Result<WorkoutLog[]>> {
  if (supabase === null) {
    debugLogs("cliente supabase no configurado");
    return { data: null, error: LOGS_ERROR_LOAD };
  }

  try {
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("exercise_id", exerciseId)
      .lt("performed_at", beforeISO)
      .order("performed_at", { ascending: false })
      .order("set_number", { ascending: true })
      .limit(10);

    if (error !== null) {
      debugLogs("getPreviousSession falló:", error);
      return { data: null, error: LOGS_ERROR_LOAD };
    }

    const rows = (data ?? []) as WorkoutLog[];
    if (rows.length === 0) {
      return { data: [], error: null };
    }

    const lastDate = rows[0].performed_at;
    return { data: rows.filter((row) => row.performed_at === lastDate), error: null };
  } catch (thrown: unknown) {
    debugLogs("getPreviousSession lanzó excepción:", thrown);
    return { data: null, error: LOGS_ERROR_LOAD };
  }
}

/**
 * Series ya guardadas de un ejercicio en una fecha local exacta, ordenadas por
 * `set_number` — al reabrir la pantalla el mismo día se renderizan como filas
 * guardadas (R8).
 */
export async function getSessionSets(
  exerciseId: string,
  isoDate: string,
): Promise<Result<WorkoutLog[]>> {
  if (supabase === null) {
    debugLogs("cliente supabase no configurado");
    return { data: null, error: LOGS_ERROR_LOAD };
  }

  try {
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("exercise_id", exerciseId)
      .eq("performed_at", isoDate)
      .order("set_number", { ascending: true });

    if (error !== null) {
      debugLogs("getSessionSets falló:", error);
      return { data: null, error: LOGS_ERROR_LOAD };
    }

    return { data: (data ?? []) as WorkoutLog[], error: null };
  } catch (thrown: unknown) {
    debugLogs("getSessionSets lanzó excepción:", thrown);
    return { data: null, error: LOGS_ERROR_LOAD };
  }
}

/**
 * Inserta EXACTAMENTE una fila en `workout_logs` con el `user_id` de la sesión
 * viva (RLS `with check` rechaza cualquier otro) y devuelve la fila confirmada
 * (R5). Sin optimismo: la serie solo se marca guardada con respuesta OK; en
 * fallo el caller conserva los valores y puede reintentar (R6).
 */
export async function logSet(input: NewLog): Promise<Result<WorkoutLog>> {
  if (supabase === null) {
    debugLogs("cliente supabase no configurado");
    return { data: null, error: LOGS_ERROR_SAVE };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (sessionError !== null || userId === undefined) {
      debugLogs("logSet sin sesión activa:", sessionError);
      return { data: null, error: LOGS_ERROR_SAVE };
    }

    const { data, error } = await supabase
      .from("workout_logs")
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error !== null) {
      debugLogs("logSet falló:", error);
      return { data: null, error: LOGS_ERROR_SAVE };
    }

    return { data: data as WorkoutLog, error: null };
  } catch (thrown: unknown) {
    debugLogs("logSet lanzó excepción:", thrown);
    return { data: null, error: LOGS_ERROR_SAVE };
  }
}
