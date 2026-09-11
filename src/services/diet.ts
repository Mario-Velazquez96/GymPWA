import { supabase } from "@/lib/supabase";
import { sortByPosition } from "@/lib/diet";
import type { DietPlanFull } from "@/lib/types";
import type { Result } from "@/services/plans";

/** Mensaje único de fallo de carga de la pantalla Dieta (R5, R18). */
export const DIET_ERROR_LOAD = "No se pudo cargar la dieta";

/** Consulta anidada: el plan con sus cuatro hijas embebidas en un viaje (R4). */
export const DIET_SELECT =
  "*, diet_meals(*), diet_checklist_items(*), diet_supplements(*), diet_sections(*)";

/** Detalles del error solo en consola de desarrollo, nunca en la UI (R5). */
function debugDiet(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[diet]", ...details);
  }
}

/**
 * Plan de dieta `active` del usuario con sus cuatro hijas en UNA consulta
 * anidada (RLS acota todo a `auth.uid()`; el índice único parcial de 09
 * garantiza a lo sumo una fila). Las hijas se ordenan por `position` en el
 * cliente y un embebido `null` se normaliza a `[]`. `data: null` sin error =
 * sin plan activo (R17). Solo lectura: este módulo no escribe nunca (R4).
 */
export async function getActiveDietPlan(): Promise<Result<DietPlanFull | null>> {
  if (supabase === null) {
    debugDiet("cliente supabase no configurado");
    return { data: null, error: DIET_ERROR_LOAD };
  }

  try {
    const { data, error } = await supabase
      .from("diet_plans")
      .select(DIET_SELECT)
      .eq("status", "active")
      .limit(1);

    if (error !== null) {
      debugDiet("getActiveDietPlan falló:", error);
      return { data: null, error: DIET_ERROR_LOAD };
    }

    const row = ((data ?? []) as DietPlanFull[])[0];
    if (row === undefined) {
      return { data: null, error: null };
    }

    return {
      data: {
        ...row,
        diet_meals: sortByPosition(row.diet_meals ?? []),
        diet_checklist_items: sortByPosition(row.diet_checklist_items ?? []),
        diet_supplements: sortByPosition(row.diet_supplements ?? []),
        diet_sections: sortByPosition(row.diet_sections ?? []),
      },
      error: null,
    };
  } catch (thrown: unknown) {
    debugDiet("getActiveDietPlan lanzó excepción:", thrown);
    return { data: null, error: DIET_ERROR_LOAD };
  }
}
