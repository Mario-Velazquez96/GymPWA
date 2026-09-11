import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DietChecklistItem,
  DietMeal,
  DietPlanFull,
  DietSection,
  DietSupplement,
} from "@/lib/types";

/**
 * El cliente supabase se mockea en la frontera de services/ (R4, R5): cada
 * caso arma la cadena `select → eq → limit` que la función espera y controla
 * el `{ data, error }` final, incluido el caso borde `supabase === null`.
 */
const mocks = vi.hoisted(() => {
  const from = vi.fn();
  const holder: { client: unknown } = { client: { from } };
  return { from, holder };
});

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return mocks.holder.client as SupabaseClient | null;
  },
  get isConfigured() {
    return mocks.holder.client !== null;
  },
}));

import { DIET_ERROR_LOAD, DIET_SELECT, getActiveDietPlan } from "@/services/diet";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/** Cadena select().eq().limit() → resultado (misma forma que getActivePlan). */
function stubChain(result: QueryResult | Error): { select: Mock; eq: Mock; limit: Mock } {
  const limit =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
  return { select, eq, limit };
}

function meal(id: string, position: number): DietMeal {
  return {
    id,
    diet_plan_id: "diet-1",
    position,
    title: `Comida ${position}`,
    hora: "10:00:00",
    kcal: 500,
    proteina_g: 40,
    items: ["Pollo 200 g"],
    notes: null,
  };
}

function checklist(id: string, position: number): DietChecklistItem {
  return {
    id,
    diet_plan_id: "diet-1",
    kind: "super",
    position,
    categoria: "Proteína",
    item: `Item ${position}`,
    cantidad: null,
  };
}

function supplement(id: string, position: number): DietSupplement {
  return {
    id,
    diet_plan_id: "diet-1",
    position,
    nombre: `Suplemento ${position}`,
    dosis: null,
    momento: null,
    nota: null,
    recomendado: true,
  };
}

function section(id: string, position: number): DietSection {
  return {
    id,
    diet_plan_id: "diet-1",
    position,
    kind: "libre",
    title: `Sección ${position}`,
    body_md: "**hola**",
  };
}

const rawPlan: DietPlanFull = {
  id: "diet-1",
  user_id: "user-1",
  name: "Recomposición — Septiembre 2026",
  goal: "Recomposición",
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
  // Hijas desordenadas a propósito: el service debe ordenarlas por position.
  diet_meals: [meal("m-3", 3), meal("m-1", 1), meal("m-2", 2)],
  diet_checklist_items: [checklist("c-2", 2), checklist("c-1", 1)],
  diet_supplements: [supplement("s-2", 2), supplement("s-1", 1)],
  diet_sections: [section("x-2", 2), section("x-1", 1)],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.holder.client = { from: mocks.from };
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

describe("getActiveDietPlan — consulta (R4, R19)", () => {
  it("emite exactamente una consulta anidada: from(diet_plans).select(DIET_SELECT).eq(status,active).limit(1)", async () => {
    const chain = stubChain({ data: [rawPlan], error: null });

    const result = await getActiveDietPlan();

    expect(result.error).toBeNull();
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("diet_plans");
    expect(chain.select).toHaveBeenCalledTimes(1);
    expect(chain.select).toHaveBeenCalledWith(DIET_SELECT);
    expect(chain.eq).toHaveBeenCalledTimes(1);
    expect(chain.eq).toHaveBeenCalledWith("status", "active");
    expect(chain.limit).toHaveBeenCalledTimes(1);
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it("DIET_SELECT embebe las cuatro hijas", () => {
    expect(DIET_SELECT).toBe(
      "*, diet_meals(*), diet_checklist_items(*), diet_supplements(*), diet_sections(*)",
    );
  });

  it("devuelve las hijas ordenadas por position aunque lleguen desordenadas", async () => {
    stubChain({ data: [rawPlan], error: null });

    const result = await getActiveDietPlan();

    expect(result.data?.diet_meals.map((row) => row.id)).toEqual(["m-1", "m-2", "m-3"]);
    expect(result.data?.diet_supplements.map((row) => row.id)).toEqual(["s-1", "s-2"]);
    expect(result.data?.diet_sections.map((row) => row.id)).toEqual(["x-1", "x-2"]);
    expect(result.data?.diet_checklist_items.map((row) => row.id)).toEqual(["c-1", "c-2"]);
  });

  it("conserva las columnas del plan y carga diet_checklist_items (para 11) (R19)", async () => {
    stubChain({ data: [rawPlan], error: null });

    const result = await getActiveDietPlan();

    expect(result.data).toMatchObject({
      id: "diet-1",
      name: "Recomposición — Septiembre 2026",
      kcal_objetivo: 2000,
      proteina_g: 160,
      carbohidrato_g: 195,
      grasa_g: 65,
      ventana_inicio: "10:00:00",
      ventana_fin: "18:00:00",
    });
    expect(result.data?.diet_checklist_items).toHaveLength(2);
  });

  it("normaliza hijas null a [] para no romper la UI", async () => {
    const withNulls = {
      ...rawPlan,
      diet_meals: null,
      diet_checklist_items: null,
      diet_supplements: null,
      diet_sections: null,
    };
    stubChain({ data: [withNulls], error: null });

    const result = await getActiveDietPlan();

    expect(result.data?.diet_meals).toEqual([]);
    expect(result.data?.diet_checklist_items).toEqual([]);
    expect(result.data?.diet_supplements).toEqual([]);
    expect(result.data?.diet_sections).toEqual([]);
  });

  it("sin filas devuelve { data: null, error: null } (sin plan activo, R17)", async () => {
    stubChain({ data: [], error: null });

    expect(await getActiveDietPlan()).toEqual({ data: null, error: null });
  });

  it("data null (sin error) también se lee como sin plan", async () => {
    stubChain({ data: null, error: null });

    expect(await getActiveDietPlan()).toEqual({ data: null, error: null });
  });
});

describe("getActiveDietPlan — fallos (R5)", () => {
  it("mapea un error de PostgREST al mensaje en español, nunca el crudo", async () => {
    stubChain({ data: null, error: { message: "relation diet_plans does not exist" } });

    const result = await getActiveDietPlan();

    expect(result).toEqual({ data: null, error: DIET_ERROR_LOAD });
    expect(result.error).not.toContain("relation");
  });

  it("una excepción de red también devuelve DIET_ERROR_LOAD", async () => {
    stubChain(new Error("Failed to fetch"));

    const result = await getActiveDietPlan();

    expect(result).toEqual({ data: null, error: DIET_ERROR_LOAD });
  });

  it("con el cliente sin configurar devuelve el error sin llamar a from()", async () => {
    mocks.holder.client = null;

    const result = await getActiveDietPlan();

    expect(result).toEqual({ data: null, error: DIET_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("el mensaje de error es el texto en español de la pantalla (R18)", () => {
    expect(DIET_ERROR_LOAD).toBe("No se pudo cargar la dieta");
  });
});

describe("services/diet.ts — solo lectura (R4)", () => {
  it("el módulo no contiene ninguna operación de escritura ni rpc", () => {
    // Vitest corre con la raíz del repo como cwd (vite.config.ts).
    const source = readFileSync(join(process.cwd(), "src", "services", "diet.ts"), "utf8");

    expect(source).not.toMatch(/\.(insert|update|delete|upsert|rpc)\(/);
    expect(source).toMatch(/\.from\("diet_plans"\)/);
  });
});
