import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKLIST_STORAGE_PREFIX,
  OTROS_LABEL,
  checklistStorageKey,
  groupByCategoria,
  readChecked,
  selectChecklist,
  writeChecked,
} from "@/lib/checklist";
import type { DietChecklistItem } from "@/lib/types";

const PLAN = "diet-1";

/** Renglón de checklist con lo mínimo para el caso bajo prueba. */
function makeItem(overrides: Partial<DietChecklistItem> = {}): DietChecklistItem {
  return {
    id: "chk-1",
    diet_plan_id: PLAN,
    kind: "super",
    position: 1,
    categoria: null,
    item: "Pollo",
    cantidad: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("checklistStorageKey (R1)", () => {
  it("compone exactamente gym:diet:check:<planId>:<kind>", () => {
    expect(CHECKLIST_STORAGE_PREFIX).toBe("gym:diet:check:");
    expect(checklistStorageKey("diet-1", "meal_prep")).toBe("gym:diet:check:diet-1:meal_prep");
    expect(checklistStorageKey("diet-1", "super")).toBe("gym:diet:check:diet-1:super");
  });

  it("planes distintos producen claves distintas (R14)", () => {
    expect(checklistStorageKey("A", "super")).not.toBe(checklistStorageKey("B", "super"));
  });
});

describe("readChecked / writeChecked — camino feliz (R1, R3)", () => {
  it("sin clave guardada devuelve un Set vacío", () => {
    expect(readChecked(PLAN, "super")).toEqual(new Set());
  });

  it("el round-trip conserva los ids y el raw es un array JSON exacto", () => {
    writeChecked(PLAN, "super", ["a", "b"]);

    expect(localStorage.getItem(checklistStorageKey(PLAN, "super"))).toBe('["a","b"]');
    expect(readChecked(PLAN, "super")).toEqual(new Set(["a", "b"]));
  });

  it('un set vacío se guarda como "[]" y se relee vacío (R6)', () => {
    writeChecked(PLAN, "super", ["a"]);
    writeChecked(PLAN, "super", []);

    expect(localStorage.getItem(checklistStorageKey(PLAN, "super"))).toBe("[]");
    expect(readChecked(PLAN, "super")).toEqual(new Set());
  });

  it("acepta cualquier iterable de ids (un Set, como el del hook)", () => {
    writeChecked(PLAN, "meal_prep", new Set(["x", "y"]));

    expect(localStorage.getItem(checklistStorageKey(PLAN, "meal_prep"))).toBe('["x","y"]');
  });

  it("no escribe ninguna otra clave (R1, R15)", () => {
    writeChecked(PLAN, "super", ["a"]);

    expect(Object.keys(localStorage)).toEqual([checklistStorageKey(PLAN, "super")]);
  });

  it("las dos listas del mismo plan son independientes (R6)", () => {
    writeChecked(PLAN, "meal_prep", ["m1"]);
    writeChecked(PLAN, "super", ["s1"]);

    expect(readChecked(PLAN, "meal_prep")).toEqual(new Set(["m1"]));
    expect(readChecked(PLAN, "super")).toEqual(new Set(["s1"]));
  });

  it("dos planes distintos no se pisan: escribir en B deja A intacto (R14)", () => {
    writeChecked("A", "super", ["a1"]);
    writeChecked("B", "super", ["b1"]);

    expect(readChecked("A", "super")).toEqual(new Set(["a1"]));
    expect(readChecked("B", "super")).toEqual(new Set(["b1"]));
  });
});

describe("readChecked — valores corruptos (R4)", () => {
  it.each([
    ['"{"', "{"],
    ['"{}"', "{}"],
    ['"\\"x\\""', '"x"'],
    ['"42"', "42"],
    ['""', ""],
  ])("%s se lee como Set vacío sin lanzar", (_label, raw) => {
    localStorage.setItem(checklistStorageKey(PLAN, "super"), raw);

    expect(() => readChecked(PLAN, "super")).not.toThrow();
    expect(readChecked(PLAN, "super")).toEqual(new Set());
  });

  it("un array con entradas no-string conserva solo las strings", () => {
    localStorage.setItem(checklistStorageKey(PLAN, "super"), '[1,null,"a",{},true,"b"]');

    expect(readChecked(PLAN, "super")).toEqual(new Set(["a", "b"]));
  });

  it("un array vacío se lee como Set vacío", () => {
    localStorage.setItem(checklistStorageKey(PLAN, "super"), "[]");

    expect(readChecked(PLAN, "super")).toEqual(new Set());
  });
});

describe("readChecked / writeChecked — almacenamiento hostil (R5)", () => {
  it("si getItem lanza, la lectura devuelve vacío sin propagar", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: acceso a almacenamiento bloqueado");
    });

    expect(readChecked(PLAN, "super")).toEqual(new Set());
  });

  it("si setItem lanza, la escritura se traga el fallo sin propagar", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writeChecked(PLAN, "super", ["a"])).not.toThrow();
  });

  it("sin localStorage en el entorno, lectura vacía y escritura inocua", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(readChecked(PLAN, "super")).toEqual(new Set());
    expect(() => writeChecked(PLAN, "super", ["a"])).not.toThrow();
  });

  it("si el propio acceso a localStorage lanza (Safari privado), nada propaga", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: el acceso a localStorage está bloqueado");
      },
    });

    try {
      expect(readChecked(PLAN, "super")).toEqual(new Set());
      expect(() => writeChecked(PLAN, "super", ["a"])).not.toThrow();
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(globalThis, "localStorage");
      } else {
        Object.defineProperty(globalThis, "localStorage", original);
      }
    }

    // Restaurado el entorno, el almacenamiento vuelve a funcionar.
    writeChecked(PLAN, "super", ["a"]);
    expect(readChecked(PLAN, "super")).toEqual(new Set(["a"]));
  });
});

