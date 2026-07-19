import { useParams } from "react-router-dom";

/** Pantalla provisional de ejercicio — el registro real llega en 04/05. */
export default function ExerciseScreen() {
  const { planExerciseId } = useParams<"planExerciseId">();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-slate-100">
      <h1 className="text-3xl font-bold">Ejercicio</h1>
      <p className="text-base text-slate-300">
        Pantalla en construcción{planExerciseId ? ` · ${planExerciseId}` : ""}
      </p>
    </main>
  );
}
