import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
