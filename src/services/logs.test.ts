import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutLog } from "@/lib/types";

/**
 * Cliente supabase mockeado en la frontera de services/ (R9): cada caso arma
 * la cadena del query builder que la función espera y controla el
 * `{ data, error }` final, incluidos sesión ausente y cliente `null`.
 */
const mocks = vi.hoisted(() => {
  const from = vi.fn();
  const getSession = vi.fn();
  const holder: { client: unknown } = { client: { from, auth: { getSession } } };
  return { from, getSession, holder };
});

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return mocks.holder.client as SupabaseClient | null;
  },
  get isConfigured() {
    return mocks.holder.client !== null;
  },
}));

import {
  LOGS_ERROR_HISTORY,
  LOGS_ERROR_LOAD,
  LOGS_ERROR_SAVE,
  getExerciseHistory,
  getPreviousSession,
  getSessionSets,
  logSet,
  type NewLog,
} from "@/services/logs";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/** Cadena select().eq().lt().order().order().limit() (forma de getPreviousSession). */
function stubPreviousChain(result: QueryResult | Error): {
  select: Mock;
  eq: Mock;
  lt: Mock;
  orderDate: Mock;
  orderSet: Mock;
  limit: Mock;
} {
  const limit =
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
  const orderSet = vi.fn().mockReturnValue({ limit });
  const orderDate = vi.fn().mockReturnValue({ order: orderSet });
  const lt = vi.fn().mockReturnValue({ order: orderDate });
  const eq = vi.fn().mockReturnValue({ lt });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
  return { select, eq, lt, orderDate, orderSet, limit };
}

/** Cadena select().eq().eq().order() (forma de getSessionSets). */
function stubSessionChain(result: QueryResult | Error): {
  select: Mock;
  eqExercise: Mock;
  eqDate: Mock;
  order: Mock;
} {
  const order =
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
  const eqDate = vi.fn().mockReturnValue({ order });
  const eqExercise = vi.fn().mockReturnValue({ eq: eqDate });
  const select = vi.fn().mockReturnValue({ eq: eqExercise });
  mocks.from.mockReturnValue({ select });
  return { select, eqExercise, eqDate, order };
}

/** Cadena select().eq().order().order() (forma de getExerciseHistory). */
function stubHistoryChain(result: QueryResult | Error): {
  select: Mock;
  eq: Mock;
  orderDate: Mock;
  orderSet: Mock;
} {
  const orderSet =
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
  const orderDate = vi.fn().mockReturnValue({ order: orderSet });
  const eq = vi.fn().mockReturnValue({ order: orderDate });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
  return { select, eq, orderDate, orderSet };
}

/** Cadena insert().select().single() (forma de logSet). */
function stubInsertChain(result: QueryResult | Error): {
  insert: Mock;
  select: Mock;
  single: Mock;
} {
  const single =
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  mocks.from.mockReturnValue({ insert });
  return { insert, select, single };
}

function makeLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "log-1",
    user_id: "user-1",
    exercise_id: "0001",
    plan_exercise_id: "pe-1",
    performed_at: "2026-07-17",
    set_number: 1,
    reps: 10,
    weight_kg: 22.5,
    created_at: "2026-07-17T18:00:00Z",
    ...overrides,
  };
}

const newLog: NewLog = {
  exercise_id: "0001",
  plan_exercise_id: "pe-1",
  performed_at: "2026-07-19",
  set_number: 1,
  reps: 10,
  weight_kg: 22.5,
};

