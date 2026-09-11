/**
 * Lógica pura de la pantalla Dieta (10_diet_screen): hora local en la zona
 * fija `America/Mexico_City` (R7), parseo/formato de horas y minutos (R11),
 * orden estable por `position` (R4) y el estado de la ventana de alimentación
 * (R8, R9). Nada aquí lee el reloj salvo `nowLocalHM`; `getWindowState`
 * recibe los minutos como input para que la tabla de casos se pruebe con
 * números, sin fake timers ni dependencia de la TZ del runner.
 */

import type { DietMeal, DietPlan } from "@/lib/types";

/** Zona horaria fija de la app (RF-D3; open item C resuelto por el humano). */
export const DIET_TIME_ZONE = "America/Mexico_City";

/**
 * "HH:MM" actual en `America/Mexico_City` (R7). `now` es inyectable para
 * tests. `hourCycle: "h23"` evita el "24:00" que algunos motores emiten con
 * `hour12: false` a medianoche.
 */
export function nowLocalHM(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DIET_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

const HM_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

/**
 * "HH:MM" | "HH:MM:SS" → minutos desde medianoche (0..1439); `null` si el
 * valor es nulo o no parsea (una `hora` mal formada se ignora, no rompe la UI).
 */
export function parseHM(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const match = HM_PATTERN.exec(value.trim());
  if (match === null) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/** "10:00:00" → "10:00"; "10:00" → "10:00" (R11). */
export function formatHora(time: string): string {
  return time.slice(0, 5);
}

/** Minutos desde medianoche → "HH:MM" (para `opensAt`/`closesAt`). */
function minutesToHM(minutes: number): string {
  const pad2 = (value: number): string => String(value).padStart(2, "0");
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/**
 * 0..60 → "n min"; múltiplo exacto de 60 por encima → "h h"; resto →
 * "h h m min" (R11). 60 se queda en "60 min" a propósito (criterio 2).
 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${rest} min`;
}

/**
 * Copia ordenada por `position` asc con desempate por `id` — estable entre
 * renders aunque dos filas compartan `position` (imposible por el `unique`
 * de 09, pero barato de garantizar). No muta la entrada (R4).
 */
export function sortByPosition<T extends { position: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/** Estado de la ventana de alimentación para un instante dado (R8, R9). */
export type WindowState =
  | { kind: "sin_ventana" }
  | { kind: "antes"; opensAt: string; minutesToNext: number; nextMeal: DietMeal | null }
  | { kind: "dentro"; closesAt: string; nextMeal: DietMeal | null }
  | { kind: "despues"; opensAt: string; nextMeal: DietMeal | null };

interface TimedMeal {
  meal: DietMeal;
  at: number;
}

/** Comidas con `hora` válida, ordenadas por hora asc y luego `position`. */
function timedMeals(meals: DietMeal[]): TimedMeal[] {
  const timed: TimedMeal[] = [];
  for (const meal of meals) {
    const at = parseHM(meal.hora);
    if (at !== null) {
      timed.push({ meal, at });
    }
  }
  return timed.sort((a, b) => a.at - b.at || a.meal.position - b.meal.position);
}

/**
 * Estado de la ventana para `nowMinutes` (0..1439). Puro: no lee el reloj.
 * Límites: inclusivo al inicio (`inicio <= now`), exclusivo al fin
 * (`now < fin`). Sin `ventana_inicio` o `ventana_fin` → `sin_ventana` (R9).
 */
export function getWindowState(
  plan: Pick<DietPlan, "ventana_inicio" | "ventana_fin">,
  meals: DietMeal[],
  nowMinutes: number,
): WindowState {
  const inicio = parseHM(plan.ventana_inicio);
  const fin = parseHM(plan.ventana_fin);
  if (inicio === null || fin === null) {
    return { kind: "sin_ventana" };
  }

  const timed = timedMeals(meals);
  const opensAt = minutesToHM(inicio);

  if (nowMinutes < inicio) {
    const next = timed.find((entry) => entry.at >= nowMinutes) ?? null;
    return {
      kind: "antes",
      opensAt,
      minutesToNext: (next?.at ?? inicio) - nowMinutes,
      nextMeal: next?.meal ?? null,
    };
  }

  if (nowMinutes < fin) {
    const next = timed.find((entry) => entry.at >= nowMinutes) ?? null;
    return { kind: "dentro", closesAt: minutesToHM(fin), nextMeal: next?.meal ?? null };
  }

  return { kind: "despues", opensAt, nextMeal: timed[0]?.meal ?? null };
}
