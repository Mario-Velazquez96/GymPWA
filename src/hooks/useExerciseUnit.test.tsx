import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { UNIT_STORAGE_PREFIX } from "@/lib/units";
import { useExerciseUnit } from "@/hooks/useExerciseUnit";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useExerciseUnit (08 R2, R3, R13)", () => {
  it("sin preferencia guardada arranca en kg (R3)", () => {
    const { result } = renderHook(() => useExerciseUnit("0001"));

    expect(result.current[0]).toBe("kg");
  });

  it("arranca en la unidad guardada del ejercicio (R2)", () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0003`, "lb");

    const { result } = renderHook(() => useExerciseUnit("0003"));

    expect(result.current[0]).toBe("lb");
  });

  it("un valor corrupto en el almacenamiento se lee como kg (R3)", () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0003`, "libras");

    const { result } = renderHook(() => useExerciseUnit("0003"));

    expect(result.current[0]).toBe("kg");
  });

  it("cambiar la unidad actualiza el estado y la persiste en el dispositivo (R2)", () => {
    const { result } = renderHook(() => useExerciseUnit("0003"));

    act(() => {
      result.current[1]("lb");
    });

    expect(result.current[0]).toBe("lb");
    expect(localStorage.getItem(`${UNIT_STORAGE_PREFIX}0003`)).toBe("lb");
  });

  it("la preferencia es por ejercicio: otro id sigue en kg (R2)", () => {
    const { result: bicep } = renderHook(() => useExerciseUnit("0003"));
    act(() => {
      bicep.current[1]("lb");
    });

    const { result: bench } = renderHook(() => useExerciseUnit("0001"));

    expect(bench.current[0]).toBe("kg");
  });

  it("al cambiar de exerciseId relee la preferencia de ese ejercicio (R2)", () => {
    localStorage.setItem(`${UNIT_STORAGE_PREFIX}0003`, "lb");

    const { result, rerender } = renderHook(({ id }: { id: string }) => useExerciseUnit(id), {
      initialProps: { id: "0001" },
    });
    expect(result.current[0]).toBe("kg");

    rerender({ id: "0003" });
    expect(result.current[0]).toBe("lb");

    rerender({ id: "0001" });
    expect(result.current[0]).toBe("kg");
  });

  it("con localStorage roto arranca en kg y el toggle sigue vivo en memoria (R13)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: acceso a almacenamiento bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError: acceso a almacenamiento bloqueado");
    });

    const { result } = renderHook(() => useExerciseUnit("0003"));
    expect(result.current[0]).toBe("kg");

    act(() => {
      result.current[1]("lb");
    });

    // El fallo de escritura no revierte el estado ni propaga error a la UI.
    expect(result.current[0]).toBe("lb");
  });
});
