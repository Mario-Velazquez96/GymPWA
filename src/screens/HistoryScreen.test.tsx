import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Exercise, WorkoutLog } from "@/lib/types";
import { UNIT_STORAGE_PREFIX } from "@/lib/units";

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
  localStorage.clear(); // 08: la preferencia de unidad vive en el dispositivo
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

    expect(await screen.findByText("Aún no hay registros de este ejercicio")).toBeInTheDocument();
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

describe("HistoryScreen — unidad por ejercicio (08 R12, R15)", () => {
  it("R12: sin preferencia guardada las sesiones se leen en kg, como en 06", async () => {
    mockGetHistory.mockResolvedValue({
      data: [makeLog({ weight_kg: 22.5, reps: 10 })],
      error: null,
    });

    renderScreen("0001");

    expect(await screen.findByText("Serie 1 — 22.5 kg × 10")).toBeInTheDocument();
  });

  it("R12: con 'lb' guardado para el ejercicio las sesiones se leen en libras", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0003`, "lb");
    mockGetHistory.mockResolvedValue({
      data: [makeLog({ exercise_id: "0003", weight_kg: 20.41, reps: 10 })],
      error: null,
    });

    renderScreen("0003");

    expect(await screen.findByText("Serie 1 — 45 lb × 10")).toBeInTheDocument();
    expect(screen.queryByText("Serie 1 — 20.41 kg × 10")).not.toBeInTheDocument();
  });

  it("R12: la preferencia es por ejercicio — otro id sigue en kg", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0003`, "lb");
    mockGetHistory.mockResolvedValue({
      data: [makeLog({ weight_kg: 22.5, reps: 10 })],
      error: null,
    });

    renderScreen("0001");

    expect(await screen.findByText("Serie 1 — 22.5 kg × 10")).toBeInTheDocument();
  });

  it("R12: la pantalla NO lleva toggle propio de unidad", async () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0003`, "lb");
    mockGetHistory.mockResolvedValue({
      data: [makeLog({ exercise_id: "0003", weight_kg: 20.41, reps: 10 })],
      error: null,
    });

    renderScreen("0003");

    await screen.findByText("Serie 1 — 45 lb × 10");
    expect(screen.queryByRole("group", { name: "Unidad de peso" })).not.toBeInTheDocument();
  });
});

describe("HistoryScreen — espacio para la barra inferior (10 R3)", () => {
  it("el <main> reserva pb-24 para que la navegación no tape el contenido", async () => {
    renderScreen();

    await screen.findByRole("heading", { name: "Press de banca", level: 1 });
    expect(screen.getByRole("main")).toHaveClass("pb-24");
  });
});

describe("HistoryScreen — 14 ciclorama (R12, R13, R19)", () => {
  it("R19: solo la sesión más reciente (primera) lleva latest; el resto va en day-wash", async () => {
    mockGetExercise.mockResolvedValue({ data: makeExercise(), error: null });
    mockGetHistory.mockResolvedValue({
      data: [
        makeLog({ id: "n1", performed_at: "2026-08-05", set_number: 1 }),
        makeLog({ id: "o1", performed_at: "2026-08-01", set_number: 1, weight_kg: 20 }),
      ],
      error: null,
    });

    renderScreen();

    const articles = await screen.findAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveAttribute("data-latest", "true");
    expect(articles[0]).toHaveClass("bg-day", "horizon-edge-l");
    expect(articles[1]).toHaveAttribute("data-latest", "false");
    expect(articles[1]).toHaveClass("bg-day-wash");
    expect(articles[0]?.parentElement).toHaveClass("gap-px");
    expect(screen.getByRole("main")).toHaveClass("pb-24", "bg-cyc-black");
  });

  it("R13: header nocturno con back secundario de 44 px y título a 24 px", async () => {
    mockGetExercise.mockResolvedValue({ data: makeExercise(), error: null });
    mockGetHistory.mockResolvedValue({ data: [], error: null });

    renderScreen();

    const back = await screen.findByRole("link", { name: "Volver" });
    expect(back).toHaveClass("border-2", "border-day", "min-h-11", "min-w-11");
    expect(back.closest("header")).toHaveClass("border-blackout");
    expect(await screen.findByRole("heading", { level: 1, name: "Press de banca" })).toHaveClass(
      "text-2xl",
    );
    expect(screen.getByText("Aún no hay registros de este ejercicio")).toHaveClass("text-day/90");
  });

  it("R12: carga y error con el vocabulario único", async () => {
    mockGetExercise.mockReturnValueOnce(new Promise(() => undefined));
    mockGetHistory.mockReturnValueOnce(new Promise(() => undefined));
    renderScreen();
    expect(screen.getByRole("status")).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    cleanup();

    mockGetExercise.mockResolvedValueOnce({ data: null, error: "No se pudo cargar el ejercicio" });
    mockGetHistory.mockResolvedValueOnce({ data: [], error: null });
    renderScreen();
    expect(await screen.findByRole("alert")).toHaveClass("text-cue-fault", "font-semibold");
    expect(screen.getByRole("button", { name: "Reintentar" })).toHaveClass(
      "bg-horizon",
      "min-h-11",
    );
  });
});
