import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const FAKE_URL = "https://ejemplo.supabase.co";
const FAKE_ANON_KEY = "clave-anon-de-prueba";

/**
 * `supabase.ts` evalúa las variables de entorno al importarse, así que cada
 * caso resetea los módulos y stubbea el env antes de importar <App />.
 */
async function renderApp(route: string, env: { url: string; anonKey: string }) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", env.url);
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", env.anonKey);
  const { default: App } = await import("@/App");
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

const configured = { url: FAKE_URL, anonKey: FAKE_ANON_KEY };
const missingEnv = { url: "", anonKey: "" };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("App — rutas con títulos en español (R3)", () => {
  it("renderiza 'Iniciar sesión' en /login", async () => {
    await renderApp("/login", configured);
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("renderiza 'Hoy' en /", async () => {
    await renderApp("/", configured);
    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument();
  });

  it("renderiza 'Ejercicio' en /ejercicio/:planExerciseId", async () => {
    await renderApp("/ejercicio/abc-123", configured);
    expect(screen.getByRole("heading", { name: "Ejercicio" })).toBeInTheDocument();
  });

  it("renderiza 'Historial' en /historial/:exerciseId", async () => {
    await renderApp("/historial/0001", configured);
    expect(screen.getByRole("heading", { name: "Historial" })).toBeInTheDocument();
  });
});

describe("App — env faltante (R5)", () => {
  it("muestra el error de configuración en / cuando faltan las variables", async () => {
    await renderApp("/", missingEnv);
    expect(screen.getByRole("heading", { name: "Error de configuración" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hoy" })).not.toBeInTheDocument();
  });

  it("muestra el error de configuración en /historial/:exerciseId sin variables", async () => {
    await renderApp("/historial/0001", missingEnv);
    expect(screen.getByRole("heading", { name: "Error de configuración" })).toBeInTheDocument();
  });

  it("/login sigue renderizándose sin variables (no depende de Supabase)", async () => {
    await renderApp("/login", missingEnv);
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });
});
