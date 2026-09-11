import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNowMinutes } from "@/hooks/useNowMinutes";

/** Service mockeado para poder AFIRMAR que el tick del reloj no lo llama (R10). */
vi.mock("@/services/diet", () => ({
  getActiveDietPlan: vi.fn(),
  DIET_ERROR_LOAD: "No se pudo cargar la dieta",
}));

import { getActiveDietPlan } from "@/services/diet";
import { useDietPlan } from "@/hooks/useDietPlan";

const mockGetActiveDietPlan = vi.mocked(getActiveDietPlan);

/**
 * Reloj falso + hora del sistema fija: 15:00Z = 09:00 en America/Mexico_City
 * (R7). `useNowMinutes` no toca Supabase; el último bloque compone los dos
 * hooks de la pantalla para afirmar que el tick de 60 s **no** vuelve a
 * consultar el plan (R10).
 */
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-10T15:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useNowMinutes (R7, R10)", () => {
  it("el valor inicial son los minutos actuales en CDMX (09:00 → 540)", () => {
    const { result } = renderHook(() => useNowMinutes());

    expect(result.current).toBe(540);
  });

  it("no cambia antes de que pasen 60 s", () => {
    const { result } = renderHook(() => useNowMinutes());

    act(() => {
      vi.advanceTimersByTime(59_000);
    });

    expect(result.current).toBe(540);
  });

  it("al cumplirse 60 s recalcula la hora (09:00 → 09:01 → 541)", () => {
    const { result } = renderHook(() => useNowMinutes());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(541);

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(result.current).toBe(543);
  });

  it("acepta un intervalo personalizado", () => {
    const { result } = renderHook(() => useNowMinutes(1_000));

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(541);
  });

  it("al desmontar limpia el intervalo (clearInterval)", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useNowMinutes());

    unmount();

    expect(clearSpy).toHaveBeenCalledTimes(1);

    // Tras desmontar, avanzar el reloj no dispara nada (no hay timers vivos).
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useNowMinutes + useDietPlan — el tick no reconsulta (R10)", () => {
  it("a los 60 s cambia la hora y el plan NO se vuelve a pedir", async () => {
    mockGetActiveDietPlan.mockClear();
    mockGetActiveDietPlan.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => ({ diet: useDietPlan(), now: useNowMinutes() }));

    // Flush de la promesa del service (sin waitFor: el reloj es falso).
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.diet.loading).toBe(false);
    expect(result.current.now).toBe(540);
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.now).toBe(541);
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(180_000);
    });

    expect(result.current.now).toBe(544);
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(1);
  });
});
