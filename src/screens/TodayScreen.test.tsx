import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Plan, PlanDay, PlanExerciseWithExercise } from "@/lib/types";

/** Services mockeados en su frontera (R9); la fecha "hoy" se fija para el test. */
vi.mock("@/services/plans", () => ({
  getActivePlan: vi.fn(),
  getPlanDay: vi.fn(),
  getDayExercises: vi.fn(),
  PLANS_ERROR_LOAD: "No se pudo cargar la rutina",
}));

const TODAY = "2026-08-05"; // miércoles

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, todayLocalISO: () => TODAY };
});

import { getActivePlan, getDayExercises, getPlanDay } from "@/services/plans";
import { formatDateEs } from "@/lib/utils";
import TodayScreen from "@/screens/TodayScreen";

const mockGetActivePlan = vi.mocked(getActivePlan);
const mockGetPlanDay = vi.mocked(getPlanDay);
const mockGetDayExercises = vi.mocked(getDayExercises);

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    user_id: "user-1",
    name: "Plan de prueba",
    goal: null,
    start_date: "2026-08-03",
    end_date: "2026-08-07",
    status: "active",
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

const trainingDay: PlanDay = {
  id: "day-1",
  plan_id: "plan-1",
  day_date: TODAY,
  title: "Pecho y tríceps",
  is_rest: false,
};

function makeExercise(id: string, position: number, name: string): PlanExerciseWithExercise {
  return {
    id,
    plan_day_id: "day-1",
    exercise_id: `000${position}`,
    position,
    target_sets: 4,
    target_reps: "8-12",
    rest_seconds: 90,
    notes: null,
    exercises: {
      id: `000${position}`,
      name,
      image_url: `https://storage.example/000${position}.png`,
      equipment: "barbell",
      target: "pectorals",
    },
  };
}

function renderScreen() {
  render(
    <MemoryRouter>
      <TodayScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TodayScreen — estados del cuerpo (R1, R3, R4, R5)", () => {
  it("R1: muestra el título del día y los ejercicios en orden de position", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({
      data: [makeExercise("pe-1", 1, "Press de banca"), makeExercise("pe-2", 2, "Remo con barra")],
      error: null,
    });

    renderScreen();

    expect(await screen.findByRole("heading", { name: "Pecho y tríceps" })).toBeInTheDocument();

    const cards = within(screen.getByRole("list")).getAllByRole("link");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Press de banca");
    expect(cards[0]).toHaveTextContent("4 × 8-12");
    expect(cards[1]).toHaveTextContent("Remo con barra");
  });

  it("R7: cada card enlaza a /ejercicio/<plan_exercise.id>", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({
      data: [makeExercise("pe-1", 1, "Press de banca")],
      error: null,
    });

    renderScreen();

    const card = await screen.findByRole("link", { name: /Press de banca/ });
    expect(card).toHaveAttribute("href", "/ejercicio/pe-1");
  });

  it("R3: día de descanso muestra 'Día de descanso' y no lista ejercicios", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({
      data: { ...trainingDay, title: "Descanso", is_rest: true },
      error: null,
    });

    renderScreen();

    expect(await screen.findByText(/Día de descanso/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(mockGetDayExercises).not.toHaveBeenCalled();
  });

  it("R4: fecha sin plan_day muestra 'Sin rutina asignada para este día'", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: null, error: null });

    renderScreen();

    expect(await screen.findByText("Sin rutina asignada para este día")).toBeInTheDocument();
  });

  it("R5: sin plan activo muestra 'Sin plan activo' y oculta la navegación de días", async () => {
    mockGetActivePlan.mockResolvedValue({ data: null, error: null });

    renderScreen();

    expect(await screen.findByText("Sin plan activo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Día anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Día siguiente" })).not.toBeInTheDocument();
  });
});

