import Stepper from "@/components/Stepper";
import { REPS_STEP, type SetRowState } from "@/lib/logging";
import type { WorkoutLog } from "@/lib/types";
import { WEIGHT_STEP, formatWeight, fromKg, quantize, toKg, type WeightUnit } from "@/lib/units";

interface SetRowProps {
  row: SetRowState;
  /** Serie con el mismo `set_number` de la sesión anterior, o `null` (R2). */
  previous: WorkoutLog | null;
  /** Unidad activa del ejercicio; kg por defecto (08 R3, R6). */
  unit?: WeightUnit;
  /** Primera fila editable/error de la sección: lleva el filo de horizonte (14 R16). */
  active?: boolean;
  /** Recibe SIEMPRE kilogramos canónicos, ya convertidos (08 R7, R14). */
  onWeightChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onSave: () => void;
}

const BUTTON_BASE = "min-h-11 w-full rounded-sm text-base font-bold";

/**
 * Acción primaria: horizonte con texto blanco; al pulsar sube un paso de fase
 * a `dawn-rose` con tinta negra (no un desvanecido de opacidad).
 */
const PRIMARY_BUTTON = `${BUTTON_BASE} bg-horizon text-day transition-colors duration-150 active:bg-none active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none`;

/**
 * Tratamiento secundario del mismo botón (mismo texto, mismo `disabled`,
 * mismo target de 44 px): borde de día **a plena luz**, sin degradado. Lo
 * llevan las filas editables que **no** son la activa, para que el horizonte
 * siga siendo la única acción encendida de la pantalla.
 *
 * Vocabulario de tres niveles de la pantalla Ejercicio (regresión R1 de la
 * revisión de cierre): primario = horizonte, solo en la fila activa;
 * secundario = este botón, que sigue siendo una escritura y se lee como tal;
 * terciario = "Agregar serie" y "Ver historial", el mismo rectángulo al 60 %
 * porque solo navegan o añaden.
 */
const SECONDARY_BUTTON = `${BUTTON_BASE} border-2 border-day bg-transparent text-day transition-colors duration-150 hover:bg-day hover:text-cyc-black active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none`;

/** Botón de la fila según el estado (copy sin cambios; 14 R16). */
const BUTTON_CLASS: Record<SetRowState["status"], string> = {
  editable: PRIMARY_BUTTON,
  error: PRIMARY_BUTTON,
  saving: `${BUTTON_BASE} cursor-not-allowed border-2 border-blackout bg-blackout text-day/90`,
  saved: `${BUTTON_BASE} cursor-default border-2 border-cyc-black bg-day text-cyc-black`,
};

/**
 * Fila de una serie (presentacional, sin data fetching): "Serie N", columna
 * "Anterior: peso × reps | —" (R2), steppers de peso/reps (R4) y "Guardar
 * serie" con la máquina editable → saving(deshabilitado, R10) → saved(✓, R5)
 * | error(editable, valores intactos + mensaje inline, R6/R7).
 *
 * Fases visuales (14 R16, R17): la fila es una banda de noche (`dawn-sweep`)
 * que **amanece** al pasar a `saved` (`dawn-sweep-day`: la luz sube de abajo
 * hacia arriba en 200 ms y la tinta pasa a negro; corte con reduced-motion).
 * La fila activa lleva el filo de horizonte **y el único botón de horizonte**
 * de la pantalla; las demás filas pendientes llevan el mismo botón en
 * secundario (borde de día, sin degradado). El error se enmarca en rojo de
 * cue y siempre va acompañado de texto.
 *
 * El estado de la fila vive SIEMPRE en kg (08 R10): `unit` solo decide qué
 * número se pinta, con qué paso avanza el stepper y cómo se interpreta lo que
 * el usuario teclea; el valor que sale por `onWeightChange` vuelve a ser kg.
 */
export default function SetRow({
  row,
  previous,
  unit = "kg",
  active = false,
  onWeightChange,
  onRepsChange,
  onSave,
}: SetRowProps) {
  const busy = row.status === "saving" || row.status === "saved";
  const saved = row.status === "saved";
  const failed = row.status === "error";
  const pending = row.status === "editable" || failed;
  // Un solo horizonte encendido por pantalla: la fila activa. Las demás filas
  // pendientes conservan el botón (texto, estado y tamaño) en secundario.
  const buttonClass = pending && !active ? SECONDARY_BUTTON : BUTTON_CLASS[row.status];

  const rowClass = [
    "dawn-sweep flex flex-col gap-3 px-4 py-3",
    failed ? "border-2 border-cue-fault" : "border-y border-blackout",
    saved ? "dawn-sweep-day" : "",
    active && !saved ? "horizon-edge-l" : "",
  ]
    .filter((part) => part !== "")
    .join(" ");

  return (
    <li data-status={row.status} data-active={active ? "true" : "false"} className={rowClass}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold">Serie {row.setNumber}</h3>
        <p className={`text-base tabular-nums ${saved ? "" : "text-day/90"}`}>
          Anterior:{" "}
          {previous !== null ? `${formatWeight(previous.weight_kg, unit)} × ${previous.reps}` : "—"}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Stepper
          label={`Peso serie ${row.setNumber}`}
          value={fromKg(row.weight_kg, unit)}
          step={WEIGHT_STEP[unit]}
          min={0}
          unit={unit}
          disabled={busy}
          onChange={(value) => onWeightChange(toKg(quantize(value, unit), unit))}
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
        <p role="alert" className="text-base font-semibold text-cue-fault">
          {row.message}
        </p>
      )}

      <button type="button" disabled={busy} onClick={onSave} className={buttonClass}>
        {row.status === "saved" && "✓ Guardada"}
        {row.status === "saving" && "Guardando…"}
        {(row.status === "editable" || row.status === "error") && "Guardar serie"}
      </button>
    </li>
  );
}
