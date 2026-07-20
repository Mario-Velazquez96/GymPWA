import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlanExercise, WorkoutLog } from "@/lib/types";
import { todayLocalISO } from "@/lib/utils";

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
    expect(within(rowOf(1)).getByText("Anterior: 22.5 × 10")).toBeInTheDocument();
    expect(within(rowOf(2)).getByText("Anterior: 25 × 8")).toBeInTheDocument();
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
