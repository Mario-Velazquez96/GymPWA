import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

/**
 * Ruta `/dieta` CON sesión (R1). Va en su propio archivo porque necesita
 * mockear `useSession` — `App.test.tsx` ejercita los caminos sin sesión con el
 * cliente real. El service se mockea en su frontera: la ruta se valida, no la
 * consulta.
 */
const fakeSession = { access_token: "jwt", user: { id: "user-1" } } as Session;

vi.mock("@/hooks/useSession", () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSession: () => ({ session: fakeSession, loading: false }),
}));

vi.mock("@/lib/supabase", () => ({
  isConfigured: true,
  supabase: {},
}));

vi.mock("@/services/auth", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/diet", () => ({
  getActiveDietPlan: vi.fn().mockResolvedValue({ data: null, error: null }),
  DIET_ERROR_LOAD: "No se pudo cargar la dieta",
}));

vi.mock("@/services/plans", () => ({
  getActivePlan: vi.fn().mockResolvedValue({ data: null, error: null }),
  getPlanDay: vi.fn().mockResolvedValue({ data: null, error: null }),
  getDayExercises: vi.fn().mockResolvedValue({ data: [], error: null }),
  PLANS_ERROR_LOAD: "No se pudo cargar la rutina",
}));

import App from "@/App";

/**
 * Precarga del chunk lazy de `/dieta` ANTES de renderizar nada.
 *
 * Causa raíz del flake que detectó el reviewer: `App` monta `DietScreen` con
 * `React.lazy`, así que la PRIMERA vez que se renderiza la ruta, Vite tiene
 * que transformar ahí mismo el árbol de `react-markdown` + `remark-gfm`
 * (~164 kB, decenas de módulos ESM). Con la suite completa en paralelo esa
 * transformación llegó a tardar segundos, más que el timeout por defecto
 * (1000 ms) de `findBy*`, y la aserción fallaba con el fallback de `<Suspense>`
 * todavía montado. Al pagar el import aquí —en un hook con su propio
 * presupuesto— el `lazy` resuelve desde la caché de módulos y las aserciones
 * dejan de depender del tiempo de transformación de Vite.
 */
beforeAll(async () => {
  await import("@/screens/DietScreen");
}, 30_000);

function renderApp(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App — /dieta con sesión (R1, R2)", () => {
  it("renderiza DietScreen (chunk lazy) dentro del guard", async () => {
    renderApp("/dieta");

    expect(await screen.findByRole("heading", { level: 1, name: "Dieta" })).toBeInTheDocument();
    expect(await screen.findByText("Aún no tienes un plan de dieta asignado")).toBeInTheDocument();
  });

  it("muestra la navegación principal con Dieta como pestaña activa (R2)", async () => {
    renderApp("/dieta");

    await screen.findByRole("heading", { level: 1, name: "Dieta" });

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dieta" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Hoy" })).not.toHaveAttribute("aria-current");
  });

  it("en Hoy la navegación marca la pestaña Hoy (R2)", async () => {
    renderApp("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Hoy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hoy" })).toHaveAttribute("aria-current", "page");
  });
});
