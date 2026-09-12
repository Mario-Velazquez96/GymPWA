import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlanExercise, WorkoutLog } from "@/lib/types";
import { todayLocalISO } from "@/lib/utils";
import { UNIT_STORAGE_PREFIX } from "@/lib/units";

/** Services mockeados en su frontera (R9); hook y componentes reales. */
vi.mock("@/services/logs", () => ({
  getPreviousSession: vi.fn(),
  getSessionSets: vi.fn(),
  logSet: vi.fn(),
  LOGS_ERROR_LOAD: "No se pudieron cargar las series",
  LOGS_ERROR_SAVE: "No se pudo guardar la serie, reintenta",
}));

import { getPreviousSession, getSessionSets, logSet, type NewLog } from "@/services/logs";
import LoggingSection from "@/components/LoggingSection";

const mockGetPrevious = vi.mocked(getPreviousSession);
const mockGetSession = vi.mocked(getSessionSets);
const mockLogSet = vi.mocked(logSet);

const planExercise: PlanExercise = {
  id: "pe-1",
  plan_day_id: "day-1",
  exercise_id: "0001",
  position: 1,
  target_sets: 4,
  target_reps: "8-12",
  rest_seconds: 90,
  notes: null,
};

function makeLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "log-1",
    user_id: "user-1",
    exercise_id: "0001",
    plan_exercise_id: "pe-1",
    performed_at: "2026-07-17",
    set_number: 1,
    reps: 10,
    weight_kg: 22.5,
    created_at: "2026-07-17T18:00:00Z",
    ...overrides,
  };
}

const previousSession = [
  makeLog({ set_number: 1, weight_kg: 22.5, reps: 10 }),
  makeLog({ id: "log-2", set_number: 2, weight_kg: 25, reps: 8 }),
];

/** logSet exitoso que devuelve la fila confirmada con los valores enviados. */
function stubLogSetOk(): void {
  mockLogSet.mockImplementation(async (input: NewLog) => ({
    data: makeLog({
      id: `log-${input.set_number}`,
      performed_at: input.performed_at,
      set_number: input.set_number,
      reps: input.reps,
      weight_kg: input.weight_kg,
    }),
    error: null,
  }));
}

function renderSection() {
  render(<LoggingSection planExercise={planExercise} />);
}

/** Fila (li) que contiene el heading "Serie N". */
function rowOf(setNumber: number): HTMLElement {
  const heading = screen.getByRole("heading", { name: `Serie ${setNumber}` });
  const item = heading.closest("li");
  if (item === null) {
    throw new Error(`No hay <li> para la serie ${setNumber}`);
  }
  return item;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // 08: la preferencia de unidad vive en el dispositivo
  mockGetPrevious.mockResolvedValue({ data: [], error: null });
  mockGetSession.mockResolvedValue({ data: [], error: null });
  stubLogSetOk();
});

