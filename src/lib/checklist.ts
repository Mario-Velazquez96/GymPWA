/**
 * Listas tachables de la pantalla Dieta (11_diet_checklists): persistencia del
 * tachado en el dispositivo, selección por `kind` y agrupación por categoría.
 * Módulo PURO — sin React y sin acceso a datos.
 *
 * Regla de oro: **el tachado es estado del dispositivo, no del plan**. Vive en
 * `localStorage` bajo una clave por `(plan.id, kind)`; Supabase ni se entera
 * (R15). La única tabla que la app escribe sigue siendo `workout_logs`.
 */

import { sortByPosition } from "@/lib/diet";
import type { DietChecklistItem } from "@/lib/types";

/** Lista a la que pertenece un renglón: meal prep o lista de súper. */
export type ChecklistKind = DietChecklistItem["kind"];

/** Prefijo de la clave: `gym:diet:check:<planId>:<kind>` (R1). */
export const CHECKLIST_STORAGE_PREFIX = "gym:diet:check:";

/** Clave exacta de (plan, lista) en `localStorage` (R1, R14). */
export function checklistStorageKey(planId: string, kind: ChecklistKind): string {
  return `${CHECKLIST_STORAGE_PREFIX}${planId}:${kind}`;
}

/** Detalles solo en consola de desarrollo, nunca en la UI (R4, R5). */
function debugChecklist(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[checklist]", ...details);
  }
}

/**
 * `localStorage` o `null` si el entorno no lo expone o lanza al accederlo
 * (Safari en privado con datos bloqueados lanza en el propio getter) (R5).
 */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch (thrown: unknown) {
    debugChecklist("localStorage no accesible:", thrown);
    return null;
  }
}

/**
 * Ids marcados de (plan, lista). Sin valor, JSON inválido, valor que no es un
 * array o `localStorage` que lanza → `Set` vacío; las entradas que no son
 * string se descartan (R3, R4, R5).
 */
export function readChecked(planId: string, kind: ChecklistKind): Set<string> {
  try {
    const raw = storage()?.getItem(checklistStorageKey(planId, kind)) ?? null;
    if (raw === null) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      debugChecklist("valor no es array:", raw);
      return new Set();
    }
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch (thrown: unknown) {
    debugChecklist("lectura del tachado falló:", thrown);
    return new Set();
  }
}

/**
 * Guarda el set como array JSON de ids, best-effort: si `localStorage` lanza
 * (cuota, modo privado) el fallo se traga y la app sigue — el tachado queda en
 * memoria durante la sesión y solo no sobrevive a la recarga (R1, R5).
 */
export function writeChecked(planId: string, kind: ChecklistKind, ids: Iterable<string>): void {
  try {
    storage()?.setItem(checklistStorageKey(planId, kind), JSON.stringify([...ids]));
  } catch (thrown: unknown) {
    debugChecklist("escritura del tachado falló:", thrown);
  }
}

/**
 * Renglones de una lista: copia filtrada por `kind` y ordenada por `position`
 * asc (idempotente sobre la salida ya ordenada del service, por robustez) (R9).
 */
export function selectChecklist(
  items: DietChecklistItem[],
  kind: ChecklistKind,
): DietChecklistItem[] {
  return sortByPosition(items.filter((item) => item.kind === kind));
}

/**
 * Nombre accesible del renglón: "<item> · <cantidad>", o solo "<item>" cuando
 * la cantidad es nula o está en blanco — sin separador huérfano (R8).
 */
export function checklistLabel(item: Pick<DietChecklistItem, "item" | "cantidad">): string {
  const cantidad = item.cantidad?.trim() ?? "";
  return cantidad === "" ? item.item : `${item.item} · ${cantidad}`;
}

/** Etiqueta del grupo que recoge los renglones sin categoría (R10). */
export const OTROS_LABEL = "Otros";

/** Grupo de la lista de súper: una categoría y sus renglones en orden. */
export interface ChecklistGroup {
  /** Categoría (ya `trim()`eada) o `null` para el grupo "Otros". */
  categoria: string | null;
  /** Texto del encabezado: la categoría o `OTROS_LABEL`. */
  label: string;
  /** Renglones del grupo, en orden de `position` asc. */
  items: DietChecklistItem[];
}

/**
 * Agrupa por `categoria` preservando el orden de PRIMERA aparición (la entrada
 * ya viene por `position` asc); `null`/blanco caen en un grupo final "Otros".
 * Igualdad exacta tras `trim()`: "Proteínas" y "proteinas" son dos grupos
 * distintos a propósito (open item C) (R10).
 */
export function groupByCategoria(items: DietChecklistItem[]): ChecklistGroup[] {
  const groups = new Map<string, ChecklistGroup>(); // Map conserva orden de inserción
  const otros: DietChecklistItem[] = [];

  for (const item of items) {
    const label = item.categoria?.trim() ?? "";
    if (label === "") {
      otros.push(item);
      continue;
    }
    const group = groups.get(label) ?? { categoria: label, label, items: [] };
    group.items.push(item);
    groups.set(label, group);
  }

  const result = [...groups.values()];
  if (otros.length > 0) {
    result.push({ categoria: null, label: OTROS_LABEL, items: otros });
  }
  return result;
}
