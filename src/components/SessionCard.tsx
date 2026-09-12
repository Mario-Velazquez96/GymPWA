import type { WorkoutLog } from "@/lib/types";
import { formatWeight, type WeightUnit } from "@/lib/units";
import { formatDateEs } from "@/lib/utils";

interface SessionCardProps {
  /** Fecha ISO "YYYY-MM-DD" de la sesión. */
  date: string;
  /** Series de la sesión, ya ordenadas por `set_number` (06_history R2). */
  sets: WorkoutLog[];
  /** Unidad de lectura del ejercicio; kg por defecto (08 R3, R12). */
  unit?: WeightUnit;
  /** Sesión más reciente (índice 0): día pleno con filo de horizonte (14 R19). */
  latest?: boolean;
}

/**
 * Banda de una sesión del historial (presentacional, sin data fetching):
 * encabezado con la fecha en español con año ("lun 3 ago 2026") y una fila por
 * serie "Serie N — 22.5 kg × 10" (06_history R2, R7). Las filas siempre traen
 * kilogramos canónicos; `unit` solo decide en qué unidad se leen (08 R12).
 *
 * Lo hecho es de día (14 R19): la sesión más reciente es blanca con el filo de
 * horizonte; las anteriores van en `day-wash`. Tinta negra en ambas.
 */
export default function SessionCard({ date, sets, unit = "kg", latest = false }: SessionCardProps) {
  return (
    <article
      data-latest={latest ? "true" : "false"}
      className={`flex flex-col gap-2 px-4 py-3 text-cyc-black ${
        latest ? "bg-day horizon-edge-l" : "bg-day-wash"
      }`}
    >
      <h2 className="text-base font-bold">{formatDateEs(date, { year: true })}</h2>
      <ul className="flex flex-col gap-1">
        {sets.map((set) => (
          <li key={set.id} className="text-lg font-semibold tabular-nums">
            Serie {set.set_number} — {formatWeight(set.weight_kg, unit)} × {set.reps}
          </li>
        ))}
      </ul>
    </article>
  );
}
