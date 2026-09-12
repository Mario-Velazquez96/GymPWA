import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import SessionCard from "@/components/SessionCard";
import { useExerciseUnit } from "@/hooks/useExerciseUnit";
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

/** Acción primaria: horizonte con texto blanco (Reintentar, Volver a Hoy). */
const PRIMARY_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-sm bg-horizon px-6 text-base font-bold text-day transition-colors duration-150 active:bg-none active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none";

/**
 * Pantalla Historial (RF-5), solo lectura: por ejercicio, todas las sesiones
 * registradas newest-first, cada una con sus series "Serie N — X kg × Y"
 * (R1, R2). Título = nombre del ejercicio (R3). Estados: carga, error con
 * "Reintentar" (R6), vacío "Aún no hay registros de este ejercicio" (R4) y
 * "Ejercicio no encontrado" con vuelta a Hoy para ids inexistentes (R8). RLS
 * acota las filas al usuario autenticado; ningún `supabase.from` aquí (R7).
 *
 * Las series se leen en la unidad que el ejercicio tenga guardada en el
 * dispositivo (08 R12): esta pantalla NO lleva toggle propio — la unidad se
 * cambia en la pantalla del ejercicio y aquí solo se respeta.
 *
 * Lo hecho es de día (14 R19, decisión A): las sesiones son bandas blancas
 * apiladas con 1 px de negro entre ellas; la más reciente lleva el filo.
 */
export default function HistoryScreen() {
  const { exerciseId } = useParams<"exerciseId">();
  const [unit] = useExerciseUnit(exerciseId ?? "");
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
        <p
          role="status"
          className="animate-pulse py-10 text-center text-lg text-day/60 motion-reduce:animate-none"
        >
          Cargando historial…
        </p>
      );
    }

    if (loaded.error) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 py-10">
          <p role="alert" className="text-center text-base font-semibold text-cue-fault">
            {LOGS_ERROR_HISTORY}
          </p>
          <button type="button" onClick={retry} className={PRIMARY_CLASS}>
            Reintentar
          </button>
        </div>
      );
    }

    if (loaded.exercise === null) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 py-10">
          <p className="text-center text-lg text-day/90">Ejercicio no encontrado</p>
          <Link to="/" className={PRIMARY_CLASS}>
            Volver a Hoy
          </Link>
        </div>
      );
    }

    const sessions = groupByDate(loaded.logs);

    if (sessions.length === 0) {
      return (
        <p className="px-4 py-10 text-center text-lg text-day/90">
          Aún no hay registros de este ejercicio
        </p>
      );
    }

    return (
      <section className="flex flex-col gap-px">
        {sessions.map((session, index) => (
          <SessionCard
            key={session.date}
            date={session.date}
            sets={session.sets}
            unit={unit}
            latest={index === 0}
          />
        ))}
      </section>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cyc-black pb-24 text-day">
      <header className="flex items-center gap-3 border-b border-blackout px-4 py-2">
        <Link
          to="/"
          aria-label="Volver"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm border-2 border-day text-xl font-bold text-day transition-colors duration-150 hover:bg-day hover:text-cyc-black motion-reduce:transition-none"
        >
          ‹
        </Link>
        <h1 className="text-2xl leading-tight font-bold">{exercise?.name ?? "Historial"}</h1>
      </header>

      {renderBody()}
    </main>
  );
}
