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
 *
 * La unidad activa lleva el tratamiento de día/seleccionado (blanco con
 * tinta negra); la otra es un control secundario de noche (14 R15).
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
              ? "min-h-11 min-w-11 rounded-sm border-2 border-cyc-black bg-day px-4 text-base font-bold text-cyc-black"
              : "min-h-11 min-w-11 rounded-sm border-2 border-day bg-transparent px-4 text-base font-bold text-day transition-colors duration-150 hover:bg-day hover:text-cyc-black motion-reduce:transition-none"
          }
        >
          {candidate}
        </button>
      ))}
    </div>
  );
}