describe("LoggingSection — carga y filas (R1, R2, R3)", () => {
  it("pide sesión anterior y series de hoy con exercise_id + fecha local", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(mockGetPrevious).toHaveBeenCalledWith("0001", todayLocalISO());
    expect(mockGetSession).toHaveBeenCalledWith("0001", todayLocalISO());
  });

  it("muestra 'Cargando series…' mientras las consultas no resuelven", () => {
    mockGetPrevious.mockReturnValue(new Promise(() => undefined));
    mockGetSession.mockReturnValue(new Promise(() => undefined));

    renderSection();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando series…");
  });

  it("R1: renderiza target_sets filas numeradas desde 1", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByRole("heading", { name: `Serie ${n}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("heading", { name: "Serie 5" })).not.toBeInTheDocument();
  });

  it("R1: 'Agregar serie' agrega la fila 5 al final (≥ 44px)", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const add = screen.getByRole("button", { name: "Agregar serie" });
    expect(add).toHaveClass("min-h-11");
    await userEvent.click(add);

    expect(screen.getByRole("heading", { name: "Serie 5" })).toBeInTheDocument();
  });

  it("R2: cada fila muestra 'Anterior: peso × reps' de su set_number, o '—'", async () => {
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    // 08 R6: la columna "Anterior" lleva la unidad activa (kg por defecto).
    expect(within(rowOf(1)).getByText("Anterior: 22.5 kg × 10")).toBeInTheDocument();
    expect(within(rowOf(2)).getByText("Anterior: 25 kg × 8")).toBeInTheDocument();
    expect(within(rowOf(3)).getByText("Anterior: —")).toBeInTheDocument();
    expect(within(rowOf(4)).getByText("Anterior: —")).toBeInTheDocument();
  });

  it("R3: prefill desde la sesión anterior; filas sin match copian a su anterior", async () => {
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(within(rowOf(1)).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent(
      "22.5 kg",
    );
    expect(
      within(rowOf(1)).getByRole("button", { name: "Repeticiones serie 1" }),
    ).toHaveTextContent("10");
    expect(within(rowOf(3)).getByRole("button", { name: "Peso serie 3" })).toHaveTextContent(
      "25 kg",
    );
    expect(
      within(rowOf(3)).getByRole("button", { name: "Repeticiones serie 3" }),
    ).toHaveTextContent("8");
  });

  it("R3: sin historial, peso 0 kg y reps = primer número de target_reps", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(within(rowOf(1)).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent(
      "0 kg",
    );
    expect(
      within(rowOf(1)).getByRole("button", { name: "Repeticiones serie 1" }),
    ).toHaveTextContent("8");
  });
});

describe("LoggingSection — guardado (R5, R6, R7, R10)", () => {
  it("R5: guardar inserta exactamente una fila con la fecha local y marca ✓", async () => {
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Aumentar Peso serie 1" }));
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));

    expect(await within(row1).findByRole("button", { name: "✓ Guardada" })).toBeDisabled();
    expect(mockLogSet).toHaveBeenCalledTimes(1);
    expect(mockLogSet).toHaveBeenCalledWith({
      exercise_id: "0001",
      plan_exercise_id: "pe-1",
      performed_at: todayLocalISO(),
      set_number: 1,
      reps: 10,
      weight_kg: 25,
    });
  });

  it("R6: fallo → mensaje en español, valores intactos, reintento con un solo insert extra", async () => {
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });
    mockLogSet.mockResolvedValueOnce({
      data: null,
      error: "No se pudo guardar la serie, reintenta",
    });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Aumentar Peso serie 1" }));
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));

    expect(await within(row1).findByRole("alert")).toHaveTextContent(
      "No se pudo guardar la serie, reintenta",
    );
    // Valores intactos tras el fallo (R6)
    expect(within(row1).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("25 kg");

    stubLogSetOk();
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));

    expect(await within(row1).findByRole("button", { name: "✓ Guardada" })).toBeInTheDocument();
    expect(mockLogSet).toHaveBeenCalledTimes(2); // sin duplicados por el reintento
  });

  it("R7: peso fuera de pasos de 0.5 bloquea el guardado sin llamar al servicio", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Peso serie 1" }));
    const input = within(row1).getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "22.3{Enter}");
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));

    expect(await within(row1).findByRole("alert")).toHaveTextContent(
      "El peso debe ir en pasos de 0.5 kg",
    );
    expect(mockLogSet).not.toHaveBeenCalled();
  });

  it("R10: doble tap con el insert en vuelo produce UN solo insert", async () => {
    let resolveInsert: (() => void) | undefined;
    mockLogSet.mockImplementation(
      (input: NewLog) =>
        new Promise((resolve) => {
          resolveInsert = () =>
            resolve({
              data: makeLog({
                set_number: input.set_number,
                reps: input.reps,
                weight_kg: input.weight_kg,
              }),
              error: null,
            });
        }),
    );

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    const save = within(row1).getByRole("button", { name: "Guardar serie" });

    // Dos taps síncronos antes de cualquier re-render: el guard en ref frena el 2º.
    fireEvent.click(save);
    fireEvent.click(save);

    expect(await within(row1).findByRole("button", { name: "Guardando…" })).toBeDisabled();
    expect(mockLogSet).toHaveBeenCalledTimes(1);

    resolveInsert?.();
    expect(await within(row1).findByRole("button", { name: "✓ Guardada" })).toBeInTheDocument();
    expect(mockLogSet).toHaveBeenCalledTimes(1);
  });
});

describe("LoggingSection — reapertura el mismo día (R8)", () => {
  it("las series ya guardadas hoy se renderizan como ✓ con sus valores, no vacías", async () => {
    mockGetSession.mockResolvedValue({
      data: [
        makeLog({ performed_at: todayLocalISO(), set_number: 1, weight_kg: 30, reps: 12 }),
        makeLog({
          id: "log-2",
          performed_at: todayLocalISO(),
          set_number: 2,
          weight_kg: 32.5,
          reps: 10,
        }),
      ],
      error: null,
    });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(within(rowOf(1)).getByRole("button", { name: "✓ Guardada" })).toBeDisabled();
    expect(within(rowOf(1)).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent(
      "30 kg",
    );
    expect(within(rowOf(2)).getByRole("button", { name: "✓ Guardada" })).toBeDisabled();
    expect(within(rowOf(3)).getByRole("button", { name: "Guardar serie" })).toBeEnabled();
    expect(within(rowOf(4)).getByRole("button", { name: "Guardar serie" })).toBeEnabled();
  });
});

describe("LoggingSection — error de carga con Reintentar", () => {
  it("fallo al cargar muestra el mensaje y 'Reintentar' recarga las filas", async () => {
    mockGetPrevious.mockResolvedValueOnce({
      data: null,
      error: "No se pudieron cargar las series",
    });

    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las series");
    expect(screen.queryByRole("heading", { name: "Serie 1" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Serie 1" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("fallo en las series de hoy también cae al estado de error", async () => {
    mockGetSession.mockResolvedValue({ data: null, error: "No se pudieron cargar las series" });

    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las series");
  });
});

describe("LoggingSection — unidad de peso (08 R1, R4, R6, R7, R11, R14, R15)", () => {
  /** Botón del toggle de unidad ("kg" | "lb"). */
  function unitButton(unit: "kg" | "lb"): HTMLElement {
    return within(screen.getByRole("group", { name: "Unidad de peso" })).getByRole("button", {
      name: unit,
    });
  }

  it("R1: renderiza el toggle 'Unidad de peso' junto al encabezado, en kg por defecto", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(screen.getByRole("heading", { name: "Registro de series" })).toBeInTheDocument();
    expect(unitButton("kg")).toHaveAttribute("aria-pressed", "true");
    expect(unitButton("lb")).toHaveAttribute("aria-pressed", "false");
  });

  it("R15: sin preferencia guardada todo se ve en kg, exactamente como en 05", async () => {
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(within(rowOf(1)).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent(
      "22.5 kg",
    );
    expect(within(rowOf(1)).getByText("Anterior: 22.5 kg × 10")).toBeInTheDocument();
  });

  it("R2/R6: con 'lb' guardado para el ejercicio, la fila arranca en libras", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0001`, "lb");
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(unitButton("lb")).toHaveAttribute("aria-pressed", "true");
    expect(within(rowOf(1)).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent(
      "49.6 lb",
    );
    expect(within(rowOf(1)).getByText("Anterior: 49.6 lb × 10")).toBeInTheDocument();
  });

  it("R4: en lb el stepper de peso sube de 5 en 5 libras", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0001`, "lb");
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Aumentar Peso serie 1" }));

    // 49.6 lb + 5 = 54.6 lb (el kg subyacente pasa a 24.76)
    expect(within(row1).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("54.6 lb");
  });

  it("R7/R9/R14: guardar 45 lb inserta weight_kg 20.41 y la fila queda '45 lb'", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0001`, "lb");

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Peso serie 1" }));
    const input = within(row1).getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "45{Enter}");
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));

    expect(await within(row1).findByRole("button", { name: "✓ Guardada" })).toBeDisabled();
    expect(mockLogSet).toHaveBeenCalledTimes(1);
    expect(mockLogSet).toHaveBeenCalledWith({
      exercise_id: "0001",
      plan_exercise_id: "pe-1",
      performed_at: todayLocalISO(),
      set_number: 1,
      reps: 8,
      weight_kg: 20.41, // capturado en lb, almacenado en kg (contrato con Gym)
    });
    expect(within(row1).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("45 lb");
  });

  it("R9: en lb NO se aplica la regla de 0.5 kg — 45 lb guarda sin error de validación", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0001`, "lb");

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Peso serie 1" }));
    const input = within(row1).getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "45{Enter}");
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));

    await within(row1).findByRole("button", { name: "✓ Guardada" });
    expect(within(row1).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("R2: cambiar a lb persiste la preferencia del ejercicio en el dispositivo", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    await userEvent.click(unitButton("lb"));

    expect(localStorage.getItem(`${UNIT_STORAGE_PREFIX}0001`)).toBe("lb");
    expect(unitButton("lb")).toHaveAttribute("aria-pressed", "true");
  });

  it("R11: togglear con una fila editada re-renderiza el valor sin tocar el kg subyacente", async () => {
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    // 22.5 kg + 2.5 = 25 kg editados por el usuario
    await userEvent.click(within(row1).getByRole("button", { name: "Aumentar Peso serie 1" }));
    expect(within(row1).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("25 kg");

    await userEvent.click(unitButton("lb"));

    // Mismo peso físico, otra lectura: 25 kg = 55.1 lb. La fila NO se reinicia
    // ni se re-prellena (seguiría en 22.5 kg si se hubiera reseteado).
    expect(within(row1).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("55.1 lb");
    expect(within(row1).getByRole("button", { name: "Repeticiones serie 1" })).toHaveTextContent(
      "10",
    );
    expect(within(row1).getByRole("button", { name: "Guardar serie" })).toBeEnabled();

    // Y al guardar sale el kg exacto que el usuario había editado (R14).
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));
    await within(row1).findByRole("button", { name: "✓ Guardada" });
    expect(mockLogSet).toHaveBeenCalledWith(expect.objectContaining({ weight_kg: 25 }));
  });

  it("R11: togglear no borra el mensaje de error ni el estado de una fila fallida", async () => {
    mockLogSet.mockResolvedValueOnce({
      data: null,
      error: "No se pudo guardar la serie, reintenta",
    });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));
    expect(await within(row1).findByRole("alert")).toHaveTextContent(
      "No se pudo guardar la serie, reintenta",
    );

    await userEvent.click(unitButton("lb"));

    expect(within(row1).getByRole("alert")).toHaveTextContent(
      "No se pudo guardar la serie, reintenta",
    );
  });

  it("R11: las series ya guardadas hoy se releen en la nueva unidad, sin reguardar", async () => {
    mockGetSession.mockResolvedValue({
      data: [makeLog({ performed_at: todayLocalISO(), set_number: 1, weight_kg: 20.41, reps: 10 })],
      error: null,
    });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    expect(within(row1).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent(
      "20.41 kg",
    );

    await userEvent.click(unitButton("lb"));

    expect(within(row1).getByRole("button", { name: "Peso serie 1" })).toHaveTextContent("45 lb");
    expect(within(row1).getByRole("button", { name: "✓ Guardada" })).toBeDisabled();
    expect(mockLogSet).not.toHaveBeenCalled();
  });

  it("R7: en kg un peso fuera de pasos de 0.5 sigue bloqueando el guardado (R15)", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(within(row1).getByRole("button", { name: "Peso serie 1" }));
    const input = within(row1).getByRole("textbox", { name: "Peso serie 1" });
    await userEvent.clear(input);
    await userEvent.type(input, "22.3{Enter}");
    await userEvent.click(within(row1).getByRole("button", { name: "Guardar serie" }));

    expect(await within(row1).findByRole("alert")).toHaveTextContent(
      "El peso debe ir en pasos de 0.5 kg",
    );
    expect(mockLogSet).not.toHaveBeenCalled();
  });
});

describe("LoggingSection — reps independientes de la unidad (08 R4)", () => {
  it("en lb las repeticiones siguen avanzando de 1 en 1", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0001`, "lb");

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const row1 = rowOf(1);
    await userEvent.click(
      within(row1).getByRole("button", { name: "Aumentar Repeticiones serie 1" }),
    );

    expect(within(row1).getByRole("button", { name: "Repeticiones serie 1" })).toHaveTextContent(
      "9",
    );
  });
});

