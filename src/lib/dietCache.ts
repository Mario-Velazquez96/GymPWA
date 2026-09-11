/**
 * Snapshot local del plan de dieta (12_diet_offline): persistencia en
 * `localStorage` del último `DietPlanFull` que devolvió la red, para que la
 * sección Dieta siga consultable sin señal (RF-D6, RF-D10). Módulo PURO — sin
 * React y sin acceso a datos.
 *
 * Regla de oro: **el snapshot es estado del dispositivo, no del plan**. La app
 * no cachea la API de Supabase en el service worker (docs/architecture.md) ni
 * escribe nada en la base: solo guarda aquí, en claro, lo que RLS ya le dejó
 * leer al usuario de este teléfono. Se borra al cerrar sesión (R21) y cuando la
 * red responde "sin plan activo" (R4).
 *
 * Misma disciplina que `lib/units.ts` y `lib/checklist.ts`: `try/catch` en
 * **todo** acceso, valor corrupto → `null`, escritura best-effort.
 */

import { DIET_TIME_ZONE } from "@/lib/diet";
import type { DietPlanFull } from "@/lib/types";

/** Clave única del snapshot en `localStorage` (R1). */
export const DIET_SNAPSHOT_KEY = "gym:diet:snapshot";

/** Sube este número si cambia la forma de `DietPlanFull`: invalida snapshots viejos (R2). */
export const DIET_SNAPSHOT_VERSION = 1 as const;

/** Envoltorio versionado de lo guardado en el dispositivo (R1). */
export interface DietSnapshot {
  /** Versión del formato; un valor distinto invalida el snapshot (R2). */
  v: typeof DIET_SNAPSHOT_VERSION;
  /** Plan completo. Nunca `null`: "sin plan" = clave ausente (R4, open item C). */
  plan: DietPlanFull;
  /** Momento de la última respuesta OK de la red, ISO 8601 UTC (R1, R13). */
  savedAt: string;
}

/** Detalles solo en consola de desarrollo, nunca en la UI (R2, R5). */
function debugCache(...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[dietCache]", ...details);
  }
}

/**
 * `localStorage` o `null` si el entorno no lo expone o lanza al accederlo
 * (Safari en privado con datos bloqueados lanza en el propio getter) (R2, R5).
 */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch (thrown: unknown) {
    debugCache("localStorage no accesible:", thrown);
    return null;
  }
}

/** Las cuatro hijas que la pantalla recorre siempre como arrays (R2). */
const CHILD_KEYS = [
  "diet_meals",
  "diet_checklist_items",
  "diet_supplements",
  "diet_sections",
] as const;

/**
 * Chequeo estructural ligero (sin Zod): versión, `savedAt`, `plan.id` y las
 * cuatro hijas como arrays — lo único cuya ausencia rompería la UI (R2).
 */
function isDietSnapshot(value: unknown): value is DietSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.v !== DIET_SNAPSHOT_VERSION || typeof record.savedAt !== "string") {
    return false;
  }
  const plan = record.plan;
  if (typeof plan !== "object" || plan === null) {
    return false;
  }
  const planRecord = plan as Record<string, unknown>;
  return (
    typeof planRecord.id === "string" && CHILD_KEYS.every((key) => Array.isArray(planRecord[key]))
  );
}

/**
 * Snapshot guardado, o `null` si no hay, está corrupto, es de otra versión o
 * `localStorage` lanza (R1, R2). Un snapshot inválido NO se borra al leerlo: la
 * siguiente respuesta OK lo sobrescribe.
 */
export function readDietSnapshot(): DietSnapshot | null {
  try {
    const raw = storage()?.getItem(DIET_SNAPSHOT_KEY) ?? null;
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isDietSnapshot(parsed)) {
      debugCache("snapshot inválido, se ignora");
      return null;
    }
    return parsed;
  } catch (thrown: unknown) {
    debugCache("lectura del snapshot falló:", thrown);
    return null;
  }
}

/**
 * Persiste el plan con la marca de tiempo, o **borra** la clave con `null` (la
 * red respondió "sin plan activo") (R3, R4). Best-effort: si `localStorage`
 * lanza (cuota, modo privado) el fallo se traga y la app sigue mostrando el
 * plan que tiene en memoria (R5). `now` es inyectable para tests.
 */
export function writeDietSnapshot(plan: DietPlanFull | null, now: Date = new Date()): void {
  try {
    const store = storage();
    if (store === null) {
      return;
    }
    if (plan === null) {
      store.removeItem(DIET_SNAPSHOT_KEY);
      return;
    }
    const snapshot: DietSnapshot = {
      v: DIET_SNAPSHOT_VERSION,
      plan,
      savedAt: now.toISOString(),
    };
    store.setItem(DIET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (thrown: unknown) {
    debugCache("escritura del snapshot falló:", thrown);
  }
}

/**
 * ISO del snapshot → "10 sep 09:15" en es-MX y zona `America/Mexico_City`
 * (misma zona fija que el resto de Dieta). `null` si el ISO no parsea: en ese
 * caso el banner degrada a un texto sin fecha (R13).
 */
export function formatSavedAt(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: DIET_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value.replace(/\./g, "") ?? "";
  return `${part("day")} ${part("month")} ${part("hour")}:${part("minute")}`;
}
