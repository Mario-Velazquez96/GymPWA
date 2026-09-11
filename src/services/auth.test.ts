import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** El snapshot de la dieta se mockea para afirmar el borrado al cerrar sesión (12 R21). */
vi.mock("@/lib/dietCache", () => ({ writeDietSnapshot: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return mocks.holder.client as SupabaseClient | null;
  },
  get isConfigured() {
    return mocks.holder.client !== null;
  },
}));

import { writeDietSnapshot } from "@/lib/dietCache";
import {
  AUTH_ERROR_CONNECTION,
  AUTH_ERROR_INVALID_CREDENTIALS,
  signIn,
  signOut,
} from "@/services/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.holder.client = {
    auth: { signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut },
  };
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

  it("con cliente no configurado (null) no llama a la red", async () => {
    mocks.holder.client = null;

    await signOut();

    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});

describe("signOut — cierre local aunque no haya red (12 R21, menor 1 del review)", () => {
  const SESSION_KEY = "sb-abcdefghijklmnop-auth-token";

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ access_token: "jwt", expires_at: 1 }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("con red: cierra a la primera, sin purgar nada a mano", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    // La limpieza la hace supabase-js (aquí mockeado): el service no toca la clave.
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it("sin red y con token caducado: purga la sesión del dispositivo y repite el cierre", async () => {
    // Lo que devuelve GoTrueClient._signOut cuando el refresh falla por red:
    // sale antes de borrar la sesión, así que el botón no cerraría nada.
    mocks.signOut.mockResolvedValueOnce({ error: { message: "Failed to fetch", status: 0 } });
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });

  it("si la llamada lanza (red caída), también cierra en local", async () => {
    mocks.signOut.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });

  it("no toca otras claves del dispositivo al purgar", async () => {
    localStorage.setItem("gym:unit:0001", "lb");
    localStorage.setItem("gym:diet:check:diet-1:super", "[]");
    mocks.signOut.mockResolvedValueOnce({ error: { message: "Failed to fetch", status: 0 } });
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem("gym:unit:0001")).toBe("lb");
    expect(localStorage.getItem("gym:diet:check:diet-1:super")).toBe("[]");
  });

  it("si el segundo intento también falla, no propaga (el usuario ya está sin sesión local)", async () => {
    mocks.signOut.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(signOut()).resolves.toBeUndefined();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("sin localStorage en el entorno la purga es inocua", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "Failed to fetch", status: 0 } });
    vi.stubGlobal("localStorage", undefined);

    await expect(signOut()).resolves.toBeUndefined();

    vi.unstubAllGlobals();
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });

  it("con localStorage hostil la purga no propaga", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "boom", status: 500 } });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    await expect(signOut()).resolves.toBeUndefined();
  });
});

describe("signOut — limpieza del snapshot de dieta (12 R21)", () => {
  it("borra el snapshot local del plan tras cerrar sesión", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(vi.mocked(writeDietSnapshot)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(writeDietSnapshot)).toHaveBeenCalledWith(null);
  });

  it("también lo borra si la petición de cierre falla por red (la sesión local ya se fue)", async () => {
    mocks.signOut.mockRejectedValue(new TypeError("Failed to fetch"));

    await signOut();

    expect(vi.mocked(writeDietSnapshot)).toHaveBeenCalledWith(null);
  });

  it("también lo borra con el cliente sin configurar", async () => {
    mocks.holder.client = null;

    await signOut();

    expect(vi.mocked(writeDietSnapshot)).toHaveBeenCalledWith(null);
  });

  it("iniciar sesión no toca el snapshot", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });

    await signIn("mario@ejemplo.com", "secreta");

    expect(vi.mocked(writeDietSnapshot)).not.toHaveBeenCalled();
  });
});
