import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SetRow from "@/components/SetRow";
import type { SetRowState } from "@/lib/logging";
import type { WorkoutLog } from "@/lib/types";
import type { WeightUnit } from "@/lib/units";

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

function renderRow(
  row: SetRowState = makeRow(),
  previous: WorkoutLog | null = null,
  unit: WeightUnit | undefined = undefined,
) {
  render(
    <ul>
      <SetRow
        row={row}
        previous={previous}
        unit={unit}
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
  it("con sesión anterior muestra 'Anterior: 22.5 kg × 10' (08 R6: con unidad)", () => {
    renderRow(makeRow(), previousLog);

    expect(screen.getByText("Anterior: 22.5 kg × 10")).toBeInTheDocument();
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

describe("SetRow — unidad activa (08 R4, R5, R6, R10)", () => {
  it("sin prop `unit` se comporta como kg: mismo valor y paso de 05 (R15)", async () => {
    renderRow();

    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("22.5 kg");
    await userEvent.click(screen.getByRole("button", { name: "Aumentar Peso serie 1" }));
    expect(onWeightChange).toHaveBeenCalledExactlyOnceWith(25);
  });

  it("en lb el peso se muestra convertido con su unidad (22.5 kg → 49.6 lb) (R6)", () => {
    renderRow(makeRow(), null, "lb");

    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("49.6 lb");
  });

  it("en lb 'Anterior' también lleva la unidad convertida (R6)", () => {
    renderRow(makeRow(), previousLog, "lb");

    expect(screen.getByText("Anterior: 49.6 lb × 10")).toBeInTheDocument();
  });

  it("sin sesión anterior el guion se conserva en lb", () => {
    renderRow(makeRow(), null, "lb");

    expect(screen.getByText("Anterior: —")).toBeInTheDocument();
  });

  it("en lb el stepper avanza ±5 lb y devuelve kilogramos (R4, R7)", async () => {
    // 45 lb = 20.41 kg → +5 lb = 50 lb = 22.68 kg
    renderRow(makeRow({ weight_kg: 20.41 }), null, "lb");

    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("45 lb");
    await userEvent.click(screen.getByRole("button", { name: "Aumentar Peso serie 1" }));
    expect(onWeightChange).toHaveBeenCalledExactlyOnceWith(22.68);
  });

  it("en lb el stepper baja ±5 lb y respeta el mínimo 0 (R4)", async () => {
    renderRow(makeRow({ weight_kg: 1.13 }), null, "lb"); // 2.5 lb

    await userEvent.click(screen.getByRole("button", { name: "Disminuir Peso serie 1" }));
    expect(onWeightChange).toHaveBeenCalledExactlyOnceWith(0);
  });

  it("entrada directa '45' en lb se interpreta como libras → 20.41 kg (R5, R7)", async () => {
    renderRow(makeRow({ weight_kg: 0 }), null, "lb");

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "45{Enter}");

    expect(onWeightChange).toHaveBeenCalledExactlyOnceWith(20.41);
  });

  it("entrada directa '45.37' en lb se cuantiza a 45.4 lb → 20.59 kg (R5)", async () => {
    renderRow(makeRow({ weight_kg: 0 }), null, "lb");

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "45.37{Enter}");

    expect(onWeightChange).toHaveBeenCalledExactlyOnceWith(20.59);
  });

  it("entrada directa en kg conserva el valor tecleado sin cuantizar (05 intacto)", async () => {
    renderRow(makeRow(), null, "kg");

    await userEvent.click(screen.getByRole("button", { name: "Peso serie 1" }));
    const input = screen.getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "22.3{Enter}");

    expect(onWeightChange).toHaveBeenCalledExactlyOnceWith(22.3);
  });

  it("las reps no cambian con la unidad: siguen en pasos de 1 (R4)", async () => {
    renderRow(makeRow(), null, "lb");

    expect(screen.getByRole("button", { name: "Repeticiones serie 1" })).toHaveTextContent("10");
    await userEvent.click(screen.getByRole("button", { name: "Aumentar Repeticiones serie 1" }));
    expect(onRepsChange).toHaveBeenCalledExactlyOnceWith(11);
  });

  it("una fila guardada en lb muestra su peso en lb (R6)", () => {
    renderRow(makeRow({ status: "saved", weight_kg: 20.41, reps: 10 }), null, "lb");

    expect(screen.getByRole("button", { name: "✓ Guardada" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("45 lb");
  });
});
