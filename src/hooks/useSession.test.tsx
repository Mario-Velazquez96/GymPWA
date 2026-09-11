import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  AuthError,
  AuthRetryableFetchError,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

type AuthChangeCallback = (event: string, session: Session | null) => void;

/** Sesión mínima con la forma que consumen los guards. */
const fakeSession = { access_token: "jwt-de-prueba", user: { id: "user-1" } } as Session;

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();
  const unsubscribe = vi.fn();
  const state: { authCallback: unknown } = { authCallback: null };
  const onAuthStateChange = vi.fn((callback: unknown) => {
    state.authCallback = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  const holder: { client: unknown } = {
    client: { auth: { getSession, onAuthStateChange } },
  };
  return { getSession, onAuthStateChange, unsubscribe, state, holder };
});

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return mocks.holder.client as SupabaseClient | null;
  },
  get isConfigured() {
    return mocks.holder.client !== null;
  },
}));

import { SessionProvider, useSession } from "@/hooks/useSession";

function emitAuthChange(event: string, session: Session | null) {
  const callback = mocks.state.authCallback as AuthChangeCallback | null;
  if (callback === null) {
    throw new Error("onAuthStateChange no registró callback");
  }
  act(() => {
    callback(event, session);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.authCallback = null;
  mocks.holder.client = {
    auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange },
  };
});

describe("SessionProvider (R4, R6)", () => {
  it("arranca en loading y expone la sesión persistida que devuelve getSession (R4)", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: fakeSession }, error: null });

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    expect(result.current.loading).toBe(true);
    expect(result.current.session).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.session).toBe(fakeSession);
    expect(result.current.offlineSession).toBe(false);
  });

  it("sin sesión persistida termina la carga con session null", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.session).toBeNull();
  });

  it("actualiza la sesión cuando onAuthStateChange emite SIGNED_IN y SIGNED_OUT (R2, R5)", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    emitAuthChange("SIGNED_IN", fakeSession);
    expect(result.current.session).toBe(fakeSession);

    emitAuthChange("SIGNED_OUT", null);
    expect(result.current.session).toBeNull();
  });

  it("cancela la suscripción al desmontar", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { unmount, result } = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    unmount();

    expect(mocks.unsubscribe).toHaveBeenCalled();
  });

  it("con cliente null (env sin configurar) no carga: loading false y session null", () => {
    mocks.holder.client = null;

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    expect(result.current.loading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});

describe("useSession fuera del provider", () => {
  it("lanza un error claro", () => {
    function Orphan() {
      useSession();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow("useSession debe usarse dentro de <SessionProvider>");
  });
});

describe("SessionProvider — render de children", () => {
  it("renderiza a sus hijos", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(
      <SessionProvider>
        <p>contenido hijo</p>
      </SessionProvider>,
    );

    expect(screen.getByText("contenido hijo")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.getSession).toHaveBeenCalled();
    });
  });
});

describe("SessionProvider — sesión sin red (12 R18, R20)", () => {
  /** Lo que auth-js devuelve en modo avión con el access token ya caducado. */
  function retryableFailure() {
    return {
      data: { session: null },
      error: new AuthRetryableFetchError("Failed to fetch", 0),
    };
  }

  it("un refresco fallido por red no es logout: offlineSession true y sin spinner (R18)", async () => {
    mocks.getSession.mockResolvedValue(retryableFailure());

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.offlineSession).toBe(true);
    expect(result.current.session).toBeNull();
  });

  it("el INITIAL_SESSION nulo que emite auth-js sin red no pisa offlineSession (R18)", async () => {
    mocks.getSession.mockResolvedValue(retryableFailure());

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => {
      expect(result.current.offlineSession).toBe(true);
    });

    emitAuthChange("INITIAL_SESSION", null);

    expect(result.current.offlineSession).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("al volver la red, TOKEN_REFRESHED fija la sesión y limpia la bandera (R20)", async () => {
    mocks.getSession.mockResolvedValue(retryableFailure());

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => {
      expect(result.current.offlineSession).toBe(true);
    });

    emitAuthChange("TOKEN_REFRESHED", fakeSession);

    expect(result.current.session).toBe(fakeSession);
    expect(result.current.offlineSession).toBe(false);
  });

  it("un SIGNED_OUT real (refresh token inválido o logout) sí cierra la sesión (R20)", async () => {
    mocks.getSession.mockResolvedValue(retryableFailure());

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => {
      expect(result.current.offlineSession).toBe(true);
    });

    emitAuthChange("SIGNED_OUT", null);

    expect(result.current.session).toBeNull();
    expect(result.current.offlineSession).toBe(false);
  });

  it("un error NO retryable no activa el modo offline (sesión realmente ausente) (R18)", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthError("Invalid Refresh Token", 400),
    });

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.offlineSession).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it("un error retryable acompañado de sesión vigente NO activa el modo offline", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: fakeSession },
      error: new AuthRetryableFetchError("Failed to fetch", 0),
    });

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.session).toBe(fakeSession);
    expect(result.current.offlineSession).toBe(false);
  });

  it("si el provider se desmonta antes de que getSession resuelva, no actualiza estado", async () => {
    let resolveSession: (value: unknown) => void = () => undefined;
    mocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { unmount } = renderHook(() => useSession(), { wrapper: SessionProvider });
    unmount();

    await act(async () => {
      resolveSession({ data: { session: fakeSession }, error: null });
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("si getSession rechaza, no deja el spinner colgado (comportamiento de 02 intacto)", async () => {
    mocks.getSession.mockRejectedValue(new TypeError("boom"));

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.session).toBeNull();
    expect(result.current.offlineSession).toBe(false);
  });
});
