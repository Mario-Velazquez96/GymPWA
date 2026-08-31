import type { WeightUnit } from "@/lib/units";

interface UnitToggleProps {
  /** Unidad activa del ejercicio. */
  unit: WeightUnit;
  onChange: (unit: WeightUnit) => void;
}

const UNITS: readonly WeightUnit[] = ["kg", "lb"];

/**
 * Toggle kg/lb del ejercicio (08 R1): grupo etiquetado "Unidad de peso" con dos
 * botones de ≥ 44px, el activo marcado visualmente y expuesto con
 * `aria-pressed="true"`. Presentacional puro, sin data fetching.
 */
export default function UnitToggle({ unit, onChange }: UnitToggleProps) {
  return (
    <div role="group" aria-label="Unidad de peso" className="flex gap-1">
      {UNITS.map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-pressed={candidate === unit}
          onClick={() => onChange(candidate)}
          className={
            candidate === unit
              ? "min-h-11 min-w-11 rounded-lg bg-sky-600 px-4 text-base font-semibold text-white"
              : "min-h-11 min-w-11 rounded-lg bg-slate-800 px-4 text-base font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          }
        >
          {candidate}
        </button>
      ))}
    </div>
  );
}
