import SetRow from "@/components/SetRow";
import UnitToggle from "@/components/UnitToggle";
import { useExerciseUnit } from "@/hooks/useExerciseUnit";
import { useWorkoutLog } from "@/hooks/useWorkoutLog";
import type { PlanExercise } from "@/lib/types";

interface LoggingSectionProps {
  planExercise: PlanExercise;
}

/**
 * Tercer nivel del vocabulario de acciones de la pantalla (regresión R1 de la
 * revisión de cierre): "Agregar serie" no escribe nada en Supabase, solo añade
 * una fila, así que conserva el rectángulo de 44 px y el borde de día pero se
 * queda al 60 %. Encima de ella, "Guardar serie" de las filas pendientes va en
 * secundario a plena luz (es una escritura) y el horizonte sigue siendo
 * exclusivo de la fila activa.
 */
const TERTIARY_CLASS =
  "min-h-11 w-full rounded-sm border-2 border-day bg-transparent text-base font-bold text-day opacity-60 transition-colors duration-150 hover:bg-day hover:text-cyc-black motion-reduce:transition-none";

/**
 * Sección de registro de series de la pantalla Ejercicio (RF-4/RF-5): una
 * fila por serie objetivo + "Agregar serie" (R1), comparación "Anterior" (R2),
 * prefill (R3) y guardado inmediato por serie (R5). Estados explícitos de
 * carga y error con "Reintentar"; al reabrir el mismo día las series ya
 * guardadas se renderizan como guardadas (R8).
 *
 * La unidad de captura (kg/lb) es una preferencia por ejercicio guardada en el
 * dispositivo (08 R1, R2): el toggle vive junto al encabezado y solo cambia
 * entrada y presentación — el estado y lo que se inserta siguen en kg (08 R14).
 *
 * La fila activa (14 R15) es la primera `editable` o `error`: solo ella lleva
 * el filo de horizonte; una fila guardada nunca.
 */
export default function LoggingSection({ planExercise }: LoggingSectionProps) {
  const [unit, setUnit] = useExerciseUnit(planExercise.exercise_id);
  const { loading, error, previous, rows, retry, updateRow, saveRow, addRow } = useWorkoutLog(
    planExercise,
    unit,
  );

  const activeSetNumber = rows.find(
    (row) => row.status === "editable" || row.status === "error",
  )?.setNumber;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-day">Registro de series</h2>
        <UnitToggle unit={unit} onChange={setUnit} />
      </div>

      {loading && (
        <p
          role="status"
          className="animate-pulse py-10 text-center text-lg text-day/60 motion-reduce:animate-none"
        >
          Cargando series…
        </p>
      )}

      {!loading && error !== null && (
        <div className="flex flex-col items-center gap-4 py-10">
          <p role="alert" className="text-center text-base font-semibold text-cue-fault">
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-sm bg-horizon px-6 text-base font-bold text-day transition-colors duration-150 active:bg-none active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && error === null && (
        <>
          <ul className="-mx-4 flex flex-col gap-px">
            {rows.map((row) => (
              <SetRow
                key={row.setNumber}
                row={row}
                previous={previous.find((log) => log.set_number === row.setNumber) ?? null}
                unit={unit}
                active={row.setNumber === activeSetNumber}
                onWeightChange={(value) => updateRow(row.setNumber, { weight_kg: value })}
                onRepsChange={(value) => updateRow(row.setNumber, { reps: value })}
                onSave={() => void saveRow(row.setNumber)}
              />
            ))}
          </ul>
          <button type="button" onClick={addRow} className={TERTIARY_CLASS}>
            Agregar serie
          </button>
        </>
      )}
    </section>
  );
}
