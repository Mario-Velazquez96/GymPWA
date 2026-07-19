import { useState } from "react";
import ExerciseCard from "@/components/ExerciseCard";
import { usePlanDay } from "@/hooks/usePlanDay";
import { addDaysISO, clampISO, formatDateEs, todayLocalISO } from "@/lib/utils";

/**
 * Pantalla Hoy (RF-2): día del plan activo para la fecha seleccionada, con
 * navegación ‹ fecha › acotada a start_date–end_date (R6) y los cuatro estados
 * del cuerpo — ejercicios (R1), descanso (R3), día sin asignar (R4) y sin plan
 * activo (R5) — más carga y error con reintento (R8). Solo lectura.
 */
export default function TodayScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(todayLocalISO);
  const { loading, error, plan, day, exercises, retry } = usePlanDay(selectedDate);

  // Orden lexicográfico ISO = cronológico; en los bordes del plan se deshabilita (R6).
  const prevDisabled = plan === null || selectedDate <= plan.start_date;
  const nextDisabled = plan === null || selectedDate >= plan.end_date;

  function goToDay(delta: 1 | -1): void {
    if (plan === null) {
      return;
    }
    setSelectedDate(clampISO(addDaysISO(selectedDate, delta), plan.start_date, plan.end_date));
  }

  function renderBody() {
    if (loading) {
      return (
        <p role="status" className="animate-pulse py-10 text-center text-lg text-slate-300">
          Cargando rutina…
        </p>
      );
    }

    if (error !== null) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <p role="alert" className="text-center text-lg text-red-400">
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
      );
    }

    if (plan === null) {
      return <p className="py-10 text-center text-lg text-slate-300">Sin plan activo</p>;
    }

    if (day === null) {
      return (
        <p className="py-10 text-center text-lg text-slate-300">
          Sin rutina asignada para este día
        </p>
      );
    }

    if (day.is_rest) {
      return <p className="py-10 text-center text-lg text-slate-300">Día de descanso 💤</p>;
    }

    return (
      <section className="flex flex-col gap-3">
        {day.title !== null && (
          <h2 className="text-xl font-semibold text-slate-100">{day.title}</h2>
        )}
        <ul className="flex flex-col gap-2">
          {exercises.map((planExercise) => (
            <li key={planExercise.id}>
              <ExerciseCard planExercise={planExercise} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-slate-900 p-4 text-slate-100">
      <h1 className="text-2xl font-bold">Hoy</h1>

      {plan !== null && (
        <nav aria-label="Navegación de días" className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Día anterior"
            disabled={prevDisabled}
            onClick={() => goToDay(-1)}
            className="min-h-11 min-w-11 rounded-lg bg-slate-800 text-xl font-bold text-slate-100 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <p className="text-lg font-semibold">{formatDateEs(selectedDate)}</p>
          <button
            type="button"
            aria-label="Día siguiente"
            disabled={nextDisabled}
            onClick={() => goToDay(1)}
            className="min-h-11 min-w-11 rounded-lg bg-slate-800 text-xl font-bold text-slate-100 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </nav>
      )}

      {renderBody()}
    </main>
  );
}
