import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * El cliente supabase se mockea en la frontera de services/: cada caso
 * controla qué devuelve `auth.signInWithPassword` / `auth.signOut`, incluido
 * el caso borde `supabase === null` (env sin configurar).
 */
const mocks = vi.hoisted(() => {
  const signInWithPassword = vi.fn();
  const signOut = vi.fn();
  const holder: { client: unknown } = {
    client: { auth: { signInWithPassword, signOut } },
  };
  return { signInWithPassword, signOut, holder };
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
  AUTH_ERROR_CONNECTION,
  AUTH_ERROR_INVALID_CREDENTIALS,
  signIn,
  signOut,
} from "@/services/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.holder.client = { auth: { signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut } };
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

describe("signIn (R2, R3)", () => {
  it("con credenciales válidas devuelve { error: null } y pasa email/contraseña", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });

    const result = await signIn("mario@ejemplo.com", "secreta");

    expect(result).toEqual({ error: null });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "mario@ejemplo.com",
      password: "secreta",
    });
  });

  it("mapea invalid_credentials a 'Correo o contraseña incorrectos'", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "invalid_credentials", message: "Invalid login credentials", status: 400 },
    });

    const result = await signIn("mario@ejemplo.com", "incorrecta");

    expect(result.error).toBe(AUTH_ERROR_INVALID_CREDENTIALS);
  });

  it("mapea cualquier otro error a 'Error de conexión, reintenta' (nunca el error crudo)", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "unexpected_failure", message: "raw supabase error", status: 500 },
    });

    const result = await signIn("mario@ejemplo.com", "secreta");

    expect(result.error).toBe(AUTH_ERROR_CONNECTION);
    expect(result.error).not.toContain("raw supabase error");
  });

  it("mapea una excepción de red (fetch rechazado) al error de conexión", async () => {
    mocks.signInWithPassword.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await signIn("mario@ejemplo.com", "secreta");

    expect(result.error).toBe(AUTH_ERROR_CONNECTION);
  });

  it("con cliente no configurado (null) devuelve el error de conexión sin llamar a la red", async () => {
    mocks.holder.client = null;

    const result = await signIn("mario@ejemplo.com", "secreta");

    expect(result.error).toBe(AUTH_ERROR_CONNECTION);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("signOut (R5)", () => {
  it("llama a supabase.auth.signOut", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("no lanza si supabase devuelve error", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "boom", status: 500 } });

    await expect(signOut()).resolves.toBeUndefined();
  });

  it("no lanza si signOut arroja excepción de red", async () => {
    mocks.signOut.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(signOut()).resolves.toBeUndefined();
  });

  it("con cliente no configurado (null) es un no-op", async () => {
    mocks.holder.client = null;

    await signOut();

    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
