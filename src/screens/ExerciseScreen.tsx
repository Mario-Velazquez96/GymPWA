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

/** Acción primaria: horizonte con texto blanco (Reintentar, Volver a Hoy). */
const PRIMARY_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-sm bg-horizon px-6 text-base font-bold text-day transition-colors duration-150 active:bg-none active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none";

/** Control secundario de noche: borde de día, sin relleno. */
const SECONDARY_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-sm border-2 border-day bg-transparent text-base font-bold text-day transition-colors duration-150 hover:bg-day hover:text-cyc-black motion-reduce:transition-none";

/**
 * Control terciario: misma caja de 44 px y mismo borde de día que el
 * secundario, al 60 %. Lo llevan las acciones que solo navegan o añaden
 * ("Ver historial", "Agregar serie") para que no se confundan con el
 * "Guardar serie" de una fila pendiente, que sí escribe (regresión R1 de la
 * revisión de cierre). El primario —horizonte— sigue siendo de la fila activa.
 */
const TERTIARY_CLASS = `${SECONDARY_CLASS} opacity-60`;

/** Metas del plan: "4 × 8-12" + "Descanso: N s" cuando hay descanso (R4). */
function TargetBadge({ detail }: { detail: PlanExerciseDetail }) {
  return (
    <p className="text-center text-3xl font-extrabold text-day tabular-nums">
      {detail.target_sets} × {detail.target_reps}
      {detail.rest_seconds !== null && (
        <span className="text-lg font-normal text-day/60">
          {" "}
          · Descanso: {detail.rest_seconds} s
        </span>
      )}
    </p>
  );
}

/** Atribución obligatoria de la media de ejercicios (R6). */
function Attribution() {
  return (
    <p className="text-center text-xs text-day/60">
      <a
        href="https://gymvisual.com/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center underline underline-offset-4 transition-colors duration-150 hover:text-day motion-reduce:transition-none"
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
        <p
          role="status"
          className="animate-pulse py-10 text-center text-lg text-day/60 motion-reduce:animate-none"
        >
          Cargando ejercicio…
        </p>
      );
    }

    if (loaded.error !== null) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 py-10">
          <p role="alert" className="text-center text-base font-semibold text-cue-fault">
            {loaded.error}
          </p>
          <button type="button" onClick={retry} className={PRIMARY_CLASS}>
            Reintentar
          </button>
        </div>
      );
    }

    if (detail === null) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 py-10">
          <p className="text-center text-lg text-day/90">Ejercicio no encontrado</p>
          <Link to="/" className={PRIMARY_CLASS}>
            Volver a Hoy
          </Link>
        </div>
      );
    }

    const exercise = detail.exercises;

    return (
      <article className="flex flex-col gap-4 px-4 pt-4">
        <ExerciseMedia
          name={exercise.name}
          imageUrl={exercise.image_url}
          gifUrl={exercise.gif_url}
        />

        <TargetBadge detail={detail} />

        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-sm border border-day/40 px-3 py-1.5 text-sm text-day/90">
            {exercise.equipment}
          </span>
          <span className="rounded-sm border border-day/40 px-3 py-1.5 text-sm text-day/90">
            {exercise.target}
          </span>
        </div>

        {detail.notes !== null && (
          <p className="rounded-sm border-2 border-dawn-rose bg-cyc-black p-3 text-base text-day/90">
            {detail.notes}
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-day">Instrucciones</h2>
          <InstructionSteps steps={exercise.instruction_steps_es} />
        </section>

        <LoggingSection planExercise={detail} />

        <Link to={`/historial/${exercise.id}`} className={`${TERTIARY_CLASS} w-full px-6`}>
          Ver historial
        </Link>

        <Attribution />
      </article>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cyc-black pb-24 text-day">
      <header className="flex items-center gap-3 border-b border-blackout px-4 py-2">
        <Link to="/" aria-label="Volver" className={`${SECONDARY_CLASS} min-w-11 shrink-0 text-xl`}>
          ‹
        </Link>
        <h1 className="text-2xl leading-tight font-bold">
          {detail?.exercises.name ?? "Ejercicio"}
        </h1>
      </header>

      {renderBody()}
    </main>
  );
}
