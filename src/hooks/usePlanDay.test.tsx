import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Plan, PlanDay, PlanExerciseWithExercise } from "@/lib/types";

/** Services mockeados en su frontera — el hook solo compone resultados (R9). */
vi.mock("@/services/plans", () => ({
  getActivePlan: vi.fn(),
  getPlanDay: vi.fn(),
  getDayExercises: vi.fn(),
  PLANS_ERROR_LOAD: "No se pudo cargar la rutina",
}));

import { getActivePlan, getDayExercises, getPlanDay } from "@/services/plans";
import { usePlanDay } from "@/hooks/usePlanDay";

const mockGetActivePlan = vi.mocked(getActivePlan);
const mockGetPlanDay = vi.mocked(getPlanDay);
const mockGetDayExercises = vi.mocked(getDayExercises);

const plan: Plan = {
  id: "plan-1",
  user_id: "user-1",
  name: "Plan de prueba",
  goal: null,
  start_date: "2026-08-03",
  end_date: "2026-08-07",
  status: "active",
  created_at: "2026-08-01T00:00:00Z",
};

const trainingDay: PlanDay = {
  id: "day-1",
  plan_id: "plan-1",
  day_date: "2026-08-05",
  title: "Pecho y tríceps",
  is_rest: false,
};

const restDay: PlanDay = { ...trainingDay, id: "day-2", title: "Descanso", is_rest: true };

const exercises: PlanExerciseWithExercise[] = [
  {
    id: "pe-1",
    plan_day_id: "day-1",
    exercise_id: "0001",
    position: 1,
    target_sets: 4,
    target_reps: "8-12",
    rest_seconds: 90,
    notes: null,
    exercises: {
      id: "0001",
      name: "Press de banca",
      image_url: "https://storage.example/0001.png",
      equipment: "barbell",
      target: "pectorals",
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlanDay (R1, R8)", () => {
  it("camino feliz: plan + día + ejercicios, con loading intermedio", async () => {
    mockGetActivePlan.mockResolvedValue({ data: plan, error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: exercises, error: null });

    const { result } = renderHook(() => usePlanDay("2026-08-05"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.plan).toEqual(plan);
    expect(result.current.day).toEqual(trainingDay);
    expect(result.current.exercises).toEqual(exercises);
    expect(mockGetPlanDay).toHaveBeenCalledWith("plan-1", "2026-08-05");
    expect(mockGetDayExercises).toHaveBeenCalledWith("day-1");
  });

  it("sin plan activo: corta temprano sin pedir día ni ejercicios (R5)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePlanDay("2026-08-05"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetPlanDay).not.toHaveBeenCalled();
    expect(mockGetDayExercises).not.toHaveBeenCalled();
  });

  it("día de descanso: no pide ejercicios (R3)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: plan, error: null });
    mockGetPlanDay.mockResolvedValue({ data: restDay, error: null });

    const { result } = renderHook(() => usePlanDay("2026-08-05"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.day).toEqual(restDay);
    expect(result.current.exercises).toEqual([]);
    expect(mockGetDayExercises).not.toHaveBeenCalled();
  });

  it("fecha sin día asignado: day null, sin error (R4)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: plan, error: null });
    mockGetPlanDay.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePlanDay("2026-08-06"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan).toEqual(plan);
    expect(result.current.day).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetDayExercises).not.toHaveBeenCalled();
  });

  it("error en getActivePlan se propaga como error en español (R8)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: null, error: "No se pudo cargar la rutina" });

    const { result } = renderHook(() => usePlanDay("2026-08-05"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("No se pudo cargar la rutina");
    expect(mockGetPlanDay).not.toHaveBeenCalled();
  });

  it("error en getDayExercises conserva plan y día pero reporta el error (R8)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: plan, error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: null, error: "No se pudo cargar la rutina" });

    const { result } = renderHook(() => usePlanDay("2026-08-05"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("No se pudo cargar la rutina");
    expect(result.current.plan).toEqual(plan);
    expect(result.current.day).toEqual(trainingDay);
    expect(result.current.exercises).toEqual([]);
  });

  it("retry() tras un error vuelve a cargar y limpia el error (R8)", async () => {
    mockGetActivePlan.mockResolvedValueOnce({ data: null, error: "No se pudo cargar la rutina" });
    mockGetActivePlan.mockResolvedValue({ data: plan, error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: exercises, error: null });

    const { result } = renderHook(() => usePlanDay("2026-08-05"));
    await waitFor(() => expect(result.current.error).toBe("No se pudo cargar la rutina"));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.exercises).toEqual(exercises));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockGetActivePlan).toHaveBeenCalledTimes(2);
  });

  it("al cambiar la fecha vuelve a consultar el día con la nueva fecha (R6)", async () => {
    mockGetActivePlan.mockResolvedValue({ data: plan, error: null });
    mockGetPlanDay.mockResolvedValue({ data: trainingDay, error: null });
    mockGetDayExercises.mockResolvedValue({ data: exercises, error: null });

    const { result, rerender } = renderHook(({ date }) => usePlanDay(date), {
      initialProps: { date: "2026-08-05" },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetPlanDay.mockResolvedValue({ data: null, error: null });
    rerender({ date: "2026-08-06" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.day).toBeNull();
    expect(mockGetPlanDay).toHaveBeenLastCalledWith("plan-1", "2026-08-06");
  });
});
