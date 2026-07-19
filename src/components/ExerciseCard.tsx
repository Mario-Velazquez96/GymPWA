import { Link } from "react-router-dom";
import type { PlanExerciseWithExercise } from "@/lib/types";

interface ExerciseCardProps {
  planExercise: PlanExerciseWithExercise;
}

/**
 * Card de ejercicio de la pantalla Hoy (R1, R7, R10): thumbnail 56px, nombre y
 * meta "series × reps"; toda la card es un link táctil ≥ 44px al detalle
 * `/ejercicio/<plan_exercise.id>` (placeholder hasta 04_exercise_detail).
 */
export default function ExerciseCard({ planExercise }: ExerciseCardProps) {
  const exercise = planExercise.exercises;

  return (
    <Link
      to={`/ejercicio/${planExercise.id}`}
      className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-800 p-3 transition-colors hover:bg-slate-700"
    >
      <img
        src={exercise.image_url}
        alt={exercise.name}
        width={56}
        height={56}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-lg bg-slate-700 object-cover"
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base font-semibold text-slate-100">{exercise.name}</span>
        <span className="text-sm text-slate-400">
          {planExercise.target_sets} × {planExercise.target_reps}
        </span>
      </span>
    </Link>
  );
}
