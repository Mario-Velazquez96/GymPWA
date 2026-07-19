import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const FAKE_URL = "https://ejemplo.supabase.co";
const FAKE_ANON_KEY = "clave-anon-de-prueba";

/**
 * Integración de rutas + guards con el cliente supabase real creado desde env
 * stubbeado: `getSession()` resuelve `null` desde localStorage (sin red), así
 * que sin sesión toda ruta protegida termina en /login (R1).
 * `supabase.ts` evalúa las variables al importarse → reset de módulos por caso.
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
  window.localStorage.clear();
});

describe("App — guards de sesión (R1)", () => {
  it("sin sesión, / redirige a /login", async () => {
    await renderApp("/", configured);
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hoy" })).not.toBeInTheDocument();
  });

  it("sin sesión, el deep-link /historial/0001 rebota a /login", async () => {
    await renderApp("/historial/0001", configured);
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Historial" })).not.toBeInTheDocument();
  });

  it("sin sesión, /ejercicio/abc-123 rebota a /login", async () => {
    await renderApp("/ejercicio/abc-123", configured);
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("/login muestra el formulario con inputs etiquetados (R7)", async () => {
    await renderApp("/login", configured);
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });
});

describe("App — env faltante (contrato de 00)", () => {
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
