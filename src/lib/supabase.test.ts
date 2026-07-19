import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * El módulo evalúa el env al importarse: cada caso resetea módulos y stubbea
 * las variables antes del import dinámico.
 */
async function importSupabase(env: { url: string; anonKey: string }) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", env.url);
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", env.anonKey);
  return import("@/lib/supabase");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("lib/supabase (R4, R5)", () => {
  it("crea el cliente y marca isConfigured=true con ambas variables", async () => {
    const mod = await importSupabase({
      url: "https://ejemplo.supabase.co",
      anonKey: "clave-anon-de-prueba",
    });
    expect(mod.supabase).not.toBeNull();
    expect(mod.isConfigured).toBe(true);
    expect(mod.supabase?.auth).toBeDefined();
  });

  it("exporta null y isConfigured=false si falta la URL", async () => {
    const mod = await importSupabase({ url: "", anonKey: "clave-anon-de-prueba" });
    expect(mod.supabase).toBeNull();
    expect(mod.isConfigured).toBe(false);
  });

  it("exporta null y isConfigured=false si falta la anon key", async () => {
    const mod = await importSupabase({ url: "https://ejemplo.supabase.co", anonKey: "" });
    expect(mod.supabase).toBeNull();
    expect(mod.isConfigured).toBe(false);
  });

  it("exporta null y isConfigured=false si faltan las dos variables", async () => {
    const mod = await importSupabase({ url: "", anonKey: "" });
    expect(mod.supabase).toBeNull();
    expect(mod.isConfigured).toBe(false);
  });
});