describe("TodayScreen — carga y error (R2, R8)", () => {
  it("R8: muestra el estado de carga mientras las consultas no resuelven", () => {
    mockGetActivePlan.mockReturnValue(new Promise(() => undefined));

    renderScreen();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando rutina…");
  });

  it("R2: el encabezado muestra la fecha local de hoy en español", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    expect(await screen.findByText(formatDateEs(TODAY))).toBeInTheDocument();
    expect(formatDateEs(TODAY)).toBe("mié 5 ago");
  });

  it("R8: en fallo muestra 'No se pudo cargar la rutina' y 'Reintentar' recarga", async () => {
    mockGetActivePlan.mockResolvedValueOnce({
      data: null,
      error: "No se pudo cargar la rutina",
    });
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({
      data: [makeExercise("pe-1", 1, "Press de banca")],
      error: null,
    });

    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la rutina");

    const retryButton = screen.getByRole("button", { name: "Reintentar" });
    expect(retryButton).toHaveClass("min-h-11");
    await userEvent.click(retryButton);

    expect(await screen.findByRole("heading", { name: "Pecho y tríceps" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("TodayScreen — navegación de días (R6, R10)", () => {
  it("R6: 'Día siguiente' carga la fecha siguiente y actualiza el encabezado", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();
    await screen.findByText("mié 5 ago");

    mockGetPlanDay.mockResolvedValue({ data: null, error: null });
    await userEvent.click(screen.getByRole("button", { name: "Día siguiente" }));

    expect(await screen.findByText("jue 6 ago")).toBeInTheDocument();
    expect(await screen.findByText("Sin rutina asignada para este día")).toBeInTheDocument();
    await waitFor(() => expect(mockGetPlanDay).toHaveBeenLastCalledWith("plan-1", "2026-08-06"));
  });

  it("R6: 'Día anterior' carga la fecha previa", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();
    await screen.findByText("mié 5 ago");

    await userEvent.click(screen.getByRole("button", { name: "Día anterior" }));

    expect(await screen.findByText("mar 4 ago")).toBeInTheDocument();
    await waitFor(() => expect(mockGetPlanDay).toHaveBeenLastCalledWith("plan-1", "2026-08-04"));
  });

  it("R6: en start_date la flecha anterior queda deshabilitada", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan({ start_date: TODAY }), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    expect(await screen.findByRole("button", { name: "Día anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Día siguiente" })).toBeEnabled();
  });

  it("R6: en end_date la flecha siguiente queda deshabilitada", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan({ end_date: TODAY }), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    expect(await screen.findByRole("button", { name: "Día siguiente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Día anterior" })).toBeEnabled();
  });

  it("R10: las flechas tienen target táctil ≥ 44px y labels en español", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    const prev = await screen.findByRole("button", { name: "Día anterior" });
    const next = screen.getByRole("button", { name: "Día siguiente" });
    for (const button of [prev, next]) {
      expect(button).toHaveClass("min-h-11");
      expect(button).toHaveClass("min-w-11");
    }
  });
});

describe("TodayScreen — espacio para la barra inferior (10 R3)", () => {
  it("el <main> reserva pb-24 para que la navegación no tape el contenido", async () => {
    mockGetActivePlan.mockResolvedValue({ data: null, error: null });

    renderScreen();

    expect(await screen.findByText("Sin plan activo")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("pb-24");
  });
});

describe("TodayScreen — 14 ciclorama (R9, R10, R12)", () => {
  it("R9 (enmienda 1): 'Hoy' y la fecha son el kicker de la banda de horizonte", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    const heading = screen.getByRole("heading", { name: "Hoy" });
    const band = heading.closest("section");
    expect(band).not.toBeNull();
    expect(band).toHaveClass("bg-horizon", "min-h-24");
    expect(heading).toHaveClass("text-xs", "font-bold", "uppercase", "tracking-plot");

    const date = await screen.findByText("mié 5 ago");
    expect(date).toHaveClass("tracking-plot", "uppercase", "tabular-nums", "text-xs");
    // El kicker va DESPUÉS del <h1> en el DOM (nunca encima del heading).
    expect(heading.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("R9: las flechas son cuadros secundarios de 44 px con borde de día", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    const prev = await screen.findByRole("button", { name: "Día anterior" });
    const next = screen.getByRole("button", { name: "Día siguiente" });
    for (const button of [prev, next]) {
      expect(button).toHaveClass("border-2", "border-day", "min-h-11", "min-w-11", "rounded-sm");
      expect(button).toHaveClass("disabled:bg-blackout");
    }
    expect(screen.getByRole("navigation", { name: "Navegación de días" })).toBeInTheDocument();
  });

  it("R10 (enmienda 1): el título del día manda en la banda y las cards llevan kicker 01, 02", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({
      data: [makeExercise("pe-1", 1, "Press de banca"), makeExercise("pe-2", 2, "Remo con barra")],
      error: null,
    });

    renderScreen();

    const title = await screen.findByRole("heading", { name: "Pecho y tríceps" });
    expect(title.tagName).toBe("H2");
    expect(title).toHaveClass("text-[22px]", "font-bold", "text-day");
    // Vive DENTRO de la banda de horizonte: ya no hay franja nocturna debajo.
    expect(title.closest("section")).toHaveClass("bg-horizon", "min-h-24");
    expect(screen.getByRole("list")).toHaveClass("divide-y", "divide-blackout");
    expect(screen.getByText("01")).toHaveClass("tracking-plot");
    expect(screen.getByText("02")).toBeInTheDocument();
    for (const card of within(screen.getByRole("list")).getAllByRole("link")) {
      expect(card).toHaveAttribute("data-phase", "night");
    }
  });

  it("R12: la carga late con animate-pulse y respeta reduced-motion", () => {
    mockGetActivePlan.mockReturnValue(new Promise(() => undefined));

    renderScreen();

    expect(screen.getByRole("status")).toHaveClass(
      "animate-pulse",
      "motion-reduce:animate-none",
      "text-day/60",
    );
  });

  it("R12: el error va en cue-fault y Reintentar es la acción primaria (horizonte)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: null, error: "No se pudo cargar la rutina" });

    renderScreen();

    expect(await screen.findByRole("alert")).toHaveClass("text-cue-fault", "font-semibold");
    expect(screen.getByRole("button", { name: "Reintentar" })).toHaveClass(
      "bg-horizon",
      "min-h-11",
    );
  });

  it("R12: los estados vacíos usan el mismo vocabulario (text-day/90, centrado)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: { ...trainingDay, is_rest: true }, error: null });

    renderScreen();

    expect(await screen.findByText(/Día de descanso/)).toHaveClass(
      "text-day/90",
      "text-center",
      "py-10",
    );
  });
});

