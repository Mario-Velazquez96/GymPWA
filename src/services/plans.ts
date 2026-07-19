import { supabase } from "@/lib/supabase";
import type { Plan, PlanDay, PlanExerciseWithExercise } from "@/lib/types";

/**
 * Patrón de resultado uniforme para services (R9): éxito con `data` tipada o
 * fallo con mensaje en español listo para la UI — nunca el error crudo.
 */
export type Result<T> = { data: T; error: null } | { data: null; error: string };

/** Mensaje único de fallo de carga para la pantalla Hoy (R8). */
export const PLANS_ERROR_LOAD = "No se pudo cargar la rutina";

/** Detalles del error solo en consola de desarrollo, nunca en la UI. */
function debugPlans(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[plans]", ...details);
  }
}

/**
 * Plan con `status = 'active'` del usuario autenticado (RLS acota las filas a
 * `auth.uid()`). `data: null` sin error = no hay plan activo (R5).
 */
export async function getActivePlan(): Promise<Result<Plan | null>> {
  if (supabase === null) {
    debugPlans("cliente supabase no configurado");
    return { data: null, error: PLANS_ERROR_LOAD };
  }

  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("status", "active")
      .limit(1);

    if (error !== null) {
      debugPlans("getActivePlan falló:", error);
      return { data: null, error: PLANS_ERROR_LOAD };
    }

    const rows = (data ?? []) as Plan[];
    return { data: rows[0] ?? null, error: null };
  } catch (thrown: unknown) {
    debugPlans("getActivePlan lanzó excepción:", thrown);
    return { data: null, error: PLANS_ERROR_LOAD };
  }
}

/**
 * Día del plan para una fecha ISO local ("YYYY-MM-DD"). `data: null` sin
 * error = fecha sin `plan_day` asignado (R4).
 */
export async function getPlanDay(planId: string, isoDate: string): Promise<Result<PlanDay | null>> {
  if (supabase === null) {
    debugPlans("cliente supabase no configurado");
    return { data: null, error: PLANS_ERROR_LOAD };
  }

  try {
    const { data, error } = await supabase
      .from("plan_days")
      .select("*")
      .eq("plan_id", planId)
      .eq("day_date", isoDate)
      .maybeSingle();

    if (error !== null) {
      debugPlans("getPlanDay falló:", error);
      return { data: null, error: PLANS_ERROR_LOAD };
    }

    return { data: data as PlanDay | null, error: null };
  } catch (thrown: unknown) {
    debugPlans("getPlanDay lanzó excepción:", thrown);
    return { data: null, error: PLANS_ERROR_LOAD };
  }
}

/**
 * Ejercicios del día ordenados por `position`, con el join a `exercises`
 * (nombre, thumbnail, equipo, músculo objetivo) para las cards (R1).
 */
export async function getDayExercises(
  planDayId: string,
): Promise<Result<PlanExerciseWithExercise[]>> {
  if (supabase === null) {
    debugPlans("cliente supabase no configurado");
    return { data: null, error: PLANS_ERROR_LOAD };
  }

  try {
    const { data, error } = await supabase
      .from("plan_exercises")
      .select("*, exercises(id,name,image_url,equipment,target)")
      .eq("plan_day_id", planDayId)
      .order("position", { ascending: true });

    if (error !== null) {
      debugPlans("getDayExercises falló:", error);
      return { data: null, error: PLANS_ERROR_LOAD };
    }

    return { data: (data ?? []) as PlanExerciseWithExercise[], error: null };
  } catch (thrown: unknown) {
    debugPlans("getDayExercises lanzó excepción:", thrown);
    return { data: null, error: PLANS_ERROR_LOAD };
  }
}
