import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExerciseCard from "@/components/ExerciseCard";
import type { PlanExerciseWithExercise } from "@/lib/types";

const planExercise: PlanExerciseWithExercise = {
  id: "pe-1",
  plan_day_id: "day-1",
  exercise_id: "0001",
  position: 1,
  target_sets: 4,
  target_reps: "8-12",
  rest_seconds: 90,
  notes: null,
  exercises: {
    id: "0001",
    name: "Press de banca",
    image_url: "https://storage.example/0001.png",
    equipment: "barbell",
    target: "pectorals",
  },
};

function renderCard() {
  render(
    <MemoryRouter>
      <ExerciseCard planExercise={planExercise} />
    </MemoryRouter>,
  );
}

describe("ExerciseCard (R1, R7, R10)", () => {
  it("muestra nombre, series × reps y el thumbnail con alt (R1)", () => {
    renderCard();

    expect(screen.getByText("Press de banca")).toBeInTheDocument();
    expect(screen.getByText("4 × 8-12")).toBeInTheDocument();

    const img = screen.getByRole("img", { name: "Press de banca" });
    expect(img).toHaveAttribute("src", "https://storage.example/0001.png");
    expect(img).toHaveAttribute("width", "56");
    expect(img).toHaveAttribute("height", "56");
  });

  it("es un link a /ejercicio/<plan_exercise.id> — el id de plan_exercises, no el del catálogo (R7)", () => {
    renderCard();

    const link = screen.getByRole("link", { name: /Press de banca/ });
    expect(link).toHaveAttribute("href", "/ejercicio/pe-1");
  });

  it("tiene target táctil ≥ 44px (min-h-11, R10)", () => {
    renderCard();

    expect(screen.getByRole("link", { name: /Press de banca/ })).toHaveClass("min-h-11");
  });
});

describe("ExerciseCard — 14 ciclorama (R10, R11)", () => {
  function renderWith(props: { order?: number; phase?: "night" | "dawn" | "day" }) {
    render(
      <MemoryRouter>
        <ExerciseCard planExercise={planExercise} {...props} />
      </MemoryRouter>,
    );
    return screen.getByRole("link", { name: /Press de banca/ });
  }

  it("sin phase es una banda nocturna (data-phase=night) sin filo ni día", () => {
    const link = renderWith({});

    expect(link).toHaveAttribute("data-phase", "night");
    expect(link).toHaveClass("bg-cyc-black", "min-h-11");
    expect(link).not.toHaveClass("horizon-edge-l");
    expect(link).not.toHaveClass("dawn-sweep-day");
  });

  it("phase=dawn añade el filo de horizonte a la izquierda", () => {
    const link = renderWith({ phase: "dawn" });

    expect(link).toHaveAttribute("data-phase", "dawn");
    expect(link).toHaveClass("horizon-edge-l", "bg-cyc-black");
    expect(link).not.toHaveClass("dawn-sweep-day");
  });

  it("phase=day amanece: banda blanca con tinta negra", () => {
    const link = renderWith({ phase: "day" });

    expect(link).toHaveAttribute("data-phase", "day");
    expect(link).toHaveClass("dawn-sweep", "dawn-sweep-day");
    expect(link).not.toHaveClass("horizon-edge-l");
  });

  it("con order muestra el kicker zero-padded; sin order no hay kicker", () => {
    renderWith({ order: 3 });
    expect(screen.getByText("03")).toHaveClass("tracking-plot", "tabular-nums", "uppercase");
    cleanup();

    renderWith({});
    expect(screen.queryByText(/^\d{2}$/)).not.toBeInTheDocument();
  });

  it("'S × R' sigue siendo un solo texto tabular a la derecha y el thumb es apagón", () => {
    renderWith({ order: 1 });

    const meta = screen.getByText("4 × 8-12");
    expect(meta).toHaveClass("tabular-nums", "text-lg", "font-bold", "ml-auto");
    expect(screen.getByRole("img", { name: "Press de banca" })).toHaveClass(
      "bg-blackout",
      "rounded-sm",
      "h-14",
      "w-14",
    );
  });
});

describe("ExerciseCard — correcciones de la revisión de cierre (finish-review-14)", () => {
  function renderWith(props: { order?: number; phase?: "night" | "dawn" | "day" }) {
    render(
      <MemoryRouter>
        <ExerciseCard planExercise={planExercise} {...props} />
      </MemoryRouter>,
    );
    return screen.getByRole("link", { name: /Press de banca/ });
  }

  it("fix 1: el nombre envuelve dentro de la banda (hasta tres líneas), nunca se trunca", () => {
    renderWith({ order: 1 });

    const name = screen.getByText("Press de banca");
    expect(name).toHaveClass("line-clamp-3", "leading-5", "min-w-0", "flex-1");
    expect(name).not.toHaveClass("truncate");
    // El nombre accesible del link sigue siendo el nombre completo del ejercicio.
    expect(screen.getByRole("link", { name: /Press de banca/ })).toBeInTheDocument();
    expect(name.textContent).toBe("Press de banca");
  });

  it("fix 3: el thumbnail se atenúa en noche y amanecer, y va a luz plena en día", () => {
    renderWith({});
    expect(screen.getByRole("img", { name: "Press de banca" })).toHaveClass("opacity-75");
    cleanup();

    renderWith({ phase: "dawn" });
    expect(screen.getByRole("img", { name: "Press de banca" })).toHaveClass("opacity-75");
    cleanup();

    renderWith({ phase: "day" });
    const dayThumb = screen.getByRole("img", { name: "Press de banca" });
    expect(dayThumb).toHaveClass("opacity-100");
    expect(dayThumb).not.toHaveClass("opacity-75");
    // La imagen y su texto alternativo no se tocan en ninguna fase.
    expect(dayThumb).toHaveAttribute("src", "https://storage.example/0001.png");
  });

  it("fix 5: el hover de la banda no usa el token de deshabilitado", () => {
    const night = renderWith({});
    expect(night).toHaveClass("hover:bg-day/10");
    // El apagón (token de deshabilitado) no aparece en ningún hover de la banda.
    expect(night.className).not.toContain("bg-blackout");
    cleanup();

    const dawn = renderWith({ phase: "dawn" });
    expect(dawn).toHaveClass("hover:bg-day/10", "horizon-edge-l");
    expect(dawn.className).not.toContain("bg-blackout");
  });
});