describe("selectChecklist (R9)", () => {
  const items: DietChecklistItem[] = [
    makeItem({ id: "s2", kind: "super", position: 2, item: "Arroz" }),
    makeItem({ id: "m2", kind: "meal_prep", position: 2, item: "Deshebrar tinga" }),
    makeItem({ id: "s1", kind: "super", position: 1, item: "Pollo" }),
    makeItem({ id: "m1", kind: "meal_prep", position: 1, item: "Cocer pollo" }),
  ];

  it("filtra por kind y ordena por position asc", () => {
    expect(selectChecklist(items, "meal_prep").map((i) => i.id)).toEqual(["m1", "m2"]);
    expect(selectChecklist(items, "super").map((i) => i.id)).toEqual(["s1", "s2"]);
  });

  it("no muta el array de entrada", () => {
    const before = items.map((i) => i.id);

    selectChecklist(items, "super");

    expect(items.map((i) => i.id)).toEqual(before);
  });

  it("sin renglones de ese kind devuelve []", () => {
    expect(selectChecklist([makeItem({ kind: "super" })], "meal_prep")).toEqual([]);
    expect(selectChecklist([], "super")).toEqual([]);
  });
});

describe("groupByCategoria (R10)", () => {
  /** Atajo para describir la salida como [label, ids…]. */
  function shape(items: DietChecklistItem[]): [string, string[]][] {
    return groupByCategoria(items).map((g) => [g.label, g.items.map((i) => i.id)]);
  }

  it("agrupa por orden de primera aparición, no alfabético", () => {
    const items = [
      makeItem({ id: "1", position: 1, categoria: "Proteínas", item: "Pollo" }),
      makeItem({ id: "2", position: 2, categoria: "Despensa", item: "Arroz" }),
      makeItem({ id: "3", position: 3, categoria: "Proteínas", item: "Huevo" }),
      makeItem({ id: "4", position: 4, categoria: "Suplementos", item: "Creatina" }),
    ];

    expect(shape(items)).toEqual([
      ["Proteínas", ["1", "3"]],
      ["Despensa", ["2"]],
      ["Suplementos", ["4"]],
    ]);
  });

  it("los renglones sin categoría van al grupo final Otros aunque sean los primeros", () => {
    const items = [
      makeItem({ id: "1", position: 1, categoria: null, item: "Sal" }),
      makeItem({ id: "2", position: 2, categoria: "Proteínas", item: "Pollo" }),
    ];

    expect(shape(items)).toEqual([
      ["Proteínas", ["2"]],
      [OTROS_LABEL, ["1"]],
    ]);
  });

  it("la categoría se compara tras trim()", () => {
    const items = [
      makeItem({ id: "1", position: 1, categoria: "  Despensa ", item: "Arroz" }),
      makeItem({ id: "2", position: 2, categoria: "Despensa", item: "Frijol" }),
    ];

    expect(shape(items)).toEqual([["Despensa", ["1", "2"]]]);
  });

  it("una categoría en blanco equivale a null", () => {
    const items = [
      makeItem({ id: "1", position: 1, categoria: "", item: "Sal" }),
      makeItem({ id: "2", position: 2, categoria: "   ", item: "Aceite" }),
    ];

    expect(shape(items)).toEqual([[OTROS_LABEL, ["1", "2"]]]);
  });

  it("con un único grupo sin categoría devuelve solo Otros (la UI omite el h3)", () => {
    const groups = groupByCategoria([makeItem({ id: "1", categoria: null })]);

    expect(groups).toHaveLength(1);
    expect(groups[0].categoria).toBeNull();
    expect(groups[0].label).toBe(OTROS_LABEL);
  });

  it("mayúsculas y acentos NO se normalizan: son grupos distintos (open item C)", () => {
    const items = [
      makeItem({ id: "1", position: 1, categoria: "Proteínas" }),
      makeItem({ id: "2", position: 2, categoria: "proteinas" }),
    ];

    expect(shape(items)).toEqual([
      ["Proteínas", ["1"]],
      ["proteinas", ["2"]],
    ]);
  });

  it("una lista vacía devuelve []", () => {
    expect(groupByCategoria([])).toEqual([]);
  });
});

describe("11 no abre ninguna superficie de escritura (R15)", () => {
  // Vitest corre con la raíz del repo como cwd (vite.config.ts).
  const MODULES = [
    ["src", "lib", "checklist.ts"],
    ["src", "hooks", "useChecklist.ts"],
    ["src", "components", "Checklist.tsx"],
    ["src", "components", "ChecklistItem.tsx"],
  ];

  it.each(MODULES)("%s/%s/%s no importa supabase ni services/", (...parts: string[]) => {
    const source = readFileSync(join(process.cwd(), ...parts), "utf8");

    expect(source).not.toMatch(/@\/lib\/supabase/);
    expect(source).not.toMatch(/@\/services\//);
  });

  it("el service de dieta de 10 sigue siendo de solo lectura", () => {
    const source = readFileSync(join(process.cwd(), "src", "services", "diet.ts"), "utf8");

    expect(source).not.toMatch(/\.(insert|update|delete|upsert|rpc)\(/);
  });

  it("solo se escriben claves con el prefijo gym:diet:check:", () => {
    const source = readFileSync(join(process.cwd(), "src", "lib", "checklist.ts"), "utf8");
    const setItemCalls = source.match(/setItem\(/g) ?? [];

    expect(setItemCalls).toHaveLength(1);
    expect(source).toMatch(/setItem\(checklistStorageKey\(planId, kind\)/);
  });
});
