import type { ReactElement } from "react";
import Checklist from "@/components/Checklist";
import CollapsibleSection from "@/components/CollapsibleSection";
import EatingWindow from "@/components/EatingWindow";
import MacroSummary from "@/components/MacroSummary";
import Markdown from "@/components/Markdown";
import MealCard from "@/components/MealCard";
import OfflineBanner from "@/components/OfflineBanner";
import SupplementList from "@/components/SupplementList";
import { useChecklist } from "@/hooks/useChecklist";
import { useDietPlan } from "@/hooks/useDietPlan";
import { useNowMinutes } from "@/hooks/useNowMinutes";
import { selectChecklist } from "@/lib/checklist";
import { getWindowState, sortByPosition } from "@/lib/diet";

/**
 * Pantalla Dieta (RF-D1–RF-D9), solo lectura sobre Supabase: macros del día,
 * ventana de alimentación con su estado ahora mismo, comidas en orden,
 * suplementos, las dos listas tachables ("Qué cocinar" con la rotación de la
 * semana debajo y "Lista de súper" agrupada por categoría) y las secciones
 * informativas restantes (11 R9–R13). Estados explícitos de carga (10 R16),
 * sin plan (10 R17) y error con "Reintentar" (10 R18).
 *
 * La hora viene de `useNowMinutes` (zona `America/Mexico_City`), que recalcula
 * cada 60 s sin volver a consultar Supabase (10 R10). El tachado vive en el
 * dispositivo vía `useChecklist`: la app no escribe nada en la base (11 R15).
 *
 * Sin señal, `useDietPlan` entrega el último plan guardado en el dispositivo y
 * bajo el `<h1>` aparece `OfflineBanner` con la fecha del snapshot (12 R12).
 */
export default function DietScreen() {
  const { loading, error, plan, retry, isStale, savedAt } = useDietPlan();
  const nowMinutes = useNowMinutes();

  // Los hooks van SIEMPRE antes de cualquier retorno temprano y en el mismo
  // orden. Sin plan la clave es `gym:diet:check::<kind>`, que nunca se escribe
  // porque tampoco se renderiza ninguna lista (11 R14).
  const mealPrepCheck = useChecklist(plan?.id ?? "", "meal_prep");
  const superCheck = useChecklist(plan?.id ?? "", "super");

  function renderBody(): ReactElement {
    if (loading) {
      return (
        <p role="status" className="animate-pulse py-10 text-center text-lg text-slate-300">
          Cargando dieta…
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
      return (
        <p className="py-10 text-center text-lg text-slate-300">
          Aún no tienes un plan de dieta asignado
        </p>
      );
    }

    const mealPrep = selectChecklist(plan.diet_checklist_items, "meal_prep");
    const superItems = selectChecklist(plan.diet_checklist_items, "super");
    // La rotación de la semana se muestra bajo el meal prep, no como una
    // colapsable genérica del final (11 R11, cambio deliberado sobre 10 R14).
    // `sortByPosition` se reaplica por robustez, igual que `selectChecklist`:
    // el orden asc lo exige R11 y no debe depender solo del service (10).
    const rotacion = sortByPosition(
      plan.diet_sections.filter((section) => section.kind === "rotacion"),
    );
    const otrasSecciones = plan.diet_sections.filter((section) => section.kind !== "rotacion");

    return (
      <>
        <p className="text-sm text-slate-400">{plan.name}</p>

        <MacroSummary plan={plan} />

        <EatingWindow plan={plan} state={getWindowState(plan, plan.diet_meals, nowMinutes)} />

        <section aria-labelledby="comidas" className="flex flex-col gap-3">
          <h2 id="comidas" className="text-xl font-semibold text-slate-100">
            Comidas
          </h2>
          {plan.diet_meals.length === 0 ? (
            <p className="text-base text-slate-300">Este plan no tiene comidas</p>
          ) : (
            plan.diet_meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
          )}
        </section>

        <SupplementList supplements={plan.diet_supplements} />

        {(mealPrep.length > 0 || rotacion.length > 0) && (
          <CollapsibleSection title="Qué cocinar">
            {mealPrep.length > 0 && (
              <Checklist
                title="Qué cocinar"
                items={mealPrep}
                checked={mealPrepCheck.checked}
                onToggle={mealPrepCheck.toggle}
                onClearAll={mealPrepCheck.clearAll}
              />
            )}
            {rotacion.map((section) => (
              <div key={section.id} className="mt-4">
                <h3 className="font-semibold text-slate-100">{section.title}</h3>
                <Markdown source={section.body_md} />
              </div>
            ))}
          </CollapsibleSection>
        )}

        {superItems.length > 0 && (
          <CollapsibleSection title="Lista de súper">
            <Checklist
              title="Lista de súper"
              items={superItems}
              groupByCategoria
              checked={superCheck.checked}
              onToggle={superCheck.toggle}
              onClearAll={superCheck.clearAll}
            />
          </CollapsibleSection>
        )}

        {otrasSecciones.length > 0 && (
          <section aria-labelledby="secciones" className="flex flex-col gap-2">
            <h2 id="secciones" className="text-xl font-semibold text-slate-100">
              Más del plan
            </h2>
            {otrasSecciones.map((section) => (
              <CollapsibleSection key={section.id} title={section.title}>
                <Markdown source={section.body_md} />
              </CollapsibleSection>
            ))}
          </section>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-slate-900 p-4 pb-24 text-slate-100">
      <h1 className="text-2xl font-bold">Dieta</h1>
      {isStale && savedAt !== null && <OfflineBanner savedAt={savedAt} />}
      {renderBody()}
    </main>
  );
}