describe("LoggingSection — 14 ciclorama: amanecer y fila activa (R15, R16, R17)", () => {
  function activeRows(): HTMLElement[] {
    return screen.getAllByRole("listitem").filter((li) => li.dataset.active === "true");
  }

  it("solo la primera fila editable lleva el filo; al guardar, amanece y el filo avanza", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(activeRows()).toHaveLength(1);
    expect(rowOf(1)).toHaveClass("horizon-edge-l");
    expect(rowOf(1)).not.toHaveClass("dawn-sweep-day");
    expect(rowOf(2)).not.toHaveClass("horizon-edge-l");

    await userEvent.click(within(rowOf(1)).getByRole("button", { name: "Guardar serie" }));
    await within(rowOf(1)).findByRole("button", { name: "✓ Guardada" });

    expect(rowOf(1)).toHaveAttribute("data-status", "saved");
    expect(rowOf(1)).toHaveClass("dawn-sweep", "dawn-sweep-day");
    expect(rowOf(1)).not.toHaveClass("horizon-edge-l");
    expect(activeRows()).toHaveLength(1);
    expect(rowOf(2)).toHaveClass("horizon-edge-l");
    expect(rowOf(2)).toHaveAttribute("data-active", "true");
  });

  it("una fila en error conserva el filo (sigue siendo la activa)", async () => {
    mockLogSet.mockResolvedValueOnce({
      data: null,
      error: "No se pudo guardar la serie, reintenta",
    });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    await userEvent.click(within(rowOf(1)).getByRole("button", { name: "Guardar serie" }));
    await within(rowOf(1)).findByRole("alert");

    expect(rowOf(1)).toHaveAttribute("data-status", "error");
    expect(rowOf(1)).toHaveClass("horizon-edge-l", "border-cue-fault");
    expect(activeRows()).toHaveLength(1);
  });

  it("las series montadas como guardadas ya son de día y el filo cae en la primera editable", async () => {
    mockGetSession.mockResolvedValue({
      data: [
        makeLog({ performed_at: todayLocalISO(), set_number: 1, weight_kg: 30, reps: 12 }),
        makeLog({
          id: "log-2",
          performed_at: todayLocalISO(),
          set_number: 2,
          weight_kg: 32.5,
          reps: 10,
        }),
      ],
      error: null,
    });

    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    expect(rowOf(1)).toHaveClass("dawn-sweep-day");
    expect(rowOf(2)).toHaveClass("dawn-sweep-day");
    expect(rowOf(3)).not.toHaveClass("dawn-sweep-day");
    expect(rowOf(3)).toHaveClass("horizon-edge-l");
    expect(activeRows()).toHaveLength(1);
  });

  it("R12/R15: estados y controles con el vocabulario único (carga, error, Agregar serie)", async () => {
    mockGetPrevious.mockReturnValueOnce(new Promise(() => undefined));
    renderSection();
    expect(screen.getByRole("status")).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    cleanup();

    mockGetPrevious.mockResolvedValueOnce({
      data: null,
      error: "No se pudieron cargar las series",
    });
    renderSection();
    expect(await screen.findByRole("alert")).toHaveClass("text-cue-fault");
    expect(screen.getByRole("button", { name: "Reintentar" })).toHaveClass(
      "bg-horizon",
      "min-h-11",
    );
    cleanup();

    renderSection();
    await screen.findByRole("heading", { name: "Serie 1" });
    expect(screen.getByRole("button", { name: "Agregar serie" })).toHaveClass(
      "border-2",
      "border-day",
      "min-h-11",
      "w-full",
    );
    expect(screen.getByRole("heading", { name: "Registro de series" })).toHaveClass(
      "text-lg",
      "font-bold",
    );
  });
});

