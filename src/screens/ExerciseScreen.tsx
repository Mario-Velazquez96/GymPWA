import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import ExerciseMedia from "@/components/ExerciseMedia";
import InstructionSteps from "@/components/InstructionSteps";
import LoggingSection from "@/components/LoggingSection";
import type { PlanExerciseDetail } from "@/lib/types";
import { getPlanExerciseDetail } from "@/services/exercises";

/** Resultado de una carga, etiquetado con la clave id#intento (patrón de 03). */
interface LoadedResult {
  key: string;
  error: string | null;
  detail: PlanExerciseDetail | null;
}

/** Metas del plan: "4 × 8-12" + "Descanso: N s" cuando hay descanso (R4). */
function TargetBadge({ detail }: { detail: PlanExerciseDetail }) {
  return (
    <p className="text-center text-lg font-semibold text-slate-100">
      {detail.target_sets} × {detail.target_reps}
      {detail.rest_seconds !== null && (
        <span className="font-normal text-slate-300"> · Descanso: {detail.rest_seconds} s</span>
      )}
    </p>
  );
}

/** Atribución obligatoria de la media de ejercicios (R6). */
function Attribution() {
  return (
    <p className="text-center text-xs text-slate-500">
      <a
        href="https://gymvisual.com/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-slate-300"
      >
        © Gym visual — https://gymvisual.com/
      </a>
    </p>
  );
}

/**
 * Pantalla Ejercicio (RF-3), solo lectura: GIF con placeholder, metas del
 * plan, chips de equipo/músculo, notas del agente, pasos numerados en español
 * y atribución Gym Visual (R1–R6). Estados: carga, error con "Reintentar"
 * (R9) y "Ejercicio no encontrado" para ids inexistentes o filtrados por RLS
 * (R7). Bajo la info se monta <LoggingSection /> (05_workout_logging): la
 * única superficie de escritura de la app (solo `workout_logs`).
 */
export default function ExerciseScreen() {
  const { planExerciseId } = useParams<"planExerciseId">();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadedResult | null>(null);

  const key = `${planExerciseId ?? ""}#${attempt}`;

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const detailResult = await getPlanExerciseDetail(planExerciseId ?? "");
      if (active) {
        setResult({ key, error: detailResult.error, detail: detailResult.data });
      }
    })();

    return () => {
      active = false;
    };
  }, [key, planExerciseId]);

  const loaded = result !== null && result.key === key ? result : null;
  const detail = loaded?.detail ?? null;

  function renderBody(): ReactElement {
    if (loaded === null) {
      return (
        <p role="status" className="animate-pulse py-10 text-center text-lg text-slate-300">
          Cargando ejercicio…
        </p>
      );
    }

    if (loaded.error !== null) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <p role="alert" className="text-center text-lg text-red-400">
            {loaded.error}
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

    if (detail === null) {
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

    const exercise = detail.exercises;

    return (
      <article className="flex flex-col gap-4">
        <ExerciseMedia
          name={exercise.name}
          imageUrl={exercise.image_url}
          gifUrl={exercise.gif_url}
        />

        <TargetBadge detail={detail} />

        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
            {exercise.equipment}
          </span>
          <span className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
            {exercise.target}
          </span>
        </div>

        {detail.notes !== null && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-base text-amber-200">
            {detail.notes}
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Instrucciones</h2>
          <InstructionSteps steps={exercise.instruction_steps_es} />
        </section>

        <LoggingSection planExercise={detail} />

        <Link
          to={`/historial/${exercise.id}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-6 text-base font-semibold text-slate-100 transition-colors hover:bg-slate-700"
        >
          Ver historial
        </Link>

        <Attribution />
      </article>
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
        <h1 className="text-xl leading-tight font-bold">{detail?.exercises.name ?? "Ejercicio"}</h1>
      </header>

      {renderBody()}
    </main>
  );
}
