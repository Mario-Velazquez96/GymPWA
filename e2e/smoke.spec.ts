import { test, expect } from "@playwright/test";

/**
 * Smoke (R10): la build de producción sirve /login y muestra el título en
 * español. No requiere credenciales de Supabase — /login se renderiza sin
 * cliente configurado.
 */
test("carga /login y muestra 'Iniciar sesión'", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});
