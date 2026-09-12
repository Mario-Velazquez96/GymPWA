import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

describe("SetRow — 14 ciclorama: fases visuales (R16, R17)", () => {
  function li(): HTMLElement {
    return screen.getByRole("listitem");
  }

  function renderActive(row: SetRowState): void {
    render(
      <ul>
        <SetRow
          row={row}
          previous={null}
          active
          onWeightChange={onWeightChange}
          onRepsChange={onRepsChange}
          onSave={onSave}
        />
      </ul>,
    );
  }

  it("editable activa: banda de noche con data-status, botón primario de horizonte", () => {
    renderActive(makeRow({ status: "editable" }));

    expect(li()).toHaveAttribute("data-status", "editable");
    expect(li()).toHaveClass("dawn-sweep", "border-blackout", "flex", "flex-col", "gap-3");
    expect(li()).not.toHaveClass("dawn-sweep-day");
    expect(li()).not.toHaveClass("border-cue-fault");
    expect(screen.getByRole("button", { name: "Guardar serie" })).toHaveClass(
      "bg-horizon",
      "text-day",
      "w-full",
    );
  });

  it("saving: sigue en noche y el botón 'Guardando…' va en apagón legible", () => {
    renderRow(makeRow({ status: "saving" }));

    expect(li()).toHaveAttribute("data-status", "saving");
    expect(li()).not.toHaveClass("dawn-sweep-day");
    const button = screen.getByRole("button", { name: "Guardando…" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("bg-blackout", "text-day/90");
  });

  it("saved: la fila amanece (dawn-sweep-day) y '✓ Guardada' es día/seleccionado", () => {
    renderRow(makeRow({ status: "saved" }), previousLog);

    expect(li()).toHaveAttribute("data-status", "saved");
    expect(li()).toHaveClass("dawn-sweep", "dawn-sweep-day");
    const button = screen.getByRole("button", { name: "✓ Guardada" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("bg-day", "text-cyc-black", "border-2", "border-cyc-black");
    // "Anterior" hereda la tinta de día (sin text-day/90) y sigue siendo un solo nodo.
    const previous = screen.getByText("Anterior: 22.5 kg × 10");
    expect(previous).not.toHaveClass("text-day/90");
    expect(previous).toHaveClass("tabular-nums");
  });

  it("error activa: marco de cue-fault, mensaje en texto y botón primario habilitado", () => {
    renderActive(makeRow({ status: "error", message: "No se pudo guardar la serie, reintenta" }));

    expect(li()).toHaveAttribute("data-status", "error");
    expect(li()).toHaveClass("border-2", "border-cue-fault");
    expect(li()).not.toHaveClass("dawn-sweep-day");
    expect(screen.getByRole("alert")).toHaveClass("text-cue-fault", "font-semibold", "text-base");
    expect(screen.getByRole("button", { name: "Guardar serie" })).toHaveClass("bg-horizon");
  });

  it("active: filo de horizonte en editable y error, nunca en saved", () => {
    renderActive(makeRow({ status: "editable" }));
    expect(li()).toHaveClass("horizon-edge-l");
    expect(li()).toHaveAttribute("data-active", "true");
    cleanup();

    renderActive(makeRow({ status: "error", message: "No se pudo guardar la serie, reintenta" }));
    expect(li()).toHaveClass("horizon-edge-l", "border-cue-fault");
    cleanup();

    renderActive(makeRow({ status: "saved" }));
    expect(li()).not.toHaveClass("horizon-edge-l");
    expect(li()).toHaveAttribute("data-active", "true");
  });

  it("sin active: data-active=false y sin filo", () => {
    renderRow(makeRow({ status: "editable" }));

    expect(li()).toHaveAttribute("data-active", "false");
    expect(li()).not.toHaveClass("horizon-edge-l");
  });

  it("'Anterior' en noche va en text-day/90 y tabular, como primera línea de la fila", () => {
    renderRow(makeRow(), previousLog);

    const previous = screen.getByText("Anterior: 22.5 kg × 10");
    expect(previous).toHaveClass("text-day/90", "tabular-nums", "text-base");
    const heading = screen.getByRole("heading", { name: "Serie 1" });
    expect(heading).toHaveClass("font-bold");
    const steppers = screen.getByRole("button", { name: "Disminuir Peso serie 1" });
    expect(
      previous.compareDocumentPosition(steppers) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("SetRow — correcciones de la revisión de cierre (finish-review-14)", () => {
  function li(): HTMLElement {
    return screen.getByRole("listitem");
  }

  function renderActive(row: SetRowState): void {
    render(
      <ul>
        <SetRow
          row={row}
          previous={null}
          active
          onWeightChange={onWeightChange}
          onRepsChange={onRepsChange}
          onSave={onSave}
        />
      </ul>,
    );
  }

  it("fix 2: solo la fila activa lleva el horizonte; la pendiente va en secundario", () => {
    renderActive(makeRow({ status: "editable" }));
    const active = screen.getByRole("button", { name: "Guardar serie" });
    expect(active).toHaveClass("bg-horizon", "text-day");
    expect(active).not.toHaveClass("border-2");
    cleanup();

    renderRow(makeRow({ status: "editable" }));
    const pending = screen.getByRole("button", { name: "Guardar serie" });
    expect(pending).toHaveClass("border-2", "border-day", "bg-transparent", "text-day", "w-full");
    expect(pending).not.toHaveClass("bg-horizon");
  });

  it("fix 2: la fila pendiente conserva texto, target, estado habilitado y guardado", async () => {
    const user = userEvent.setup();
    renderRow(makeRow({ status: "editable" }));

    const button = screen.getByRole("button", { name: "Guardar serie" });
    expect(button).toBeEnabled();
    expect(button).toHaveClass("min-h-11");
    expect(li()).toHaveAttribute("data-active", "false");
    await user.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("fix 2: el error no activo también va en secundario, con su marco y su alerta", () => {
    renderRow(makeRow({ status: "error", message: "No se pudo guardar la serie, reintenta" }));

    expect(li()).toHaveClass("border-cue-fault");
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar la serie, reintenta");
    const button = screen.getByRole("button", { name: "Guardar serie" });
    expect(button).toHaveClass("border-2", "border-day");
    expect(button).not.toHaveClass("bg-horizon");
    expect(button).toBeEnabled();
  });

  it("fix 2: saving y saved no cambian de tratamiento por no ser la fila activa", () => {
    renderRow(makeRow({ status: "saving" }));
    const saving = screen.getByRole("button", { name: "Guardando…" });
    expect(saving).toHaveClass("bg-blackout", "text-day/90");
    expect(saving).toBeDisabled();
    cleanup();

    renderRow(makeRow({ status: "saved" }));
    const saved = screen.getByRole("button", { name: "✓ Guardada" });
    expect(saved).toHaveClass("bg-day", "text-cyc-black");
    expect(saved).toBeDisabled();
  });

  it("fix 6: el botón pulsado sube un paso de fase a dawn-rose, sin desvanecido", () => {
    renderActive(makeRow({ status: "editable" }));

    const button = screen.getByRole("button", { name: "Guardar serie" });
    expect(button).toHaveClass(
      "active:bg-none",
      "active:bg-dawn-rose",
      "active:text-cyc-black",
      "motion-reduce:transition-none",
    );
    expect(button).not.toHaveClass("hover:opacity-90");
    expect(button).not.toHaveClass("transition-opacity");
  });
});
