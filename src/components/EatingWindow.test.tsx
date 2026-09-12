import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EatingWindow from "@/components/EatingWindow";
import type { WindowState } from "@/lib/diet";
import type { DietMeal, DietPlan } from "@/lib/types";

type WindowPlan = Pick<DietPlan, "ventana_inicio" | "ventana_fin">;

const plan: WindowPlan = { ventana_inicio: "10:00:00", ventana_fin: "18:00:00" };

function makeMeal(overrides: Partial<DietMeal> = {}): DietMeal {
  return {
    id: "meal-1",
    diet_plan_id: "diet-1",
    position: 1,
    title: "Desayuno fuerte",
    hora: "10:00:00",
    kcal: 1050,
    proteina_g: 85,
    items: ["4 huevos"],
    notes: null,
    ...overrides,
  };
}

function renderWindow(state: WindowState, planOverrides: Partial<WindowPlan> = {}): void {
  render(<EatingWindow plan={{ ...plan, ...planOverrides }} state={state} />);
}

describe("EatingWindow — encabezado de la ventana (R8, R9)", () => {
  it("muestra 'Ventana de alimentación 10:00–18:00' recortando los segundos", () => {
    renderWindow({ kind: "dentro", closesAt: "18:00", nextMeal: null });

    expect(
      screen.getByRole("heading", { name: "Ventana de alimentación 10:00–18:00" }),
    ).toBeInTheDocument();
  });

  it("sin ventana muestra 'Este plan no tiene ventana de ayuno' y ninguna hora (R9)", () => {
    renderWindow({ kind: "sin_ventana" }, { ventana_inicio: null, ventana_fin: null });

    expect(
      screen.getByRole("heading", { name: "Este plan no tiene ventana de ayuno" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Ventana de alimentación/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ventana ·/)).not.toBeInTheDocument();
  });
});

describe("EatingWindow — texto por estado (R8)", () => {
  it("antes de la ventana: cuánto falta para la siguiente comida", () => {
    renderWindow({
      kind: "antes",
      opensAt: "10:00",
      minutesToNext: 60,
      nextMeal: makeMeal(),
    });

    expect(
      screen.getByText("Fuera de la ventana · faltan 60 min para Desayuno fuerte (10:00)"),
    ).toBeInTheDocument();
  });

  it("antes de la ventana sin comidas con hora: cuenta hasta que abra la ventana", () => {
    renderWindow({ kind: "antes", opensAt: "10:00", minutesToNext: 600, nextMeal: null });

    expect(
      screen.getByText("Fuera de la ventana · faltan 10 h para que abra la ventana"),
    ).toBeInTheDocument();
  });

  it("dentro de la ventana: anuncia la siguiente comida", () => {
    renderWindow({
      kind: "dentro",
      closesAt: "18:00",
      nextMeal: makeMeal({ title: "Comida", hora: "14:00:00" }),
    });

    expect(
      screen.getByText("Dentro de la ventana · siguiente: Comida (14:00)"),
    ).toBeInTheDocument();
  });

  it("dentro de la ventana sin comidas restantes: avisa a qué hora cierra", () => {
    renderWindow({ kind: "dentro", closesAt: "18:00", nextMeal: null });

    expect(
      screen.getByText("Dentro de la ventana · no quedan comidas hoy; cierra a las 18:00"),
    ).toBeInTheDocument();
  });

  it("después de la ventana: próxima comida mañana", () => {
    renderWindow({ kind: "despues", opensAt: "10:00", nextMeal: makeMeal() });

    expect(
      screen.getByText("Ventana cerrada · próxima comida mañana a las 10:00 (Desayuno fuerte)"),
    ).toBeInTheDocument();
  });

  it("después de la ventana sin comidas con hora: solo la hora de apertura", () => {
    renderWindow({ kind: "despues", opensAt: "10:00", nextMeal: null });

    expect(screen.getByText("Ventana cerrada · abre mañana a las 10:00")).toBeInTheDocument();
  });

  it("una comida sin hora nunca se anuncia como siguiente", () => {
    renderWindow({
      kind: "dentro",
      closesAt: "18:00",
      nextMeal: makeMeal({ hora: null, title: "Snack libre" }),
    });

    expect(
      screen.getByText("Dentro de la ventana · no quedan comidas hoy; cierra a las 18:00"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Snack libre/)).not.toBeInTheDocument();
  });
});

describe("EatingWindow — presentacional (R8)", () => {
  it("no lee el reloj: el texto depende solo del estado recibido", () => {
    const dateSpy = vi.spyOn(globalThis, "Date");
    const intlSpy = vi.spyOn(Intl, "DateTimeFormat");

    renderWindow({ kind: "dentro", closesAt: "18:00", nextMeal: makeMeal() });

    expect(dateSpy).not.toHaveBeenCalled();
    expect(intlSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
    intlSpy.mockRestore();
  });
});

describe("EatingWindow — 14 ciclorama: fases literales (R22, decisión B)", () => {
  function section(): HTMLElement {
    const heading = screen.getByRole("heading", { level: 2 });
    const node = heading.closest("section");
    if (node === null) {
      throw new Error("EatingWindow no renderizó un <section>");
    }
    return node;
  }

  it("antes → noche (borde de día) con el texto intacto", () => {
    renderWindow({ kind: "antes", opensAt: "10:00", minutesToNext: 60, nextMeal: makeMeal() });

    expect(section()).toHaveAttribute("data-phase", "night");
    expect(section()).toHaveClass("border-2", "border-day", "bg-cyc-black");
    expect(section()).not.toHaveClass("dawn-sweep-day");
    expect(
      screen.getByText("Fuera de la ventana · faltan 60 min para Desayuno fuerte (10:00)"),
    ).toBeInTheDocument();
  });

  it("dentro → día blanco con filo de horizonte", () => {
    renderWindow({ kind: "dentro", closesAt: "18:00", nextMeal: null });

    expect(section()).toHaveAttribute("data-phase", "day");
    expect(section()).toHaveClass("dawn-sweep", "dawn-sweep-day", "horizon-edge-l");
    expect(
      screen.getByText("Dentro de la ventana · no quedan comidas hoy; cierra a las 18:00"),
    ).toBeInTheDocument();
  });

  it("después → apagón", () => {
    renderWindow({ kind: "despues", opensAt: "10:00", nextMeal: null });

    expect(section()).toHaveAttribute("data-phase", "blackout");
    expect(section()).toHaveClass("bg-blackout", "text-day/90");
    expect(section()).not.toHaveClass("dawn-sweep-day");
    expect(screen.getByText("Ventana cerrada · abre mañana a las 10:00")).toBeInTheDocument();
  });

  it("sin ventana → none (costura de apagón, texto atenuado)", () => {
    renderWindow({ kind: "sin_ventana" }, { ventana_inicio: null, ventana_fin: null });

    expect(section()).toHaveAttribute("data-phase", "none");
    expect(section()).toHaveClass("border-blackout", "text-day/60");
    expect(section()).not.toHaveClass("dawn-sweep-day");
  });
});
