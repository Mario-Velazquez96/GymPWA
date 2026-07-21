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

  it("un peso entero se muestra sin decimales (formatKg, R7)", () => {
    render(<SessionCard date="2026-08-03" sets={[makeLog({ weight_kg: 40, reps: 5 })]} />);

    expect(screen.getByText("Serie 1 — 40 kg × 5")).toBeInTheDocument();
  });
});
