import Stepper from "@/components/Stepper";
import { REPS_STEP, WEIGHT_STEP_KG, formatKg, type SetRowState } from "@/lib/logging";
import type { WorkoutLog } from "@/lib/types";

interface SetRowProps {
  row: SetRowState;
  /** Serie con el mismo `set_number` de la sesión anterior, o `null` (R2). */
  previous: WorkoutLog | null;
  onWeightChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onSave: () => void;
}

/**
 * Fila de una serie (presentacional, sin data fetching): "Serie N", columna
 * "Anterior: peso × reps | —" (R2), steppers de peso/reps (R4) y "Guardar
 * serie" con la máquina editable → saving(deshabilitado, R10) → saved(✓, R5)
 * | error(editable, valores intactos + mensaje inline, R6/R7).
 */
export default function SetRow({
  row,
  previous,
  onWeightChange,
  onRepsChange,
  onSave,
}: SetRowProps) {
  const busy = row.status === "saving" || row.status === "saved";

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-100">Serie {row.setNumber}</h3>
        <p className="text-sm text-slate-400">
          Anterior: {previous !== null ? `${formatKg(previous.weight_kg)} × ${previous.reps}` : "—"}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stepper
          label={`Peso serie ${row.setNumber}`}
          value={row.weight_kg}
          step={WEIGHT_STEP_KG}
          min={0}
          unit="kg"
          disabled={busy}
          onChange={onWeightChange}
        />
        <Stepper
          label={`Repeticiones serie ${row.setNumber}`}
          value={row.reps}
          step={REPS_STEP}
          min={1}
          disabled={busy}
          onChange={onRepsChange}
        />
      </div>

      {row.message !== null && (
        <p role="alert" className="text-sm text-red-400">
          {row.message}
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className={
          row.status === "saved"
            ? "min-h-11 w-full rounded-lg bg-emerald-700 text-base font-semibold text-white"
            : "min-h-11 w-full rounded-lg bg-sky-600 text-base font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-60"
        }
      >
        {row.status === "saved" && "✓ Guardada"}
        {row.status === "saving" && "Guardando…"}
        {(row.status === "editable" || row.status === "error") && "Guardar serie"}
      </button>
    </li>
  );
}
