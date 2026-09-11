import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChecklist } from "@/hooks/useChecklist";
import { checklistStorageKey } from "@/lib/checklist";

const KEY_SUPER = checklistStorageKey("A", "super");
const KEY_PREP = checklistStorageKey("A", "meal_prep");

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useChecklist — lectura inicial (R3)", () => {
  it("sin clave guardada arranca vacío y no escribe nada al montar", () => {
    const { result } = renderHook(() => useChecklist("A", "super"));

    expect([...result.current.checked]).toEqual([]);
    expect(localStorage.getItem(KEY_SUPER)).toBeNull();
  });

  it("arranca con los ids ya guardados del dispositivo", () => {
    localStorage.setItem(KEY_SUPER, '["s1","s2"]');

    const { result } = renderHook(() => useChecklist("A", "super"));

    expect(result.current.checked.has("s1")).toBe(true);
    expect(result.current.checked.has("s2")).toBe(true);
    expect(result.current.checked.size).toBe(2);
  });

  it("con un valor corrupto arranca vacío sin lanzar (R4)", () => {
    localStorage.setItem(KEY_SUPER, "{");

    const { result } = renderHook(() => useChecklist("A", "super"));

    expect([...result.current.checked]).toEqual([]);
  });
});

describe("useChecklist — toggle (R2)", () => {
  it("marca, persiste, desmarca y vuelve a persistir", () => {
    const { result } = renderHook(() => useChecklist("A", "super"));

    act(() => result.current.toggle("s1"));

    expect(result.current.checked.has("s1")).toBe(true);
    expect(localStorage.getItem(KEY_SUPER)).toBe('["s1"]');

    act(() => result.current.toggle("s2"));

    expect(localStorage.getItem(KEY_SUPER)).toBe('["s1","s2"]');

    act(() => result.current.toggle("s1"));

    expect(result.current.checked.has("s1")).toBe(false);
    expect(result.current.checked.has("s2")).toBe(true);
    expect(localStorage.getItem(KEY_SUPER)).toBe('["s2"]');
  });

  it("cada toque afecta solo a su id", () => {
    localStorage.setItem(KEY_SUPER, '["s1","s2","s3"]');

    const { result } = renderHook(() => useChecklist("A", "super"));
    act(() => result.current.toggle("s2"));

    expect([...result.current.checked].sort()).toEqual(["s1", "s3"]);
  });
});

describe("useChecklist — clearAll (R6)", () => {
  it('vacía el estado y persiste "[]"', () => {
    localStorage.setItem(KEY_SUPER, '["s1","s2"]');

    const { result } = renderHook(() => useChecklist("A", "super"));
    act(() => result.current.clearAll());

    expect([...result.current.checked]).toEqual([]);
    expect(localStorage.getItem(KEY_SUPER)).toBe("[]");
  });

  it("no toca la otra lista del mismo plan", () => {
    localStorage.setItem(KEY_PREP, '["m1"]');

    const { result } = renderHook(() => useChecklist("A", "super"));
    act(() => result.current.toggle("s1"));
    act(() => result.current.clearAll());

    expect(localStorage.getItem(KEY_PREP)).toBe('["m1"]');
  });

  it("las dos listas del mismo plan conviven sin pisarse", () => {
    const prep = renderHook(() => useChecklist("A", "meal_prep"));
    const sup = renderHook(() => useChecklist("A", "super"));

    act(() => prep.result.current.toggle("m1"));
    act(() => sup.result.current.toggle("s1"));

    expect(localStorage.getItem(KEY_PREP)).toBe('["m1"]');
    expect(localStorage.getItem(KEY_SUPER)).toBe('["s1"]');
    expect(prep.result.current.checked.has("s1")).toBe(false);
  });
});

describe("useChecklist — cambio de plan (R14)", () => {
  it("al cambiar de planId relee su clave y deja la vieja intacta", () => {
    localStorage.setItem(checklistStorageKey("B", "super"), '["b1"]');
    const { result, rerender } = renderHook(({ planId }) => useChecklist(planId, "super"), {
      initialProps: { planId: "A" },
    });

    act(() => result.current.toggle("a1"));
    expect(localStorage.getItem(KEY_SUPER)).toBe('["a1"]');

    rerender({ planId: "B" });

    expect([...result.current.checked]).toEqual(["b1"]);
    expect(localStorage.getItem(KEY_SUPER)).toBe('["a1"]');
  });

  it("un plan nuevo sin clave arranca limpio y no borra la del anterior", () => {
    const { result, rerender } = renderHook(({ planId }) => useChecklist(planId, "super"), {
      initialProps: { planId: "A" },
    });

    act(() => result.current.toggle("a1"));
    rerender({ planId: "B" });

    expect([...result.current.checked]).toEqual([]);
    expect(localStorage.getItem(checklistStorageKey("B", "super"))).toBeNull();
    expect(localStorage.getItem(KEY_SUPER)).toBe('["a1"]');
  });
});

describe("useChecklist — almacenamiento bloqueado (R5)", () => {
  it("con setItem que lanza, el tachado sigue vivo en memoria y no propaga", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError: almacenamiento bloqueado");
    });

    const { result } = renderHook(() => useChecklist("A", "super"));

    expect(() => act(() => result.current.toggle("s1"))).not.toThrow();
    expect(result.current.checked.has("s1")).toBe(true);

    act(() => result.current.toggle("s1"));
    expect(result.current.checked.has("s1")).toBe(false);

    expect(() => act(() => result.current.clearAll())).not.toThrow();
  });

  it("con getItem que lanza, arranca vacío y se puede tachar igual", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: almacenamiento bloqueado");
    });

    const { result } = renderHook(() => useChecklist("A", "super"));

    expect([...result.current.checked]).toEqual([]);
    act(() => result.current.toggle("s1"));
    expect(result.current.checked.has("s1")).toBe(true);
  });
});
