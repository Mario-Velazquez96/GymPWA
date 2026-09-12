import { useState } from "react";
import ExerciseCard from "@/components/ExerciseCard";
import { usePlanDay } from "@/hooks/usePlanDay";
import { addDaysISO, clampISO, formatDateEs, todayLocalISO } from "@/lib/utils";

/** Flechas ‹ › de la banda del día: cuadros secundarios de 44 px; apagón al deshabilitarse. */
const ARROW_CLASS =
  "pointer-events-auto flex min-h-11 min-w-11 items-center justify-center rounded-sm border-2 border-day bg-transparent text-xl font-bold text-day transition-colors duration-150 hover:bg-day hover:text-cyc-black active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none disabled:cursor-not-allowed disabled:border-blackout disabled:bg-blackout disabled:text-day/60 disabled:hover:bg-blackout";

/** Acción primaria (Reintentar): horizonte con texto blanco. */
const PRIMARY_CLASS =
  "min-h-11 rounded-sm bg-horizon px-6 text-base font-bold text-day transition-colors duration-150 active:bg-none active:bg-dawn-rose active:text-cyc-black motion-reduce:transition-none";

/**
 * Pantalla Hoy (RF-2): día del plan activo para la fecha seleccionada, con
 * navegación ‹ fecha › acotada a start_date–end_date (R6) y los cuatro estados
 * del cuerpo — ejercicios (R1), descanso (R3), día sin asignar (R4) y sin plan
 * activo (R5) — más carga y error con reintento (R8). Solo lectura.
 *
 * Banda de horizonte del día (14 R9/R10, enmienda 1 del spec): el `<h1>Hoy`
 * conserva texto y rol pero baja a tamaño de kicker y comparte línea con la
 * fecha ("HOY · LUN 14 SEP"); el **título del día** es el texto protagonista
 * de la banda (22 px, `<h2>`), porque es lo que Mario abre la app para leer y
 * al navegar con ‹ › cambia. Ya no hay franja nocturna con el título debajo de
 * la banda: cuando el día no tiene título, es de descanso o no hay plan, la
 * banda se queda en su línea de kicker y el estado lo dice el cuerpo con el
 * vocabulario único de R12 (sin duplicar copy ni dejar franja huérfana).
 * Todo el texto vive en la mitad superior (cobalto) y las flechas van
 * centradas, para que el blanco nunca caiga sobre el rosa puro. Las bandas de
 * ejercicio van todas en noche (decisión C-1): la fase viva se muestra en la
 * pantalla Ejercicio.
 */
export default function TodayScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(todayLocalISO);
  const { loading, error, plan, day, exercises, retry } = usePlanDay(selectedDate);

  // El título del día manda en la banda; en carga, error, descanso, día sin
  // asignar o sin plan no hay título y la banda se queda en su kicker (el
  // estado lo dice el cuerpo, sin duplicar copy).
  const bandTitle = !loading && error === null && day !== null && !day.is_rest ? day.title : null;

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
        <p
          role="status"
          className="animate-pulse py-10 text-center text-lg text-day/60 motion-reduce:animate-none"
        >
          Cargando rutina…
        </p>
      );
    }

    if (error !== null) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 py-10">
          <p role="alert" className="text-center text-base font-semibold text-cue-fault">
            {error}
          </p>
          <button type="button" onClick={retry} className={PRIMARY_CLASS}>
            Reintentar
          </button>
        </div>
      );
    }

    if (plan === null) {
      return <p className="px-4 py-10 text-center text-lg text-day/90">Sin plan activo</p>;
    }

    if (day === null) {
      return (
        <p className="px-4 py-10 text-center text-lg text-day/90">
          Sin rutina asignada para este día
        </p>
      );
    }

    if (day.is_rest) {
      return <p className="px-4 py-10 text-center text-lg text-day/90">Día de descanso 💤</p>;
    }

    return (
      <section className="flex flex-col">
        <ul className="divide-y divide-blackout border-b border-blackout">
          {exercises.map((planExercise, index) => (
            <li key={planExercise.id}>
              <ExerciseCard planExercise={planExercise} order={index + 1} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cyc-black pb-24 text-day">
      <section className="relative flex min-h-24 flex-col bg-horizon px-4 py-2 text-day">
        <div
          className={`flex flex-col gap-1 ${plan !== null ? "mx-14 items-center text-center" : ""}`}
        >
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-xs leading-4 font-bold tracking-plot uppercase">Hoy</h1>
            <span aria-hidden="true" className="text-xs leading-4 font-bold">
              ·
            </span>
            <p className="text-xs leading-4 font-bold tracking-plot tabular-nums uppercase">
              {formatDateEs(selectedDate)}
            </p>
          </div>
          {bandTitle !== null && (
            <h2 className="text-[22px] leading-7 font-bold text-day">{bandTitle}</h2>
          )}
        </div>

        {plan !== null && (
          <nav
            aria-label="Navegación de días"
            className="pointer-events-none absolute inset-x-4 inset-y-0 flex items-center justify-between"
          >
            <button
              type="button"
              aria-label="Día anterior"
              disabled={prevDisabled}
              onClick={() => goToDay(-1)}
              className={ARROW_CLASS}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Día siguiente"
              disabled={nextDisabled}
              onClick={() => goToDay(1)}
              className={ARROW_CLASS}
            >
              ›
            </button>
          </nav>
        )}
      </section>

      {renderBody()}
    </main>
  );
}
