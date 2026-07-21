/**
 * Helpers de fechas y formato para las pantallas Hoy e Historial (R2, R6;
 * 06_history R1, R2, R7). Todas las funciones de fecha operan con strings ISO
 * "YYYY-MM-DD" y componentes LOCALES del dispositivo — nunca `toISOString()`/
 * UTC, porque cerca de medianoche la fecha UTC puede ser otra.
 */

import type { WorkoutLog } from "@/lib/types";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Fecha ISO local a partir de un string "YYYY-MM-DD" → Date a medianoche local. */
function fromISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Fecha actual del dispositivo (local, no UTC) como "YYYY-MM-DD" (R2). */
export function todayLocalISO(): string {
  return toISO(new Date());
}

/**
 * "2026-08-03" → "lun 3 ago" (es-MX, R2). Con `{ year: true }` agrega el año:
 * "lun 3 ago 2026" (06_history R2, para desambiguar sesiones de distintos años).
 * Se arma con `formatToParts` para fijar el orden "día-semana día mes [año]" y
 * se quitan los puntos de abreviatura.
 */
export function formatDateEs(iso: string, options?: { year?: boolean }): string {
  const withYear = options?.year === true;
  const parts = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).formatToParts(fromISO(iso));

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value.replace(/\./g, "") ?? "";

  const base = `${part("weekday")} ${part("day")} ${part("month")}`;
  return withYear ? `${base} ${part("year")}` : base;
}

/**
 * Peso con unidad para lectura (06_history R2, R7): entero → "22 kg",
 * fraccionario → "22.5 kg". Se redondea a 2 decimales y se dejan caer los
 * ceros de cola vía la conversión numérica a string.
 */
export function formatKg(value: number): string {
  return `${Math.round(value * 100) / 100} kg`;
}

/** Una sesión del historial: la fecha ISO y sus series (06_history R1). */
export interface LogSession {
  date: string;
  sets: WorkoutLog[];
}

/**
 * Agrupa filas de `workout_logs` en sesiones por `performed_at`, preservando el
 * orden de entrada (la consulta las trae newest-first, así que las sesiones
 * salen newest-first y sus series conservan el orden por `set_number`)
 * (06_history R1). El `Map` mantiene el orden de primera aparición de cada fecha.
 */
export function groupByDate(logs: WorkoutLog[]): LogSession[] {
  const byDate = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const existing = byDate.get(log.performed_at);
    if (existing === undefined) {
      byDate.set(log.performed_at, [log]);
    } else {
      existing.push(log);
    }
  }
  return [...byDate.entries()].map(([date, sets]) => ({ date, sets }));
}

/** Suma `delta` días (puede ser negativo) a una fecha ISO local (R6). */
export function addDaysISO(iso: string, delta: number): string {
  const date = fromISO(iso);
  date.setDate(date.getDate() + delta);
  return toISO(date);
}

/** Acota una fecha ISO al rango [min, max] — el orden lexicográfico ISO es cronológico (R6). */
export function clampISO(iso: string, min: string, max: string): string {
  if (iso < min) {
    return min;
  }
  if (iso > max) {
    return max;
  }
  return iso;
}
