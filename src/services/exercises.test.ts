import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise, PlanExerciseDetail } from "@/lib/types";

/**
 * Cliente supabase mockeado en la frontera de services/ (R10): cada caso arma
 * la cadena select().eq().maybeSingle() que la función espera y controla el
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

import { EXERCISES_ERROR_LOAD, getExercise, getPlanExerciseDetail } from "@/services/exercises";

interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

/** Cadena select().eq().maybeSingle() → resultado (forma de getPlanExerciseDetail). */
function stubDetailChain(result: QueryResult | Error): {
  select: Mock;
  eq: Mock;
  maybeSingle: Mock;
} {
  const maybeSingle =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
  return { select, eq, maybeSingle };
}

const detailRow: PlanExerciseDetail = {
  id: "pe-1",
  plan_day_id: "day-1",
  exercise_id: "0001",
  position: 1,
  target_sets: 4,
  target_reps: "8-12",
  rest_seconds: 90,
  notes: "Última serie al fallo",
  exercises: {
    id: "0001",
    name: "Press de banca",
    body_part: "chest",
    equipment: "barbell",
    target: "pectorals",
    muscle_group: "chest",
    secondary_muscles: ["triceps"],
    instructions_es: "Acuéstate en el banco y empuja la barra.",
    instruction_steps_es: ["Acuéstate en el banco", "Baja la barra al pecho", "Empuja hasta arriba"],
    image_url: "https://storage.example/0001.png",
    gif_url: "https://storage.example/0001.gif",
    attribution: "Gym visual",
  },
};

const exerciseRow: Exercise = {
  id: "0001",
  name: "Press de banca",
  body_part: "chest",
  equipment: "barbell",
  target: "pectorals",
  muscle_group: "chest",
  secondary_muscles: ["triceps"],
  instructions_es: "Acuéstate en el banco y empuja la barra.",
  instruction_steps_es: ["Acuéstate en el banco", "Baja la barra al pecho", "Empuja hasta arriba"],
  image_url: "https://storage.example/0001.png",
  gif_url: "https://storage.example/0001.gif",
  attribution: "Gym visual",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.holder.client = { from: mocks.from };
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

describe("getPlanExerciseDetail (R1, R7, R10)", () => {
  it("R1: consulta plan_exercises con join completo a exercises y devuelve la fila", async () => {
    const chain = stubDetailChain({ data: detailRow, error: null });

    const result = await getPlanExerciseDetail("pe-1");

    expect(result).toEqual({ data: detailRow, error: null });
    expect(mocks.from).toHaveBeenCalledWith("plan_exercises");
    expect(chain.select).toHaveBeenCalledWith("*, exercises(*)");
    expect(chain.eq).toHaveBeenCalledWith("id", "pe-1");
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("R7: id inexistente o filtrado por RLS devuelve { data: null, error: null }", async () => {
    stubDetailChain({ data: null, error: null });

    const result = await getPlanExerciseDetail("00000000-0000-0000-0000-000000000000");

    expect(result).toEqual({ data: null, error: null });
  });

  it("R7: id chatarra (no uuid, error 22P02) cae en 'no encontrado', no en error", async () => {
    stubDetailChain({
      data: null,
      error: { message: "invalid input syntax for type uuid", code: "22P02" },
    });

    const result = await getPlanExerciseDetail("id-chatarra");

    expect(result).toEqual({ data: null, error: null });
  });

  it("R9: mapea un error de supabase al mensaje en español (nunca el crudo)", async () => {
    stubDetailChain({ data: null, error: { message: "raw postgrest error", code: "XX000" } });

    const result = await getPlanExerciseDetail("pe-1");

    expect(result.data).toBeNull();
    expect(result.error).toBe(EXERCISES_ERROR_LOAD);
    expect(result.error).not.toContain("raw postgrest error");
  });

  it("R9: mapea una excepción de red al mensaje en español", async () => {
    stubDetailChain(new TypeError("Failed to fetch"));

    const result = await getPlanExerciseDetail("pe-1");

    expect(result).toEqual({ data: null, error: EXERCISES_ERROR_LOAD });
  });

  it("con cliente no configurado (null) devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getPlanExerciseDetail("pe-1");

    expect(result).toEqual({ data: null, error: EXERCISES_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("getExercise (06_history R3, R8)", () => {
  it("R3: consulta exercises por id con maybeSingle y devuelve la fila completa", async () => {
    const chain = stubDetailChain({ data: exerciseRow, error: null });

    const result = await getExercise("0001");

    expect(result).toEqual({ data: exerciseRow, error: null });
    expect(mocks.from).toHaveBeenCalledWith("exercises");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("id", "0001");
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("R8: id inexistente devuelve { data: null, error: null } (no encontrado)", async () => {
    stubDetailChain({ data: null, error: null });

    const result = await getExercise("9999");

    expect(result).toEqual({ data: null, error: null });
  });

  it("mapea un error de supabase al mensaje en español (nunca el crudo)", async () => {
    stubDetailChain({ data: null, error: { message: "raw postgrest error" } });

    const result = await getExercise("0001");

    expect(result.data).toBeNull();
    expect(result.error).toBe(EXERCISES_ERROR_LOAD);
    expect(result.error).not.toContain("raw");
  });

  it("mapea una excepción de red al mensaje en español", async () => {
    stubDetailChain(new TypeError("Failed to fetch"));

    const result = await getExercise("0001");

    expect(result).toEqual({ data: null, error: EXERCISES_ERROR_LOAD });
  });

  it("con cliente no configurado (null) devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getExercise("0001");

    expect(result).toEqual({ data: null, error: EXERCISES_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
