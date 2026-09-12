import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PlanExerciseDetail } from "@/lib/types";

/** Service mockeado en su frontera (R10); ningún supabase.from en la pantalla. */
vi.mock("@/services/exercises", () => ({
  getPlanExerciseDetail: vi.fn(),
  EXERCISES_ERROR_LOAD: "No se pudo cargar el ejercicio",
}));

/** Services de logs mockeados: la pantalla monta <LoggingSection /> (05). */
vi.mock("@/services/logs", () => ({
  getPreviousSession: vi.fn(),
  getSessionSets: vi.fn(),
  logSet: vi.fn(),
  LOGS_ERROR_LOAD: "No se pudieron cargar las series",
  LOGS_ERROR_SAVE: "No se pudo guardar la serie, reintenta",
}));

import { getPlanExerciseDetail } from "@/services/exercises";
import { getPreviousSession, getSessionSets } from "@/services/logs";
import ExerciseScreen from "@/screens/ExerciseScreen";

const mockGetDetail = vi.mocked(getPlanExerciseDetail);

function makeDetail(overrides: Partial<PlanExerciseDetail> = {}): PlanExerciseDetail {
  return {
    id: "pe-1",
    plan_day_id: "day-1",
    exercise_id: "0001",
    position: 1,
    target_sets: 4,
    target_reps: "8-12",
    rest_seconds: 120,
    notes: null,
    exercises: {
      id: "0001",
      name: "Press de banca",
      body_part: "chest",
      equipment: "barbell",
      target: "pectorals",
      muscle_group: "chest",
      secondary_muscles: ["triceps"],
      instructions_es: "Acuéstate en el banco y empuja la barra.",
      instruction_steps_es: [
        "Acuéstate en el banco",
        "Baja la barra al pecho",
        "Empuja hasta arriba",
      ],
      image_url: "https://storage.example/0001.png",
      gif_url: "https://storage.example/0001.gif",
      attribution: "Gym visual",
    },
    ...overrides,
  };
}

function renderScreen(planExerciseId = "pe-1") {
  render(
    <MemoryRouter initialEntries={[`/ejercicio/${planExerciseId}`]}>
      <Routes>
        <Route path="/" element={<h1>Hoy</h1>} />
        <Route path="/ejercicio/:planExerciseId" element={<ExerciseScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPreviousSession).mockResolvedValue({ data: [], error: null });
  vi.mocked(getSessionSets).mockResolvedValue({ data: [], error: null });
});

