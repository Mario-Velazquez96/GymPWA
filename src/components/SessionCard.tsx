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
}

/**
 * Tarjeta de una sesión del historial (presentacional, sin data fetching):
 * encabezado con la fecha en español con año ("lun 3 ago 2026") y una fila por
 * serie "Serie N — 22.5 kg × 10" (06_history R2, R7). Las filas siempre traen
 * kilogramos canónicos; `unit` solo decide en qué unidad se leen (08 R12).
 */
export default function SessionCard({ date, sets, unit = "kg" }: SessionCardProps) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">
        {formatDateEs(date, { year: true })}
      </h2>
      <ul className="flex flex-col gap-1">
        {sets.map((set) => (
          <li key={set.id} className="text-base text-slate-200">
            Serie {set.set_number} — {formatWeight(set.weight_kg, unit)} × {set.reps}
          </li>
        ))}
      </ul>
    </article>
  );
}