describe("LoggingSection — correcciones de la revisión de cierre (finish-review-14)", () => {
  it("fix 2: con 4 filas pendientes solo hay un 'Guardar serie' de horizonte", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const saveButtons = screen.getAllByRole("button", { name: "Guardar serie" });
    expect(saveButtons).toHaveLength(4);

    const lit = saveButtons.filter((button) => button.className.includes("bg-horizon"));
    expect(lit).toHaveLength(1);
    // El encendido es el de la fila activa (la que lleva el filo de horizonte).
    expect(rowOf(1)).toContainElement(lit[0] ?? null);
    for (const button of saveButtons.slice(1)) {
      expect(button).toHaveClass("border-2", "border-day");
      expect(button).toBeEnabled();
    }
  });

  it("fix 2: al guardar la fila activa, el horizonte pasa a la siguiente pendiente", async () => {
    const user = userEvent.setup();
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    await user.click(within(rowOf(1)).getByRole("button", { name: "Guardar serie" }));
    await screen.findByRole("button", { name: "✓ Guardada" });

    const lit = screen
      .getAllByRole("button", { name: "Guardar serie" })
      .filter((button) => button.className.includes("bg-horizon"));
    expect(lit).toHaveLength(1);
    expect(rowOf(2)).toContainElement(lit[0] ?? null);
    expect(rowOf(2)).toHaveClass("horizon-edge-l");
  });
});

