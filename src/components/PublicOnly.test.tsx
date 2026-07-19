import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  state: {
    session: null as Session | null,
    loading: false,
    configured: true,
  },
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ session: mocks.state.session, loading: mocks.state.loading }),
}));

vi.mock("@/lib/supabase", () => ({
  get isConfigured() {
    return mocks.state.configured;
  },
  get supabase() {
    return mocks.state.configured ? {} : null;
  },
}));

import PublicOnly from "@/components/PublicOnly";

const fakeSession = { access_token: "jwt", user: { id: "user-1" } } as Session;

function renderGuard() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <p>formulario de login</p>
            </PublicOnly>
          }
        />
        <Route path="/" element={<p>pantalla de hoy</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.state.session = null;
  mocks.state.loading = false;
  mocks.state.configured = true;
});

describe("PublicOnly (R8)", () => {
  it("con sesión redirige de /login a / (R8)", () => {
    mocks.state.session = fakeSession;

    renderGuard();

    expect(screen.getByText("pantalla de hoy")).toBeInTheDocument();
    expect(screen.queryByText("formulario de login")).not.toBeInTheDocument();
  });

  it("sin sesión renderiza el formulario", () => {
    renderGuard();

    expect(screen.getByText("formulario de login")).toBeInTheDocument();
  });

  it("mientras carga muestra el indicador sin parpadear el formulario (R6)", () => {
    mocks.state.loading = true;

    renderGuard();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
    expect(screen.queryByText("formulario de login")).not.toBeInTheDocument();
  });

  it("sin variables de entorno renderiza igual el formulario (login no depende de Supabase)", () => {
    mocks.state.configured = false;

    renderGuard();

    expect(screen.getByText("formulario de login")).toBeInTheDocument();
  });
});
