import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { DIET_SNAPSHOT_KEY, readDietSnapshot, writeDietSnapshot } from "@/lib/dietCache";
import type { DietPlanFull } from "@/lib/types";

/** Service mockeado en su frontera — el hook solo compone el resultado. */
vi.mock("@/services/diet", () => ({
  getActiveDietPlan: vi.fn(),
  DIET_ERROR_LOAD: "No se pudo cargar la dieta",
}));

import { getActiveDietPlan } from "@/services/diet";
import { useDietPlan } from "@/hooks/useDietPlan";

const mockGetActiveDietPlan = vi.mocked(getActiveDietPlan);

/** `dietCache` es REAL sobre el localStorage de jsdom: se afirma la persistencia. */
function makePlan(overrides: Partial<DietPlanFull> = {}): DietPlanFull {
  return {
    id: "diet-1",
    user_id: "user-1",
    name: "Recomposición — Septiembre 2026",
    goal: null,
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    status: "active",
    kcal_objetivo: 2000,
    proteina_g: 160,
    carbohidrato_g: 195,
    grasa_g: 65,
    ventana_inicio: "10:00:00",
    ventana_fin: "18:00:00",
    created_at: "2026-09-01T00:00:00Z",
    diet_meals: [],
    diet_checklist_items: [],
    diet_supplements: [],
    diet_sections: [],
    ...overrides,
  };
}

const plan = makePlan();
const cachedPlan = makePlan({ id: "diet-cache", name: "Plan guardado — Agosto 2026" });
const SAVED_AT = "2026-09-10T15:15:00.000Z";

/** Deja un snapshot en el dispositivo, como si una carga con red hubiera ocurrido. */
function seedSnapshot(): void {
  writeDietSnapshot(cachedPlan, new Date(SAVED_AT));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useDietPlan — sin snapshot (10 R16, R17, R18; 12 R7, R8, R10)", () => {
  it("arranca en loading y entrega el plan al resolver, persistiendo el snapshot (R7, R8)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: plan, error: null });

    const { result } = renderHook(() => useDietPlan());

    expect(result.current.loading).toBe(true);
    expect(result.current.plan).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan).toEqual(plan);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.savedAt).toBeNull();
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(1);
    expect(readDietSnapshot()?.plan).toEqual(plan);
  });

  it("sin plan activo: plan null, sin error y sin snapshot escrito (10 R17; 12 R4, R8)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plan).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(localStorage.getItem(DIET_SNAPSHOT_KEY)).toBeNull();
  });

  it("error sin snapshot expone el mensaje en español, no el estado stale (R10)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: null, error: "No se pudo cargar la dieta" });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("No se pudo cargar la dieta");
    expect(result.current.plan).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.savedAt).toBeNull();
  });

  it("retry() tras un error vuelve a loading, reconsulta y limpia el error (R10)", async () => {
    mockGetActiveDietPlan.mockResolvedValueOnce({
      data: null,
      error: "No se pudo cargar la dieta",
    });
    mockGetActiveDietPlan.mockResolvedValue({ data: plan, error: null });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.error).toBe("No se pudo cargar la dieta"));

    act(() => {
      result.current.retry();
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.plan).toEqual(plan));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(2);
  });

  it("al desmontar durante la carga no actualiza estado (sin warnings de React)", async () => {
    let resolve: (value: { data: DietPlanFull; error: null }) => void = () => undefined;
    mockGetActiveDietPlan.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result, unmount } = renderHook(() => useDietPlan());
    expect(result.current.loading).toBe(true);
    unmount();

    await act(async () => {
      resolve({ data: plan, error: null });
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("useDietPlan — con snapshot (R6, R8, R9)", () => {
  beforeEach(() => {
    seedSnapshot();
  });

  it("el primer render ya muestra el snapshot sin pasar por loading (R6)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: plan, error: null });

    const { result } = renderHook(() => useDietPlan());

    expect(result.current.loading).toBe(false);
    expect(result.current.plan).toEqual(cachedPlan);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.savedAt).toBeNull();

    await waitFor(() => expect(result.current.plan).toEqual(plan));
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(1);
    expect(readDietSnapshot()?.plan.id).toBe("diet-1");
  });

  it("la respuesta OK reemplaza el snapshot mostrado y el persistido (R8)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: plan, error: null });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.plan?.id).toBe("diet-1"));

    expect(result.current.isStale).toBe(false);
    expect(readDietSnapshot()?.plan).toEqual(plan);
    expect(readDietSnapshot()?.savedAt).not.toBe(SAVED_AT);
  });

  it("si la red dice que ya no hay plan, se vacía la pantalla y se borra el snapshot (R4, R8)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useDietPlan());
    expect(result.current.plan).toEqual(cachedPlan);

    await waitFor(() => expect(result.current.plan).toBeNull());
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(localStorage.getItem(DIET_SNAPSHOT_KEY)).toBeNull();
  });

  it("si la red falla, conserva el snapshot con isStale y savedAt, sin error (R9)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: null, error: "No se pudo cargar la dieta" });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.isStale).toBe(true));

    expect(result.current.plan).toEqual(cachedPlan);
    expect(result.current.savedAt).toBe(SAVED_AT);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    // El snapshot sigue intacto en el dispositivo para la próxima apertura.
    expect(readDietSnapshot()?.plan).toEqual(cachedPlan);
  });

  it("si la red falla y el snapshot se corrompió entre medias, cae al estado de error (R9, R10)", async () => {
    mockGetActiveDietPlan.mockImplementation(async () => {
      localStorage.setItem(DIET_SNAPSHOT_KEY, "{corrupto");
      return { data: null, error: "No se pudo cargar la dieta" };
    });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.error).toBe("No se pudo cargar la dieta"));

    expect(result.current.isStale).toBe(false);
    expect(result.current.plan).toBeNull();
  });
});