describe("ExerciseScreen — render completo (R1–R6)", () => {
  it("R1: pide el detalle con el id de la URL y muestra el nombre como título", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen("pe-1");

    expect(
      await screen.findByRole("heading", { name: "Press de banca", level: 1 }),
    ).toBeInTheDocument();
    expect(mockGetDetail).toHaveBeenCalledWith("pe-1");
  });

  it("R2: muestra el GIF con alt en español sobre la caja placeholder", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    const gif = await screen.findByAltText("Demostración de Press de banca");
    expect(gif).toHaveAttribute("src", "https://storage.example/0001.gif");
    expect(screen.getByTestId("exercise-media")).toHaveClass("aspect-square");
  });

  it("R3: renderiza los pasos como lista ordenada numerada, en orden", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    await screen.findByRole("heading", { name: "Instrucciones" });
    // Hay más de una lista en la pantalla (la sección de registro usa <ul>):
    // los pasos son la única lista ordenada.
    const list = screen.getAllByRole("list").find((candidate) => candidate.tagName === "OL");
    if (list === undefined) {
      throw new Error("No se encontró la lista ordenada de pasos");
    }
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Acuéstate en el banco",
      "Baja la barra al pecho",
      "Empuja hasta arriba",
    ]);
  });

  it("R4: muestra las metas '4 × 8-12' y 'Descanso: 120 s' cuando hay rest_seconds", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    expect(await screen.findByText(/4 × 8-12/)).toBeInTheDocument();
    expect(screen.getByText(/Descanso: 120 s/)).toBeInTheDocument();
  });

  it("R4: sin rest_seconds no muestra la línea de descanso", async () => {
    mockGetDetail.mockResolvedValue({
      data: makeDetail({ rest_seconds: null, target_reps: "al fallo", target_sets: 3 }),
      error: null,
    });

    renderScreen();

    expect(await screen.findByText(/3 × al fallo/)).toBeInTheDocument();
    expect(screen.queryByText(/Descanso:/)).not.toBeInTheDocument();
  });

  it("R5: muestra chips de equipo y músculo objetivo", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    expect(await screen.findByText("barbell")).toBeInTheDocument();
    expect(screen.getByText("pectorals")).toBeInTheDocument();
  });

  it("R5: muestra las notas del plan cuando existen", async () => {
    mockGetDetail.mockResolvedValue({
      data: makeDetail({ notes: "Última serie al fallo" }),
      error: null,
    });

    renderScreen();

    expect(await screen.findByText("Última serie al fallo")).toBeInTheDocument();
  });

  it("R5: sin notas no renderiza el callout", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail({ notes: null }), error: null });

    renderScreen();

    await screen.findByRole("heading", { name: "Press de banca", level: 1 });
    expect(screen.queryByText("Última serie al fallo")).not.toBeInTheDocument();
  });

  it("05/R1: monta la sección 'Registro de series' bajo la info del detalle", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    expect(await screen.findByRole("heading", { name: "Registro de series" })).toBeInTheDocument();
    // target_sets = 4 → cuatro filas de serie con su botón de guardar
    expect(await screen.findAllByRole("button", { name: "Guardar serie" })).toHaveLength(4);
  });

  it("06/R5: el enlace 'Ver historial' apunta a /historial/{exercise_id} con target ≥ 44px", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    const link = await screen.findByRole("link", { name: "Ver historial" });
    // Usa el id del ejercicio ('0001'), no el del plan_exercise ('pe-1').
    expect(link).toHaveAttribute("href", "/historial/0001");
    expect(link).toHaveClass("min-h-11");
  });

  it("R6: la atribución de Gym Visual es visible y enlaza a gymvisual.com", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    const attribution = await screen.findByRole("link", {
      name: "© Gym visual — https://gymvisual.com/",
    });
    expect(attribution).toHaveAttribute("href", "https://gymvisual.com/");
  });
});

describe("ExerciseScreen — no encontrado (R7)", () => {
  it("id inexistente o filtrado por RLS muestra 'Ejercicio no encontrado' con volver", async () => {
    mockGetDetail.mockResolvedValue({ data: null, error: null });

    renderScreen("11111111-1111-1111-1111-111111111111");

    expect(await screen.findByText("Ejercicio no encontrado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a Hoy" })).toHaveAttribute("href", "/");
  });

  it("el control 'Volver a Hoy' del estado no-encontrado regresa a Hoy", async () => {
    mockGetDetail.mockResolvedValue({ data: null, error: null });

    renderScreen();

    await screen.findByText("Ejercicio no encontrado");
    await userEvent.click(screen.getByRole("link", { name: "Volver a Hoy" }));

    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument();
  });
});

