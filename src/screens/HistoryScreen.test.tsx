import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Exercise, WorkoutLog } from "@/lib/types";

/** Services mockeados en su frontera (R7); ningún supabase.from en la pantalla. */
vi.mock("@/services/exercises", () => ({
  getExercise: vi.fn(),
  EXERCISES_ERROR_LOAD: "No se pudo cargar el ejercicio",
}));

vi.mock("@/services/logs", () => ({
  getExerciseHistory: vi.fn(),
  LOGS_ERROR_HISTORY: "No se pudo cargar el historial",
}));

import { getExercise } from "@/services/exercises";
import { getExerciseHistory } from "@/services/logs";
import HistoryScreen from "@/screens/HistoryScreen";

const mockGetExercise = vi.mocked(getExercise);
const mockGetHistory = vi.mocked(getExerciseHistory);

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "0001",
    name: "Press de banca",
    body_part: "chest",
    equipment: "barbell",
    target: "pectorals",
    muscle_group: "chest",
    secondary_muscles: ["triceps"],
    instructions_es: "Acuéstate en el banco y empuja la barra.",
    instruction_steps_es: ["Acuéstate en el banco", "Empuja hasta arriba"],
    image_url: "https://storage.example/0001.png",
    gif_url: "https://storage.example/0001.gif",
    attribution: "Gym visual",
    ...overrides,
  };
}

function makeLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "log-1",
    user_id: "user-1",
    exercise_id: "0001",
    plan_exercise_id: "pe-1",
    performed_at: "2026-08-05",
    set_number: 1,
    reps: 10,
    weight_kg: 22.5,
    created_at: "2026-08-05T18:00:00Z",
    ...overrides,
  };
}

function renderScreen(exerciseId = "0001") {
  render(
    <MemoryRouter initialEntries={[`/historial/${exerciseId}`]}>
      <Routes>
        <Route path="/" element={<h1>Hoy</h1>} />
        <Route path="/historial/:exerciseId" element={<HistoryScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExercise.mockResolvedValue({ data: makeExercise(), error: null });
  mockGetHistory.mockResolvedValue({ data: [], error: null });
});

describe("HistoryScreen — sesiones (06_history R1, R2, R3)", () => {
  it("R3: usa el id de la URL y muestra el nombre del ejercicio como título", async () => {
    mockGetExercise.mockResolvedValue({ data: makeExercise(), error: null });

    renderScreen("0001");

    expect(
      await screen.findByRole("heading", { name: "Press de banca", level: 1 }),
    ).toBeInTheDocument();
    expect(mockGetExercise).toHaveBeenCalledWith("0001");
    expect(mockGetHistory).toHaveBeenCalledWith("0001");
  });

  it("R1/R2: agrupa por fecha newest-first, cada sesión con sus series por set_number", async () => {
    mockGetHistory.mockResolvedValue({
      data: [
        makeLog({ id: "a", performed_at: "2026-08-05", set_number: 1, weight_kg: 25, reps: 8 }),
        makeLog({ id: "b", performed_at: "2026-08-05", set_number: 2, weight_kg: 25, reps: 6 }),
        makeLog({ id: "c", performed_at: "2026-08-03", set_number: 1, weight_kg: 22.5, reps: 10 }),
      ],
      error: null,
    });

    renderScreen();

    // Las dos sesiones renderizadas, la más reciente primero (R1).
    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(["mié 5 ago 2026", "lun 3 ago 2026"]);

    // La sesión más reciente muestra sus dos series con kg (R2).
    const recent = headings[0].closest("article");
    if (recent === null) {
      throw new Error("No se encontró la tarjeta de la sesión reciente");
    }
    const items = within(recent).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["Serie 1 — 25 kg × 8", "Serie 2 — 25 kg × 6"]);
  });
});

describe("HistoryScreen — estados vacío / no encontrado (06_history R4, R8)", () => {
  it("R4: sin registros muestra el estado vacío y el título sigue presente", async () => {
    mockGetExercise.mockResolvedValue({ data: makeExercise(), error: null });
    mockGetHistory.mockResolvedValue({ data: [], error: null });

    renderScreen();

    expect(
      await screen.findByText("Aún no hay registros de este ejercicio"),
    ).toBeInTheDocument();
    // El encabezado con el nombre del ejercicio sigue renderizando (R4).
    expect(screen.getByRole("heading", { name: "Press de banca", level: 1 })).toBeInTheDocument();
  });

  it("R8: id inexistente muestra 'Ejercicio no encontrado' con vuelta a Hoy", async () => {
    mockGetExercise.mockResolvedValue({ data: null, error: null });
    mockGetHistory.mockResolvedValue({ data: [], error: null });

    renderScreen("9999");

    expect(await screen.findByText("Ejercicio no encontrado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a Hoy" })).toHaveAttribute("href", "/");
  });

  it("R8: el control 'Volver a Hoy' del estado no-encontrado regresa a Hoy", async () => {
    mockGetExercise.mockResolvedValue({ data: null, error: null });

    renderScreen("9999");

    await screen.findByText("Ejercicio no encontrado");
    await userEvent.click(screen.getByRole("link", { name: "Volver a Hoy" }));

    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument();
  });
});

describe("HistoryScreen — carga y error (06_history R6)", () => {
  it("R6: muestra el estado de carga mientras las consultas no resuelven", () => {
    mockGetExercise.mockReturnValue(new Promise(() => undefined));
    mockGetHistory.mockReturnValue(new Promise(() => undefined));

    renderScreen();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando historial…");
  });

  it("R6: si el historial falla muestra el error y 'Reintentar' recarga", async () => {
    mockGetHistory.mockResolvedValueOnce({ data: null, error: "No se pudo cargar el historial" });
    mockGetHistory.mockResolvedValue({ data: [makeLog()], error: null });

    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el historial");

    const retry = screen.getByRole("button", { name: "Reintentar" });
    expect(retry).toHaveClass("min-h-11");
    await userEvent.click(retry);

    expect(await screen.findByRole("heading", { level: 2 })).toHaveTextContent("mié 5 ago 2026");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("R6: si falla la carga del ejercicio también entra al estado de error", async () => {
    mockGetExercise.mockResolvedValue({ data: null, error: "No se pudo cargar el ejercicio" });
    mockGetHistory.mockResolvedValue({ data: [], error: null });

    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el historial");
  });

  it("R7: el control de volver del header enlaza a '/' con target táctil ≥ 44px", async () => {
    renderScreen();

    const back = await screen.findByRole("link", { name: "Volver" });
    expect(back).toHaveAttribute("href", "/");
    expect(back).toHaveClass("min-h-11");
    expect(back).toHaveClass("min-w-11");
  });
});
