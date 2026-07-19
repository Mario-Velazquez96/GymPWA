/**
 * Helpers de fechas para la pantalla Hoy (R2, R6). Todas las funciones operan
 * con strings ISO "YYYY-MM-DD" y componentes LOCALES del dispositivo — nunca
 * `toISOString()`/UTC, porque cerca de medianoche la fecha UTC puede ser otra.
 */

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
 * "2026-08-03" → "lun 3 ago" (es-MX, R2). Se arma con `formatToParts` para
 * fijar el orden "día-semana día mes" y se quitan los puntos de abreviatura.
 */
export function formatDateEs(iso: string): string {
  const parts = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(fromISO(iso));

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value.replace(/\./g, "") ?? "";

  return `${part("weekday")} ${part("day")} ${part("month")}`;
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
