import { Link } from "react-router-dom";
import type { PlanExerciseWithExercise } from "@/lib/types";

/** Fase visual de la banda (14 R11): noche → filo (en curso) → día (completo). */
export type ExercisePhase = "night" | "dawn" | "day";

interface ExerciseCardProps {
  planExercise: PlanExerciseWithExercise;
  /** Número de orden en el plan (1-based) para el kicker "01"; omitido si undefined. */
  order?: number;
  /**
   * Fase visual de la banda; default `"night"`. En 14 `TodayScreen` no la
   * pasa (decisión C-1): queda latente para una feature posterior que sepa
   * qué ejercicios tienen series guardadas hoy.
   */
  phase?: ExercisePhase;
}

const PHASE_CLASS: Record<ExercisePhase, string> = {
  night: "bg-cyc-black hover:bg-day/10",
  dawn: "bg-cyc-black horizon-edge-l hover:bg-day/10",
  day: "dawn-sweep dawn-sweep-day",
};

/**
 * El thumbnail viene del catálogo con fondo blanco: a plena luz sería el
 * elemento más claro de la banda y robaría el estado "día" (reservado a lo
 * guardado y completo). En noche y amanecer se atenúa lo justo (blanco 244
 * sobre el apagón del marco ≈ 197: por debajo del blanco puro de lo guardado,
 * pero con la figura de línea todavía legible a un brazo de distancia bajo luz
 * fuerte de gym); en día vuelve a luz plena. La imagen y su `alt` no se tocan.
 */
const THUMB_CLASS: Record<ExercisePhase, string> = {
  night: "opacity-75",
  dawn: "opacity-75",
  day: "opacity-100",
};

/**
 * Banda de ejercicio de la pantalla Hoy (R1, R7, R10): 72 px de alto, kicker
 * de orden, thumbnail 56 px, nombre y "series × reps" en numerales tabulares
 * a la derecha; toda la banda es un link táctil ≥ 44px al detalle
 * `/ejercicio/<plan_exercise.id>`.
 *
 * El nombre manda sobre la altura exacta de la banda: a 390 px el ancho útil
 * del nombre es ~181 px (gutter 16, kicker al ancho de "01", thumb 56, "S × R"
 * y tres separaciones de 8 px), y el nombre más largo del plan necesita 185 px
 * para caber en dos líneas. Antes de bajar el cuerpo de 16 px —legibilidad a un
 * brazo de distancia, principio 2 de PRODUCT.md— se deja que esa única banda
 * llegue a 76 px con una tercera línea (`line-clamp-3`); las demás siguen en 72.
 */
export default function ExerciseCard({ planExercise, order, phase = "night" }: ExerciseCardProps) {
  const exercise = planExercise.exercises;

  return (
    <Link
      to={`/ejercicio/${planExercise.id}`}
      data-phase={phase}
      className={`flex min-h-11 items-center gap-2 px-4 py-2 transition-colors duration-150 motion-reduce:transition-none ${PHASE_CLASS[phase]}`}
    >
      {order !== undefined && (
        <span className="shrink-0 text-xs font-bold tracking-plot tabular-nums uppercase opacity-60">
          {String(order).padStart(2, "0")}
        </span>
      )}
      <img
        src={exercise.image_url}
        alt={exercise.name}
        width={56}
        height={56}
        loading="lazy"
        className={`h-14 w-14 shrink-0 rounded-sm bg-blackout object-cover ${THUMB_CLASS[phase]}`}
      />
      <span className="line-clamp-3 min-w-0 flex-1 text-base leading-5 font-semibold">
        {exercise.name}
      </span>
      <span className="ml-auto shrink-0 text-lg font-bold tabular-nums">
        {planExercise.target_sets} × {planExercise.target_reps}
      </span>
    </Link>
  );
}
