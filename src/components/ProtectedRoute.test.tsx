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

vi.mock("@/services/auth", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

import ProtectedRoute from "@/components/ProtectedRoute";

const fakeSession = { access_token: "jwt", user: { id: "user-1" } } as Session;

function renderGuard() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/login" element={<p>pantalla de login</p>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <p>contenido protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.state.session = null;
  mocks.state.loading = false;
  mocks.state.configured = true;
});

describe("ProtectedRoute (R1, R6)", () => {
  it("mientras carga muestra el indicador y no redirige ni renderiza hijos (R6)", () => {
    mocks.state.loading = true;

    renderGuard();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
    expect(screen.queryByText("pantalla de login")).not.toBeInTheDocument();
  });

  it("sin sesión redirige a /login (R1)", () => {
    renderGuard();

    expect(screen.getByText("pantalla de login")).toBeInTheDocument();
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
  });

  it("con sesión renderiza los hijos y el header con 'Cerrar sesión' (R5)", () => {
    mocks.state.session = fakeSession;

    renderGuard();

    expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("sin variables de entorno muestra el error de configuración (contrato de 00)", () => {
    mocks.state.configured = false;

    renderGuard();

    expect(screen.getByRole("heading", { name: "Error de configuración" })).toBeInTheDocument();
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
  });
});