describe("LoggingSection — ronda 2 (punto C: tres niveles de acción)", () => {
  beforeEach(() => {
    mockGetPrevious.mockResolvedValue({ data: previousSession, error: null });
    mockGetSession.mockResolvedValue({ data: [], error: null });
    stubLogSetOk();
  });

  it("primario, secundario y terciario se distinguen: 'Agregar serie' es el más callado", async () => {
    renderSection();

    await screen.findByRole("heading", { name: "Serie 1" });
    const saveButtons = screen.getAllByRole("button", { name: "Guardar serie" });
    const add = screen.getByRole("button", { name: "Agregar serie" });

    // Primario: horizonte, solo en la fila activa; nunca atenuado.
    const lit = saveButtons.filter((button) => button.className.includes("bg-horizon"));
    expect(lit).toHaveLength(1);
    expect(lit[0]).not.toHaveClass("opacity-60");

    // Secundario: las filas pendientes siguen escribiendo y van a plena luz.
    for (const button of saveButtons.filter((button) => button !== lit[0])) {
      expect(button).toHaveClass("border-2", "border-day", "bg-transparent");
      expect(button).not.toHaveClass("opacity-60");
    }

    // Terciario: mismo rectángulo táctil, al 60 %.
    expect(add).toHaveClass("border-2", "border-day", "min-h-11", "w-full", "opacity-60");
    await userEvent.click(add);
    expect(screen.getByRole("heading", { name: "Serie 5" })).toBeInTheDocument();
  });
});
