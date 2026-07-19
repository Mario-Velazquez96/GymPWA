import { test, expect } from "@playwright/test";

/**
 * Round trip de autenticación (R1, R2, R4, R5, R8) contra el proyecto Supabase
 * real. Requiere E2E_EMAIL / E2E_PASSWORD en .env.local (cargados por
 * playwright.config.ts) y la build hecha con las VITE_* reales.
 */
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";

test.describe("02_auth — round trip de sesión", () => {
  test.skip(
    email === "" || password === "",
    "E2E_EMAIL / E2E_PASSWORD no definidos en .env.local — se omite el round trip de auth",
  );

  test("redirección, login, recarga, /login autenticado y cierre de sesión", async ({ page }) => {
    await test.step("R1: sin sesión, / redirige a /login", async () => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    });

    await test.step("R2: credenciales válidas establecen sesión y navegan a /", async () => {
      await page.getByLabel("Correo").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
      await expect(page).toHaveURL("/");
    });

    await test.step("R4: recargar la página mantiene la sesión", async () => {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
      await expect(page).not.toHaveURL(/\/login$/);
    });

    await test.step("R8: visitar /login con sesión redirige a /", async () => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
      await expect(page).toHaveURL("/");
    });

    await test.step("R5: 'Cerrar sesión' vuelve a /login", async () => {
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    });

    await test.step("R1: tras cerrar sesión, un deep-link protegido rebota a /login", async () => {
      await page.goto("/historial/0001");
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test("R3: contraseña incorrecta muestra el error en español y permanece en /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill("contraseña-incorrecta");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toHaveText("Correo o contraseña incorrectos");
    await expect(page).toHaveURL(/\/login$/);
  });
});
