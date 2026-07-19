import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, PlanDay, PlanExerciseWithExercise } from "@/lib/types";

/**
 * El cliente supabase se mockea en la frontera de services/ (R9): cada caso
 * arma la cadena de query builder que la función espera y controla el
 * `{ data, error }` final, incluido el caso borde `supabase === null`.
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

import { PLANS_ERROR_LOAD, getActivePlan, getDayExercises, getPlanDay } from "@/services/plans";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/** Cadena select().eq().limit() → resultado (forma de getActivePlan). */
function stubPlansChain(result: QueryResult | Error): {
  select: Mock;
  eq: Mock;
  limit: Mock;
} {
  const limit =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
  return { select, eq, limit };
}

/** Cadena select().eq().eq().maybeSingle() → resultado (forma de getPlanDay). */
function stubPlanDaysChain(result: QueryResult | Error): {
  select: Mock;
  eqPlan: Mock;
  eqDate: Mock;
  maybeSingle: Mock;
} {
  const maybeSingle =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result);
  const eqDate = vi.fn().mockReturnValue({ maybeSingle });
  const eqPlan = vi.fn().mockReturnValue({ eq: eqDate });
  const select = vi.fn().mockReturnValue({ eq: eqPlan });
  mocks.from.mockReturnValue({ select });
  return { select, eqPlan, eqDate, maybeSingle };
}

/** Cadena select().eq().order() → resultado (forma de getDayExercises). */
function stubPlanExercisesChain(result: QueryResult | Error): {
  select: Mock;
  eq: Mock;
  order: Mock;
} {
  const order =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
  return { select, eq, order };
}

const plan: Plan = {
  id: "plan-1",
  user_id: "user-1",
  name: "Hipertrofia — Agosto 2026",
  goal: null,
  start_date: "2026-08-03",
  end_date: "2026-08-30",
  status: "active",
  created_at: "2026-08-01T00:00:00Z",
};

const day: PlanDay = {
  id: "day-1",
  plan_id: "plan-1",
  day_date: "2026-08-05",
  title: "Pecho y tríceps",
  is_rest: false,
};

const exerciseRow: PlanExerciseWithExercise = {
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
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.holder.client = { from: mocks.from };
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

describe("getActivePlan (R5, R9)", () => {
  it("consulta plans con status=active y devuelve la fila tipada", async () => {
    const chain = stubPlansChain({ data: [plan], error: null });

    const result = await getActivePlan();

    expect(result).toEqual({ data: plan, error: null });
    expect(mocks.from).toHaveBeenCalledWith("plans");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("status", "active");
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it("sin filas devuelve { data: null, error: null } (sin plan activo, R5)", async () => {
    stubPlansChain({ data: [], error: null });

    const result = await getActivePlan();

    expect(result).toEqual({ data: null, error: null });
  });

  it("mapea un error de supabase al mensaje en español (nunca el crudo)", async () => {
    stubPlansChain({ data: null, error: { message: "raw postgrest error" } });

    const result = await getActivePlan();

    expect(result.data).toBeNull();
    expect(result.error).toBe(PLANS_ERROR_LOAD);
    expect(result.error).not.toContain("raw postgrest error");
  });

  it("mapea una excepción de red al mensaje en español", async () => {
    stubPlansChain(new TypeError("Failed to fetch"));

    const result = await getActivePlan();

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
  });

  it("con cliente no configurado (null) devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getActivePlan();

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("getPlanDay (R1, R4, R9)", () => {
  it("consulta plan_days por plan_id + day_date con maybeSingle y devuelve la fila", async () => {
    const chain = stubPlanDaysChain({ data: day, error: null });

    const result = await getPlanDay("plan-1", "2026-08-05");

    expect(result).toEqual({ data: day, error: null });
    expect(mocks.from).toHaveBeenCalledWith("plan_days");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eqPlan).toHaveBeenCalledWith("plan_id", "plan-1");
    expect(chain.eqDate).toHaveBeenCalledWith("day_date", "2026-08-05");
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("sin fila para la fecha devuelve { data: null, error: null } (R4)", async () => {
    stubPlanDaysChain({ data: null, error: null });

    const result = await getPlanDay("plan-1", "2026-08-06");

    expect(result).toEqual({ data: null, error: null });
  });

  it("mapea un error de supabase al mensaje en español", async () => {
    stubPlanDaysChain({ data: null, error: { message: "boom" } });

    const result = await getPlanDay("plan-1", "2026-08-05");

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
  });

  it("mapea una excepción de red al mensaje en español", async () => {
    stubPlanDaysChain(new TypeError("Failed to fetch"));

    const result = await getPlanDay("plan-1", "2026-08-05");

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
  });

  it("con cliente no configurado devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getPlanDay("plan-1", "2026-08-05");

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("getDayExercises (R1, R9)", () => {
  it("consulta plan_exercises con join a exercises y ordena por position", async () => {
    const chain = stubPlanExercisesChain({ data: [exerciseRow], error: null });

    const result = await getDayExercises("day-1");

    expect(result).toEqual({ data: [exerciseRow], error: null });
    expect(mocks.from).toHaveBeenCalledWith("plan_exercises");
    expect(chain.select).toHaveBeenCalledWith("*, exercises(id,name,image_url,equipment,target)");
    expect(chain.eq).toHaveBeenCalledWith("plan_day_id", "day-1");
    expect(chain.order).toHaveBeenCalledWith("position", { ascending: true });
  });

  it("día sin ejercicios devuelve lista vacía sin error", async () => {
    stubPlanExercisesChain({ data: [], error: null });

    const result = await getDayExercises("day-1");

    expect(result).toEqual({ data: [], error: null });
  });

  it("normaliza data null (respuesta defensiva) a lista vacía", async () => {
    stubPlanExercisesChain({ data: null, error: null });

    const result = await getDayExercises("day-1");

    expect(result).toEqual({ data: [], error: null });
  });

  it("mapea un error de supabase al mensaje en español", async () => {
    stubPlanExercisesChain({ data: null, error: { message: "boom" } });

    const result = await getDayExercises("day-1");

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
  });

  it("mapea una excepción de red al mensaje en español", async () => {
    stubPlanExercisesChain(new TypeError("Failed to fetch"));

    const result = await getDayExercises("day-1");

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
  });

  it("con cliente no configurado devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getDayExercises("day-1");

    expect(result).toEqual({ data: null, error: PLANS_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
