import SetRow from "@/components/SetRow";
import { useWorkoutLog } from "@/hooks/useWorkoutLog";
import type { PlanExercise } from "@/lib/types";

interface LoggingSectionProps {
  planExercise: PlanExercise;
}

/**
 * Sección de registro de series de la pantalla Ejercicio (RF-4/RF-5): una
 * fila por serie objetivo + "Agregar serie" (R1), comparación "Anterior" (R2),
 * prefill (R3) y guardado inmediato por serie (R5). Estados explícitos de
 * carga y error con "Reintentar"; al reabrir el mismo día las series ya
 * guardadas se renderizan como guardadas (R8).
 */
export default function LoggingSection({ planExercise }: LoggingSectionProps) {
  const { loading, error, previous, rows, retry, updateRow, saveRow, addRow } =
    useWorkoutLog(planExercise);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-slate-100">Registro de series</h2>

      {loading && (
        <p role="status" className="animate-pulse py-4 text-center text-base text-slate-300">
          Cargando series…
        </p>
      )}

      {!loading && error !== null && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p role="alert" className="text-center text-base text-red-400">
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-lg bg-sky-600 px-6 text-base font-semibold text-white transition-colors hover:bg-sky-500"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && error === null && (
        <>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <SetRow
                key={row.setNumber}
                row={row}
                previous={previous.find((log) => log.set_number === row.setNumber) ?? null}
                onWeightChange={(value) => updateRow(row.setNumber, { weight_kg: value })}
                onRepsChange={(value) => updateRow(row.setNumber, { reps: value })}
                onSave={() => void saveRow(row.setNumber)}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={addRow}
            className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 text-base font-semibold text-slate-100 transition-colors hover:bg-slate-700"
          >
            Agregar serie
          </button>
        </>
      )}
    </section>
  );
}
