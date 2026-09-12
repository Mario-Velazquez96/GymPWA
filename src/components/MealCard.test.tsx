import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MealCard from "@/components/MealCard";
import type { DietMeal } from "@/lib/types";

function makeMeal(overrides: Partial<DietMeal> = {}): DietMeal {
  return {
    id: "meal-1",
    diet_plan_id: "diet-1",
    position: 1,
    title: "Desayuno fuerte",
    hora: "10:00:00",
    kcal: 1050,
    proteina_g: 85,
    items: ["4 huevos enteros", "80 g de avena", "1 plátano"],
    notes: "Si entrenas antes, mueve la fruta al post-entreno",
    ...overrides,
  };
}

describe("MealCard (R12)", () => {
  it("encabeza con 'título · HH:MM' sin los segundos de Postgres", () => {
    render(<MealCard meal={makeMeal()} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Desayuno fuerte · 10:00" }),
    ).toBeInTheDocument();
  });

  it("sin hora, el encabezado es solo el título (sin separador huérfano)", () => {
    render(<MealCard meal={makeMeal({ hora: null })} />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Desayuno fuerte");
    expect(heading.textContent).not.toContain("·");
  });

  it("muestra la línea '<kcal> kcal · <proteína> g proteína'", () => {
    render(<MealCard meal={makeMeal()} />);

    expect(screen.getByText("1050 kcal · 85 g proteína")).toBeInTheDocument();
  });

  it("omite la parte nula de la línea de macros sin dejar el separador", () => {
    render(<MealCard meal={makeMeal({ proteina_g: null })} />);

    expect(screen.getByText("1050 kcal")).toBeInTheDocument();
    expect(screen.queryByText(/proteína/)).not.toBeInTheDocument();
  });

  it("sin kcal ni proteína no renderiza la línea de macros", () => {
    render(<MealCard meal={makeMeal({ kcal: null, proteina_g: null })} />);

    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/proteína/)).not.toBeInTheDocument();
  });

  it("lista cada renglón de items como un <li> en orden", () => {
    render(<MealCard meal={makeMeal()} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "4 huevos enteros",
      "80 g de avena",
      "1 plátano",
    ]);
  });

  it("sin items no renderiza lista vacía", () => {
    render(<MealCard meal={makeMeal({ items: [] })} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("muestra las notas cuando existen", () => {
    render(<MealCard meal={makeMeal()} />);

    expect(
      screen.getByText("Si entrenas antes, mueve la fruta al post-entreno"),
    ).toBeInTheDocument();
  });

  it("omite las notas cuando son null", () => {
    render(<MealCard meal={makeMeal({ notes: null })} />);

    expect(screen.queryByText(/Si entrenas antes/)).not.toBeInTheDocument();
    expect(screen.getByRole("article").querySelectorAll("p")).toHaveLength(1);
  });

  it("omite las notas cuando son una cadena vacía", () => {
    render(<MealCard meal={makeMeal({ notes: "" })} />);

    expect(screen.getByRole("article").querySelectorAll("p")).toHaveLength(1);
  });
});

describe("MealCard — 14 ciclorama (R23)", () => {
  it("banda nocturna con costura, título en negrita blanca y viñetas rosas", () => {
    render(<MealCard meal={makeMeal()} />);

    const article = screen.getByRole("article");
    expect(article).toHaveClass("border-b", "border-blackout");
    expect(article.className).not.toMatch(/rounded|bg-/);
    expect(screen.getByRole("heading", { level: 3 })).toHaveClass(
      "text-lg",
      "font-bold",
      "text-day",
    );
    expect(screen.getByText("1050 kcal · 85 g proteína")).toHaveClass("text-day/60");
    expect(screen.getByRole("list")).toHaveClass(
      "list-disc",
      "marker:text-dawn-rose",
      "text-day/90",
    );
  });
});