describe("ExerciseScreen — carga, error y navegación (R8, R9, R10)", () => {
  it("R9: muestra el estado de carga mientras la consulta no resuelve", () => {
    mockGetDetail.mockReturnValue(new Promise(() => undefined));

    renderScreen();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando ejercicio…");
  });

  it("R9: en fallo muestra 'No se pudo cargar el ejercicio' y 'Reintentar' recarga", async () => {
    mockGetDetail.mockResolvedValueOnce({
      data: null,
      error: "No se pudo cargar el ejercicio",
    });
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el ejercicio");

    const retryButton = screen.getByRole("button", { name: "Reintentar" });
    expect(retryButton).toHaveClass("min-h-11");
    await userEvent.click(retryButton);

    expect(
      await screen.findByRole("heading", { name: "Press de banca", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("R8: el control de volver del header enlaza a '/' y regresa a Hoy", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    const back = await screen.findByRole("link", { name: "Volver" });
    expect(back).toHaveAttribute("href", "/");
    await userEvent.click(back);

    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument();
  });

  it("R10: el control de volver tiene target táctil ≥ 44px", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    const back = await screen.findByRole("link", { name: "Volver" });
    expect(back).toHaveClass("min-h-11");
    expect(back).toHaveClass("min-w-11");
  });
});

describe("ExerciseScreen — espacio para la barra inferior (10 R3)", () => {
  it("el <main> reserva pb-24 para que la navegación no tape el contenido", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    await screen.findByRole("heading", { name: "Press de banca", level: 1 });
    expect(screen.getByRole("main")).toHaveClass("pb-24");
  });
});

describe("ExerciseScreen — 14 ciclorama (R12, R13, R14)", () => {
  it("R13: header nocturno con back secundario y título a 24 px", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    const back = await screen.findByRole("link", { name: "Volver" });
    expect(back).toHaveClass("border-2", "border-day", "min-h-11", "min-w-11", "rounded-sm");
    expect(back.closest("header")).toHaveClass("border-blackout");
    expect(screen.getByRole("heading", { name: "Press de banca", level: 1 })).toHaveClass(
      "text-2xl",
      "font-bold",
    );
  });

  it("R14: metas en numerales tabulares grandes, chips sin píldora y notas con borde rosa", async () => {
    mockGetDetail.mockResolvedValue({
      data: makeDetail({ notes: "Controla la bajada" }),
      error: null,
    });

    renderScreen();

    const target = await screen.findByText(/4 × 8-12/);
    expect(target).toHaveClass("text-3xl", "font-extrabold", "tabular-nums");
    expect(screen.getByText(/Descanso: 120 s/)).toHaveClass("text-day/60");

    const chip = screen.getByText("barbell");
    expect(chip).toHaveClass("rounded-sm", "border", "border-day/40");
    expect(chip).not.toHaveClass("rounded-full");

    expect(screen.getByText("Controla la bajada")).toHaveClass("border-2", "border-dawn-rose");
    expect(screen.getByRole("link", { name: "Ver historial" })).toHaveClass(
      "border-2",
      "border-day",
      "w-full",
      "min-h-11",
    );
    expect(screen.getByRole("link", { name: /Gym visual/ })).toHaveClass("underline", "min-h-11");
  });

  it("R12: carga, error y 'Volver a Hoy' usan el vocabulario único de estados", async () => {
    mockGetDetail.mockReturnValueOnce(new Promise(() => undefined));
    renderScreen();
    expect(screen.getByRole("status")).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    cleanup();

    mockGetDetail.mockResolvedValueOnce({ data: null, error: "No se pudo cargar el ejercicio" });
    renderScreen();
    expect(await screen.findByRole("alert")).toHaveClass("text-cue-fault", "font-semibold");
    expect(screen.getByRole("button", { name: "Reintentar" })).toHaveClass(
      "bg-horizon",
      "min-h-11",
    );
    cleanup();

    mockGetDetail.mockResolvedValueOnce({ data: null, error: null });
    renderScreen("nope");
    expect(await screen.findByText("Ejercicio no encontrado")).toHaveClass("text-day/90");
    expect(screen.getByRole("link", { name: "Volver a Hoy" })).toHaveClass(
      "bg-horizon",
      "min-h-11",
    );
  });
});

describe("ExerciseScreen — ronda 2 (punto C: tres niveles de acción)", () => {
  it("'Ver historial' es terciario: mismo cuadro de 44 px, al 60 %", async () => {
    mockGetDetail.mockResolvedValue({ data: makeDetail(), error: null });

    renderScreen();

    const history = await screen.findByRole("link", { name: "Ver historial" });
    expect(history).toHaveClass("border-2", "border-day", "min-h-11", "w-full", "opacity-60");
    // El control de volver, que es chrome de navegación del encabezado, no se atenúa.
    expect(screen.getByRole("link", { name: "Volver" })).not.toHaveClass("opacity-60");
    // El primario sigue siendo exclusivo del horizonte (aquí, la fila activa del registro).
    expect(history.className).not.toContain("bg-horizon");
  });
});
