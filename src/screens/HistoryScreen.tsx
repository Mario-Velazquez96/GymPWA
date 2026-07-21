import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import SessionCard from "@/components/SessionCard";
import type { Exercise, WorkoutLog } from "@/lib/types";
import { groupByDate } from "@/lib/utils";
import { getExercise } from "@/services/exercises";
import { LOGS_ERROR_HISTORY, getExerciseHistory } from "@/services/logs";

/** Resultado de una carga, etiquetado con la clave id#intento (patrón de 04). */
interface LoadedResult {
  key: string;
  error: boolean;
  exercise: Exercise | null;
  logs: WorkoutLog[];
}

/**
 * Pantalla Historial (RF-5), solo lectura: por ejercicio, todas las sesiones
 * registradas newest-first, cada una con sus series "Serie N — X kg × Y"
 * (R1, R2). Título = nombre del ejercicio (R3). Estados: carga, error con
 * "Reintentar" (R6), vacío "Aún no hay registros de este ejercicio" (R4) y
 * "Ejercicio no encontrado" con vuelta a Hoy para ids inexistentes (R8). RLS
 * acota las filas al usuario autenticado; ningún `supabase.from` aquí (R7).
 */
export default function HistoryScreen() {
  const { exerciseId } = useParams<"exerciseId">();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadedResult | null>(null);

  const key = `${exerciseId ?? ""}#${attempt}`;

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const id = exerciseId ?? "";
      const [exerciseResult, historyResult] = await Promise.all([
        getExercise(id),
        getExerciseHistory(id),
      ]);
      if (active) {
        setResult({
          key,
          error: exerciseResult.error !== null || historyResult.error !== null,
          exercise: exerciseResult.data,
          logs: historyResult.data ?? [],
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [key, exerciseId]);

  const loaded = result !== null && result.key === key ? result : null;
  const exercise = loaded?.error === false ? loaded.exercise : null;

  function renderBody(): ReactElement {
    if (loaded === null) {
      return (
        <p role="status" className="animate-pulse py-10 text-center text-lg text-slate-300">
          Cargando historial…
        </p>
      );
    }

    if (loaded.error) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <p role="alert" className="text-center text-lg text-red-400">
            {LOGS_ERROR_HISTORY}
          </p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-lg bg-sky-600 px-6 text-base font-semibold text-white transition-colors hover:bg-sky-500"
          >
            Reintentar
          </button>
        </div>
      );
    }

    if (loaded.exercise === null) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <p className="text-center text-lg text-slate-300">Ejercicio no encontrado</p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-sky-600 px-6 text-base font-semibold text-white transition-colors hover:bg-sky-500"
          >
            Volver a Hoy
          </Link>
        </div>
      );
    }

    const sessions = groupByDate(loaded.logs);

    if (sessions.length === 0) {
      return (
        <p className="py-10 text-center text-lg text-slate-300">
          Aún no hay registros de este ejercicio
        </p>
      );
    }

    return (
      <section className="flex flex-col gap-3">
        {sessions.map((session) => (
          <SessionCard key={session.date} date={session.date} sets={session.sets} />
        ))}
      </section>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-slate-900 p-4 text-slate-100">
      <header className="flex items-center gap-3">
        <Link
          to="/"
          aria-label="Volver"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl font-bold text-slate-100 transition-colors hover:bg-slate-700"
        >
          ‹
        </Link>
        <h1 className="text-xl leading-tight font-bold">{exercise?.name ?? "Historial"}</h1>
      </header>

      {renderBody()}
    </main>
  );
}
