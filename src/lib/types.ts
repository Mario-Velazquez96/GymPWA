/**
 * Tipos de fila que espejan `supabase/migrations/001_schema.sql`
 * (solution_design.md §3). Fechas `date` → string ISO "YYYY-MM-DD";
 * `timestamptz` → string ISO con zona. Contrato entre repos: NO cambiar
 * formas sin abrir un open item para el humano.
 */

/** §3.1 exercises — catálogo (solo lectura; lo alimenta el repo Gym). */
export interface Exercise {
  id: string; // "0001".."1324" (contrato entre repos)
  name: string;
  body_part: string;
  equipment: string;
  target: string;
  muscle_group: string;
  secondary_muscles: string[];
  instructions_es: string;
  instruction_steps_es: string[];
  image_url: string;
  gif_url: string;
  attribution: string;
}

/** §3.2 plans — plan mensual generado por el agente (solo lectura). */
export interface Plan {
  id: string;
  user_id: string;
  name: string;
  goal: string | null;
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD"
  status: "active" | "archived";
  created_at: string;
}

/** §3.3 plan_days — un día del plan (solo lectura). */
export interface PlanDay {
  id: string;
  plan_id: string;
  day_date: string; // "YYYY-MM-DD"
  title: string | null;
  is_rest: boolean;
}

/** §3.4 plan_exercises — ejercicios asignados a un día (solo lectura). */
export interface PlanExercise {
  id: string;
  plan_day_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: string; // ej. "8-12", "5", "al fallo"
  rest_seconds: number | null;
  notes: string | null;
}

/** §3.5 workout_logs — la ÚNICA tabla que la app escribe (una fila por serie). */
export interface WorkoutLog {
  id: string;
  user_id: string;
  exercise_id: string;
  plan_exercise_id: string | null; // nullable: permite log libre
  performed_at: string; // "YYYY-MM-DD" (fecha local del dispositivo)
  set_number: number;
  reps: number;
  weight_kg: number;
  created_at: string;
}

/** Subconjunto de `exercises` que el join de la pantalla Hoy necesita. */
export type ExerciseSummary = Pick<Exercise, "id" | "name" | "image_url" | "equipment" | "target">;

/** Fila de `plan_exercises` con su ejercicio embebido (join del design 03). */
export interface PlanExerciseWithExercise extends PlanExercise {
  exercises: ExerciseSummary;
}

/** Fila de `plan_exercises` con el ejercicio completo (join del design 04). */
export interface PlanExerciseDetail extends PlanExercise {
  exercises: Exercise;
}
