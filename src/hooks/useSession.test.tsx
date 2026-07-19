import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

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
