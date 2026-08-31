import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { WorkoutLog } from "@/lib/types";
import SessionCard from "@/components/SessionCard";

/** Fila mínima de workout_logs para el componente (06_history). */
function makeLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "log-1",
    user_id: "user-1",
    exercise_id: "0001",
    plan_exercise_id: "pe-1",
    performed_at: "2026-08-03",
    set_number: 1,
    reps: 10,
    weight_kg: 22.5,
    created_at: "2026-08-03T18:00:00Z",
    ...overrides,
  };
}

describe("SessionCard (06_history R2)", () => {
  it("muestra la fecha en español con año como encabezado", () => {
    render(<SessionCard date="2026-08-03" sets={[makeLog()]} />);

    expect(screen.getByRole("heading", { name: "lun 3 ago 2026" })).toBeInTheDocument();
  });

  it("renderiza cada serie como 'Serie N — X kg × Y' en orden por set_number", () => {
    const sets = [
      makeLog({ id: "a", set_number: 1, weight_kg: 22.5, reps: 10 }),
      makeLog({ id: "b", set_number: 2, weight_kg: 25, reps: 8 }),
    ];

    render(<SessionCard date="2026-08-03" sets={sets} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Serie 1 — 22.5 kg × 10",
      "Serie 2 — 25 kg × 8",
    ]);
  });

  it("un peso entero se muestra sin decimales (formatWeight, R7)", () => {
    render(<SessionCard date="2026-08-03" sets={[makeLog({ weight_kg: 40, reps: 5 })]} />);

    expect(screen.getByText("Serie 1 — 40 kg × 5")).toBeInTheDocument();
  });
});

describe("SessionCard — unidad de lectura (08 R6, R12, R15)", () => {
  it("sin prop `unit` mantiene el kg de 06 (R15)", () => {
    render(<SessionCard date="2026-08-03" sets={[makeLog({ weight_kg: 22.5, reps: 10 })]} />);

    expect(screen.getByText("Serie 1 — 22.5 kg × 10")).toBeInTheDocument();
  });

  it("con unit='kg' explícito el texto es idéntico", () => {
    render(
      <SessionCard date="2026-08-03" sets={[makeLog({ weight_kg: 22.5, reps: 10 })]} unit="kg" />,
    );

    expect(screen.getByText("Serie 1 — 22.5 kg × 10")).toBeInTheDocument();
  });

  it("con unit='lb' lee la misma fila en libras: 20.41 kg → 'Serie 1 — 45 lb × 10' (R12)", () => {
    render(
      <SessionCard date="2026-08-03" sets={[makeLog({ weight_kg: 20.41, reps: 10 })]} unit="lb" />,
    );

    expect(screen.getByText("Serie 1 — 45 lb × 10")).toBeInTheDocument();
  });

  it("con unit='lb' convierte también los pesos capturados en kg (22.5 kg → 49.6 lb)", () => {
    const sets = [
      makeLog({ id: "a", set_number: 1, weight_kg: 22.5, reps: 10 }),
      makeLog({ id: "b", set_number: 2, weight_kg: 25, reps: 8 }),
    ];

    render(<SessionCard date="2026-08-03" sets={sets} unit="lb" />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Serie 1 — 49.6 lb × 10",
      "Serie 2 — 55.1 lb × 8",
    ]);
  });
});
