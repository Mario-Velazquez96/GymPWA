import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  DietChecklistItem,
  DietMeal,
  DietPlan,
  DietSection,
  DietSupplement,
} from "@/lib/types";

/**
 * Test de tipos (spec 09, R12): las cinco interfaces de dieta espejan el DDL de
 * `supabase/migrations/003_diet_schema.sql` columna por columna. `expectTypeOf`
 * se valida en `pnpm typecheck` (tsc incluye `src/**`); los `expect` de
 * runtime fijan el número de columnas de cada tabla como guardia del contrato.
 */

/** Literal válido de `diet_plans` tal como lo serializa PostgREST. */
const plan: DietPlan = {
  id: "5f3e1c2a-0000-4000-8000-000000000001",
  user_id: "5f3e1c2a-0000-4000-8000-0000000000aa",
  name: "Recomposición — Septiembre 2026",
  goal: "InBody 2026-08: 18 % grasa; actividad moderada",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  status: "active",
  kcal_objetivo: 2300,
  proteina_g: 180,
  carbohidrato_g: 230,
  grasa_g: 70,
  ventana_inicio: "10:00:00",
  ventana_fin: "20:00:00",
  created_at: "2026-09-01T12:00:00+00:00",
};

const meal: DietMeal = {
  id: "5f3e1c2a-0000-4000-8000-000000000002",
  diet_plan_id: plan.id,
  position: 1,
  title: "Desayuno fuerte",
  hora: "10:00:00",
  kcal: 650,
  proteina_g: 45,
  items: ["3 huevos", "80 g avena", "1 plátano"],
  notes: null,
};

const checklistItem: DietChecklistItem = {
  id: "5f3e1c2a-0000-4000-8000-000000000003",
  diet_plan_id: plan.id,
  kind: "super",
  position: 1,
  categoria: "Proteínas",
  item: "Pechuga de pollo",
  cantidad: "1.6 kg",
};

const supplement: DietSupplement = {
  id: "5f3e1c2a-0000-4000-8000-000000000004",
  diet_plan_id: plan.id,
  position: 1,
  nombre: "Creatina monohidratada",
  dosis: "5 g",
  momento: "Diario, con el café de las 7:00",
  nota: null,
  recomendado: true,
};

const section: DietSection = {
  id: "5f3e1c2a-0000-4000-8000-000000000005",
  diet_plan_id: plan.id,
  position: 1,
  kind: "reglas",
  title: "Reglas de la semana",
  body_md: "- Agua: 3 L\n- Sin alcohol entre semana",
};

describe("DietPlan (R12) — espeja diet_plans", () => {
  it("acepta un literal válido con las 14 columnas de §6", () => {
    expect(Object.keys(plan)).toHaveLength(14);
    expectTypeOf(plan).toEqualTypeOf<DietPlan>();
  });

  it("status es la unión 'active' | 'archived' (check de §6)", () => {
    expectTypeOf<DietPlan["status"]>().toEqualTypeOf<"active" | "archived">();
    // @ts-expect-error — 'draft' no está en el check de status
    const invalid: DietPlan["status"] = "draft";
    expect(invalid).toBe("draft");
  });

  it("la ventana de ayuno es `time` nullable → string | null (sin ventana = null)", () => {
    expectTypeOf<DietPlan["ventana_inicio"]>().toEqualTypeOf<string | null>();
    expectTypeOf<DietPlan["ventana_fin"]>().toEqualTypeOf<string | null>();
    const sinVentana: DietPlan = { ...plan, ventana_inicio: null, ventana_fin: null };
    expect(sinVentana.ventana_inicio).toBeNull();
  });

  it("los macros son int not null → number; goal es nullable", () => {
    expectTypeOf<DietPlan["kcal_objetivo"]>().toEqualTypeOf<number>();
    expectTypeOf<DietPlan["proteina_g"]>().toEqualTypeOf<number>();
    expectTypeOf<DietPlan["carbohidrato_g"]>().toEqualTypeOf<number>();
    expectTypeOf<DietPlan["grasa_g"]>().toEqualTypeOf<number>();
    expectTypeOf<DietPlan["goal"]>().toEqualTypeOf<string | null>();
    expectTypeOf<DietPlan["start_date"]>().toEqualTypeOf<string>();
  });
});