function stubSession(userId: string | null, error: { message: string } | null = null): void {
  mocks.getSession.mockResolvedValue({
    data: { session: userId === null ? null : { user: { id: userId } } },
    error,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.holder.client = { from: mocks.from, auth: { getSession: mocks.getSession } };
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

describe("getPreviousSession (R2, R9)", () => {
  it("consulta workout_logs con lt(performed_at), doble order y limit 10", async () => {
    const rows = [makeLog({ set_number: 1 }), makeLog({ id: "log-2", set_number: 2 })];
    const chain = stubPreviousChain({ data: rows, error: null });

    const result = await getPreviousSession("0001", "2026-07-19");

    expect(result).toEqual({ data: rows, error: null });
    expect(mocks.from).toHaveBeenCalledWith("workout_logs");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("exercise_id", "0001");
    expect(chain.lt).toHaveBeenCalledWith("performed_at", "2026-07-19");
    expect(chain.orderDate).toHaveBeenCalledWith("performed_at", { ascending: false });
    expect(chain.orderSet).toHaveBeenCalledWith("set_number", { ascending: true });
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("con filas de varias fechas filtra en cliente a las de la fecha máxima (la última sesión)", async () => {
    const last1 = makeLog({ id: "a", performed_at: "2026-07-17", set_number: 1 });
    const last2 = makeLog({ id: "b", performed_at: "2026-07-17", set_number: 2 });
    const older = makeLog({ id: "c", performed_at: "2026-07-15", set_number: 1 });
    stubPreviousChain({ data: [last1, last2, older], error: null });

    const result = await getPreviousSession("0001", "2026-07-19");

    expect(result).toEqual({ data: [last1, last2], error: null });
  });

  it("sin historial devuelve lista vacía sin error", async () => {
    stubPreviousChain({ data: [], error: null });

    const result = await getPreviousSession("0001", "2026-07-19");

    expect(result).toEqual({ data: [], error: null });
  });

  it("normaliza data null (respuesta defensiva) a lista vacía", async () => {
    stubPreviousChain({ data: null, error: null });

    const result = await getPreviousSession("0001", "2026-07-19");

    expect(result).toEqual({ data: [], error: null });
  });

  it("mapea un error de supabase al mensaje en español (nunca el crudo)", async () => {
    stubPreviousChain({ data: null, error: { message: "raw postgrest error" } });

    const result = await getPreviousSession("0001", "2026-07-19");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_LOAD });
  });

  it("mapea una excepción de red al mensaje en español", async () => {
    stubPreviousChain(new TypeError("Failed to fetch"));

    const result = await getPreviousSession("0001", "2026-07-19");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_LOAD });
  });

  it("con cliente no configurado devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getPreviousSession("0001", "2026-07-19");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("getSessionSets (R8, R9)", () => {
  it("consulta workout_logs por exercise_id + performed_at ordenado por set_number", async () => {
    const rows = [makeLog({ performed_at: "2026-07-19" })];
    const chain = stubSessionChain({ data: rows, error: null });

    const result = await getSessionSets("0001", "2026-07-19");

    expect(result).toEqual({ data: rows, error: null });
    expect(mocks.from).toHaveBeenCalledWith("workout_logs");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eqExercise).toHaveBeenCalledWith("exercise_id", "0001");
    expect(chain.eqDate).toHaveBeenCalledWith("performed_at", "2026-07-19");
    expect(chain.order).toHaveBeenCalledWith("set_number", { ascending: true });
  });

  it("sin series guardadas hoy devuelve lista vacía sin error", async () => {
    stubSessionChain({ data: [], error: null });

    const result = await getSessionSets("0001", "2026-07-19");

    expect(result).toEqual({ data: [], error: null });
  });

  it("normaliza data null a lista vacía", async () => {
    stubSessionChain({ data: null, error: null });

    const result = await getSessionSets("0001", "2026-07-19");

    expect(result).toEqual({ data: [], error: null });
  });

  it("mapea un error de supabase al mensaje en español", async () => {
    stubSessionChain({ data: null, error: { message: "boom" } });

    const result = await getSessionSets("0001", "2026-07-19");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_LOAD });
  });

  it("mapea una excepción de red al mensaje en español", async () => {
    stubSessionChain(new TypeError("Failed to fetch"));

    const result = await getSessionSets("0001", "2026-07-19");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_LOAD });
  });

  it("con cliente no configurado devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getSessionSets("0001", "2026-07-19");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_LOAD });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("getExerciseHistory (06_history R1, R6)", () => {
  it("consulta workout_logs por exercise_id, order performed_at desc + set_number asc", async () => {
    const rows = [
      makeLog({ id: "a", performed_at: "2026-08-05", set_number: 1 }),
      makeLog({ id: "b", performed_at: "2026-08-05", set_number: 2 }),
      makeLog({ id: "c", performed_at: "2026-08-01", set_number: 1 }),
    ];
    const chain = stubHistoryChain({ data: rows, error: null });

    const result = await getExerciseHistory("0001");

    expect(result).toEqual({ data: rows, error: null });
    expect(mocks.from).toHaveBeenCalledWith("workout_logs");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("exercise_id", "0001");
    expect(chain.orderDate).toHaveBeenCalledWith("performed_at", { ascending: false });
    expect(chain.orderSet).toHaveBeenCalledWith("set_number", { ascending: true });
  });

  it("sin registros devuelve lista vacía sin error (estado vacío de la pantalla)", async () => {
    stubHistoryChain({ data: [], error: null });

    const result = await getExerciseHistory("0001");

    expect(result).toEqual({ data: [], error: null });
  });

  it("normaliza data null a lista vacía", async () => {
    stubHistoryChain({ data: null, error: null });

    const result = await getExerciseHistory("0001");

    expect(result).toEqual({ data: [], error: null });
  });

  it("mapea un error de supabase a 'No se pudo cargar el historial' (nunca el crudo)", async () => {
    stubHistoryChain({ data: null, error: { message: "raw postgrest error" } });

    const result = await getExerciseHistory("0001");

    expect(result.data).toBeNull();
    expect(result.error).toBe(LOGS_ERROR_HISTORY);
    expect(result.error).not.toContain("raw");
  });

  it("mapea una excepción de red al mensaje en español", async () => {
    stubHistoryChain(new TypeError("Failed to fetch"));

    const result = await getExerciseHistory("0001");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_HISTORY });
  });

  it("con cliente no configurado devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await getExerciseHistory("0001");

    expect(result).toEqual({ data: null, error: LOGS_ERROR_HISTORY });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("logSet (R5, R6, R9)", () => {
  it("inserta EXACTAMENTE una fila con user_id de la sesión viva y performed_at local", async () => {
    stubSession("user-1");
    const saved = makeLog({ performed_at: "2026-07-19" });
    const chain = stubInsertChain({ data: saved, error: null });

    const result = await logSet(newLog);

    expect(result).toEqual({ data: saved, error: null });
    expect(mocks.from).toHaveBeenCalledWith("workout_logs");
    expect(chain.insert).toHaveBeenCalledTimes(1);
    expect(chain.insert).toHaveBeenCalledWith({ ...newLog, user_id: "user-1" });
    expect(chain.select).toHaveBeenCalledTimes(1);
    expect(chain.single).toHaveBeenCalledTimes(1);
  });

  it("sin sesión activa devuelve el error de guardado sin tocar la tabla", async () => {
    stubSession(null);

    const result = await logSet(newLog);

    expect(result).toEqual({ data: null, error: LOGS_ERROR_SAVE });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("con error de auth.getSession devuelve el error de guardado sin insertar", async () => {
    stubSession("user-1", { message: "session expired" });

    const result = await logSet(newLog);

    expect(result).toEqual({ data: null, error: LOGS_ERROR_SAVE });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("mapea un fallo del insert a 'No se pudo guardar la serie, reintenta' (R6)", async () => {
    stubSession("user-1");
    stubInsertChain({ data: null, error: { message: "violates check constraint" } });

    const result = await logSet(newLog);

    expect(result.data).toBeNull();
    expect(result.error).toBe(LOGS_ERROR_SAVE);
    expect(result.error).not.toContain("violates");
  });

  it("mapea una excepción de red al mensaje de guardado en español (R6)", async () => {
    stubSession("user-1");
    stubInsertChain(new TypeError("Failed to fetch"));

    const result = await logSet(newLog);

    expect(result).toEqual({ data: null, error: LOGS_ERROR_SAVE });
  });

  it("con cliente no configurado devuelve el error sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await logSet(newLog);

    expect(result).toEqual({ data: null, error: LOGS_ERROR_SAVE });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});