describe("useDietPlan — reintento al volver la red (R11)", () => {
  beforeEach(() => {
    seedSnapshot();
  });

  it("en stale, el evento 'online' relanza la consulta y el plan fresco quita el banner", async () => {
    mockGetActiveDietPlan.mockResolvedValueOnce({
      data: null,
      error: "No se pudo cargar la dieta",
    });
    mockGetActiveDietPlan.mockResolvedValue({ data: plan, error: null });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.isStale).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.isStale).toBe(false));
    expect(result.current.plan).toEqual(plan);
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(2);
  });

  it("si el reintento vuelve a fallar, sigue mostrando el snapshot (R11, R9)", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: null, error: "No se pudo cargar la dieta" });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.isStale).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(2));
    expect(result.current.isStale).toBe(true);
    expect(result.current.plan).toEqual(cachedPlan);
    expect(result.current.savedAt).toBe(SAVED_AT);
    expect(result.current.error).toBeNull();
  });

  it("con datos frescos el evento 'online' NO relanza nada", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: plan, error: null });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.plan).toEqual(plan));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await Promise.resolve();
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(1);
  });

  it("al desmontar en stale se retira el listener de 'online'", async () => {
    mockGetActiveDietPlan.mockResolvedValue({ data: null, error: "No se pudo cargar la dieta" });
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { result, unmount } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.isStale).toBe(true));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
  });

  it("al dejar de estar stale también se retira el listener", async () => {
    mockGetActiveDietPlan.mockResolvedValueOnce({
      data: null,
      error: "No se pudo cargar la dieta",
    });
    mockGetActiveDietPlan.mockResolvedValue({ data: plan, error: null });

    const { result } = renderHook(() => useDietPlan());
    await waitFor(() => expect(result.current.isStale).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(result.current.isStale).toBe(false));

    // Ya sin banner: un nuevo 'online' no dispara una tercera consulta.
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await Promise.resolve();
    expect(mockGetActiveDietPlan).toHaveBeenCalledTimes(2);
  });
});