describe("DietMeal (R12) — espeja diet_meals", () => {
  it("acepta un literal válido con las 9 columnas de §6", () => {
    expect(Object.keys(meal)).toHaveLength(9);
    expectTypeOf(meal).toEqualTypeOf<DietMeal>();
  });

  it("items es text[] not null → string[] (default '{}' = [])", () => {
    expectTypeOf<DietMeal["items"]>().toEqualTypeOf<string[]>();
    const vacia: DietMeal = { ...meal, items: [] };
    expect(vacia.items).toEqual([]);
  });

  it("hora, kcal, proteina_g y notes son nullables", () => {
    expectTypeOf<DietMeal["hora"]>().toEqualTypeOf<string | null>();
    expectTypeOf<DietMeal["kcal"]>().toEqualTypeOf<number | null>();
    expectTypeOf<DietMeal["proteina_g"]>().toEqualTypeOf<number | null>();
    expectTypeOf<DietMeal["notes"]>().toEqualTypeOf<string | null>();
  });
});

describe("DietChecklistItem (R12) — espeja diet_checklist_items", () => {
  it("acepta un literal válido con las 7 columnas de §6", () => {
    expect(Object.keys(checklistItem)).toHaveLength(7);
    expectTypeOf(checklistItem).toEqualTypeOf<DietChecklistItem>();
  });

  it("kind es la unión 'meal_prep' | 'super'", () => {
    expectTypeOf<DietChecklistItem["kind"]>().toEqualTypeOf<"meal_prep" | "super">();
    // @ts-expect-error — 'otro' no está en el check de kind
    const invalid: DietChecklistItem["kind"] = "otro";
    expect(invalid).toBe("otro");
  });

  it("cantidad es texto libre nullable (no número: '4 latas', 'al gusto')", () => {
    expectTypeOf<DietChecklistItem["cantidad"]>().toEqualTypeOf<string | null>();
    expectTypeOf<DietChecklistItem["categoria"]>().toEqualTypeOf<string | null>();
    const alGusto: DietChecklistItem = {
      ...checklistItem,
      kind: "meal_prep",
      cantidad: "al gusto",
    };
    expect(alGusto.cantidad).toBe("al gusto");
  });
});

describe("DietSupplement (R12) — espeja diet_supplements", () => {
  it("acepta un literal válido con las 8 columnas de §6", () => {
    expect(Object.keys(supplement)).toHaveLength(8);
    expectTypeOf(supplement).toEqualTypeOf<DietSupplement>();
  });

  it("recomendado es boolean not null; dosis/momento/nota nullables", () => {
    expectTypeOf<DietSupplement["recomendado"]>().toEqualTypeOf<boolean>();
    expectTypeOf<DietSupplement["dosis"]>().toEqualTypeOf<string | null>();
    expectTypeOf<DietSupplement["momento"]>().toEqualTypeOf<string | null>();
    expectTypeOf<DietSupplement["nota"]>().toEqualTypeOf<string | null>();
    const noValeLaPena: DietSupplement = { ...supplement, recomendado: false };
    expect(noValeLaPena.recomendado).toBe(false);
  });
});

describe("DietSection (R12) — espeja diet_sections", () => {
  it("acepta un literal válido con las 6 columnas de §6", () => {
    expect(Object.keys(section)).toHaveLength(6);
    expectTypeOf(section).toEqualTypeOf<DietSection>();
  });

  it("kind es la unión 'reglas' | 'rotacion' | 'libre' y body_md es string not null", () => {
    expectTypeOf<DietSection["kind"]>().toEqualTypeOf<"reglas" | "rotacion" | "libre">();
    expectTypeOf<DietSection["body_md"]>().toEqualTypeOf<string>();
    // @ts-expect-error — 'tips' no está en el check de kind
    const invalid: DietSection["kind"] = "tips";
    expect(invalid).toBe("tips");
  });
});
