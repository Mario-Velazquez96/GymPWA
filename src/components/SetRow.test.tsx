import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SetRow from "@/components/SetRow";
import type { SetRowState } from "@/lib/logging";
import type { WorkoutLog } from "@/lib/types";

const onWeightChange = vi.fn();
const onRepsChange = vi.fn();
const onSave = vi.fn();

function makeRow(overrides: Partial<SetRowState> = {}): SetRowState {
  return {
    setNumber: 1,
    weight_kg: 22.5,
    reps: 10,
    status: "editable",
    message: null,
    ...overrides,
  };
}

const previousLog: WorkoutLog = {
  id: "log-1",
  user_id: "user-1",
  exercise_id: "0001",
  plan_exercise_id: "pe-1",
  performed_at: "2026-07-17",
  set_number: 1,
  reps: 10,
  weight_kg: 22.5,
  created_at: "2026-07-17T18:00:00Z",
};

function renderRow(row: SetRowState = makeRow(), previous: WorkoutLog | null = null) {
  render(
    <ul>
      <SetRow
        row={row}
        previous={previous}
        onWeightChange={onWeightChange}
        onRepsChange={onRepsChange}
        onSave={onSave}
      />
    </ul>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SetRow — columna Anterior (R2)", () => {
  it("con sesión anterior muestra 'Anterior: 22.5 × 10'", () => {
    renderRow(makeRow(), previousLog);

    expect(screen.getByText("Anterior: 22.5 × 10")).toBeInTheDocument();
  });

  it("sin sesión anterior muestra 'Anterior: —'", () => {
    renderRow(makeRow(), null);

    expect(screen.getByText("Anterior: —")).toBeInTheDocument();
  });

  it("muestra 'Serie N' con el número de la fila", () => {
    renderRow(makeRow({ setNumber: 3 }));

    expect(screen.getByRole("heading", { name: "Serie 3" })).toBeInTheDocument();
  });
});

describe("SetRow — steppers y guardado (R4, R5)", () => {
  it("los steppers de peso y reps propagan los cambios", async () => {
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Aumentar Peso serie 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Disminuir Repeticiones serie 1" }));

    expect(onWeightChange).toHaveBeenCalledWith(25);
    expect(onRepsChange).toHaveBeenCalledWith(9);
  });

  it("'Guardar serie' llama onSave y mide ≥ 44px", async () => {
    renderRow();

    const save = screen.getByRole("button", { name: "Guardar serie" });
    expect(save).toHaveClass("min-h-11");
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe("SetRow — máquina de estados (R5, R6, R10)", () => {
  it("saving: botón 'Guardando…' deshabilitado y steppers bloqueados (R10)", () => {
    renderRow(makeRow({ status: "saving" }));

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aumentar Peso serie 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disminuir Repeticiones serie 1" })).toBeDisabled();
  });

  it("saved: muestra '✓ Guardada' deshabilitado con los valores visibles (R5)", () => {
    renderRow(makeRow({ status: "saved", weight_kg: 25, reps: 8 }));

    expect(screen.getByRole("button", { name: "✓ Guardada" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("25 kg");
    expect(screen.getByRole("button", { name: "Repeticiones serie 1" })).toHaveTextContent("8");
  });

  it("error: mensaje inline en español, valores intactos y botón habilitado para reintentar (R6)", async () => {
    renderRow(
      makeRow({
        status: "error",
        message: "No se pudo guardar la serie, reintenta",
        weight_kg: 27.5,
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar la serie, reintenta");
    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("27.5 kg");

    const save = screen.getByRole("button", { name: "Guardar serie" });
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("editable sin mensaje: no renderiza alert", () => {
    renderRow();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
