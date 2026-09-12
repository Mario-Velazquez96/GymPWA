import { formatHora, formatMinutes, type WindowState } from "@/lib/diet";
import type { DietPlan } from "@/lib/types";

interface EatingWindowProps {
  plan: Pick<DietPlan, "ventana_inicio" | "ventana_fin">;
  state: WindowState;
}

/** Texto de la segunda línea según el estado de la ventana (tabla del design, R8). */
function describeState(state: WindowState): string {
  switch (state.kind) {
    case "sin_ventana":
      return "";
    case "antes": {
      const faltan = formatMinutes(state.minutesToNext);
      if (state.nextMeal === null || state.nextMeal.hora === null) {
        return `Fuera de la ventana · faltan ${faltan} para que abra la ventana`;
      }
      return `Fuera de la ventana · faltan ${faltan} para ${state.nextMeal.title} (${formatHora(state.nextMeal.hora)})`;
    }
    case "dentro": {
      if (state.nextMeal === null || state.nextMeal.hora === null) {
        return `Dentro de la ventana · no quedan comidas hoy; cierra a las ${state.closesAt}`;
      }
      return `Dentro de la ventana · siguiente: ${state.nextMeal.title} (${formatHora(state.nextMeal.hora)})`;
    }
    case "despues": {
      if (state.nextMeal === null || state.nextMeal.hora === null) {
        return `Ventana cerrada · abre mañana a las ${state.opensAt}`;
      }
      return `Ventana cerrada · próxima comida mañana a las ${formatHora(state.nextMeal.hora)} (${state.nextMeal.title})`;
    }
  }
}

/** Fase literal de la ventana (14 R22, decisión B): antes = noche, dentro = día, después = apagón. */
type WindowPhase = "night" | "day" | "blackout" | "none";

const PHASE: Record<WindowState["kind"], { phase: WindowPhase; className: string }> = {
  antes: { phase: "night", className: "border-2 border-day bg-cyc-black text-day" },
  dentro: { phase: "day", className: "dawn-sweep dawn-sweep-day horizon-edge-l" },
  despues: { phase: "blackout", className: "bg-blackout text-day/90" },
  sin_ventana: { phase: "none", className: "border border-blackout bg-cyc-black text-day/60" },
};

/**
 * Ventana de alimentación y su estado ahora mismo (R8, R9). Presentacional:
 * no lee el reloj — el estado llega calculado por `getWindowState`. El texto
 * siempre dice el estado; la fase visual solo lo acompaña.
 */
export default function EatingWindow({ plan, state }: EatingWindowProps) {
  const hasWindow =
    state.kind !== "sin_ventana" && plan.ventana_inicio !== null && plan.ventana_fin !== null;

  const { phase, className } = PHASE[state.kind];

  return (
    <section aria-labelledby="ventana" data-phase={phase} className={`px-4 py-3 ${className}`}>
      <h2 id="ventana" className="text-base font-bold">
        {hasWindow
          ? `Ventana de alimentación ${formatHora(plan.ventana_inicio ?? "")}–${formatHora(plan.ventana_fin ?? "")}`
          : "Este plan no tiene ventana de ayuno"}
      </h2>
      {hasWindow && <p className="mt-1 text-sm">{describeState(state)}</p>}
    </section>
  );
}