describe("TodayScreen — correcciones de la revisión de cierre (finish-review-14)", () => {
  it("fix 6: las flechas de la banda suben un paso de fase al pulsarse", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    const prev = await screen.findByRole("button", { name: "Día anterior" });
    for (const button of [prev, screen.getByRole("button", { name: "Día siguiente" })]) {
      expect(button).toHaveClass("active:bg-dawn-rose", "active:text-cyc-black");
      // El apagón sigue siendo exclusivo del estado deshabilitado.
      expect(button).toHaveClass("disabled:bg-blackout");
    }
  });

  it("fix 6: la acción primaria pulsada pasa a dawn-rose en vez de desvanecerse", async () => {
    mockGetActivePlan.mockResolvedValue({ data: null, error: "No se pudo cargar la rutina" });

    renderScreen();

    const retry = await screen.findByRole("button", { name: "Reintentar" });
    expect(retry).toHaveClass("active:bg-none", "active:bg-dawn-rose", "active:text-cyc-black");
    expect(retry).not.toHaveClass("hover:opacity-90");
    expect(retry).toHaveClass("motion-reduce:transition-none");
  });
});

describe("TodayScreen — ronda 2 (punto A: orden de lectura de la banda)", () => {
  it("el título del día es el texto protagonista y el <h1> baja a kicker sin perder rol", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    const title = await screen.findByRole("heading", { level: 2, name: "Pecho y tríceps" });
    const hoy = screen.getByRole("heading", { level: 1, name: "Hoy" });
    // Mismo contenedor: banda de horizonte; el título por debajo del kicker.
    expect(hoy.closest("section")).toBe(title.closest("section"));
    expect(hoy.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // El protagonista mide 22 px; el kicker, 12.
    expect(title).toHaveClass("text-[22px]", "font-bold");
    expect(hoy).toHaveClass("text-xs");
    expect(hoy).not.toHaveClass("text-2xl");
    // La franja nocturna del título desapareció: no queda ningún <h2> fuera de la banda.
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(title.className).not.toContain("border-blackout");
  });

  it("el día de descanso deja la banda en su kicker, sin franja nocturna huérfana", async () => {
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: { ...trainingDay, is_rest: true }, error: null });

    renderScreen();

    expect(await screen.findByText(/Día de descanso/)).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    const hoy = screen.getByRole("heading", { level: 1, name: "Hoy" });
    expect(hoy.closest("section")).toHaveClass("bg-horizon", "min-h-24");
    expect(screen.getByText(formatDateEs(TODAY))).toBeInTheDocument();
  });

  it("sin plan activo y en un día sin rutina, la banda tampoco inventa un título", async () => {
    mockGetActivePlan.mockResolvedValue({ data: null, error: null });

    renderScreen();

    expect(await screen.findByText("Sin plan activo")).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 1, name: "Hoy" })).toBeInTheDocument();

    cleanup();
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValue({ data: null, error: null });

    renderScreen();

    expect(await screen.findByText("Sin rutina asignada para este día")).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("al navegar a otro día, la banda cambia de título en vez de repetir 'Hoy'", async () => {
    const user = userEvent.setup();
    mockGetActivePlan.mockResolvedValue({ data: makePlan(), error: null });
    mockGetPlanDay.mockResolvedValueOnce({ data: trainingDay, error: null }).mockResolvedValue({
      data: { ...trainingDay, day_date: "2026-08-06", title: "Espalda y bíceps" },
      error: null,
    });
    mockGetDayExercises.mockResolvedValue({ data: [], error: null });

    renderScreen();

    await screen.findByRole("heading", { level: 2, name: "Pecho y tríceps" });
    await user.click(screen.getByRole("button", { name: "Día siguiente" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Espalda y bíceps" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pecho y tríceps" })).not.toBeInTheDocument();
  });
});
