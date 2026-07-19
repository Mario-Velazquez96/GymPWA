import { test, expect, type Page } from "@playwright/test";

/**
 * 04_exercise_detail — detalle de ejercicio contra el proyecto Supabase real
 * (R1, R8). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y el fixture
 * e2e/fixtures/test-plan.sql aplicado ('Plan de prueba E2E' con 3 ejercicios
 * hoy). Si la BD muestra "Sin plan activo" (fixture retirado), el spec se
 * salta con un mensaje claro en lugar de fallar.
 *
 * La media del fixture son URLs placeholder (placehold.co): puede no renderizar
 * un GIF real — solo se afirma que la caja de media está presente (degradación
 * sin crash), no que el GIF cargue.
 */
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";

const FIXTURE_DAY_TITLE = "Pecho y espalda (prueba)";
const FIRST_EXERCISE_NAME = "Ejercicio E2E 1 — press de banca";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
}

test.describe("04_exercise_detail — pantalla de ejercicio", () => {
  test.skip(
    email === "" || password === "",
    "E2E_EMAIL / E2E_PASSWORD no definidos en .env.local — se omite el detalle de ejercicio",
  );

  test("desde Hoy, la primera card abre el detalle y volver regresa a Hoy", async ({ page }) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const sinPlan = page.getByText("Sin plan activo");
    const fixtureTitle = page.getByRole("heading", { name: FIXTURE_DAY_TITLE });

    await test.step("esperar a que resuelva la carga de Hoy", async () => {
      await expect(sinPlan.or(fixtureTitle).first()).toBeVisible({ timeout: 15_000 });
    });

    test.skip(
      await sinPlan.isVisible(),
      "Sin plan activo en la BD — aplica e2e/fixtures/test-plan.sql en el SQL editor de Supabase y re-corre",
    );

    await test.step("R1: tocar la primera card abre el detalle con el nombre como título", async () => {
      await page.getByRole("link", { name: /Ejercicio E2E 1/ }).click();
      await expect(page).toHaveURL(/\/ejercicio\//);
      await expect(
        page.getByRole("heading", { name: FIRST_EXERCISE_NAME, level: 1 }),
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step("R2/R3: caja de media presente y pasos numerados en orden", async () => {
      await expect(page.getByTestId("exercise-media")).toBeVisible();
      const steps = page.locator("ol > li");
      await expect(steps).toHaveCount(2);
      await expect(steps.nth(0)).toHaveText("Paso 1 de prueba");
      await expect(steps.nth(1)).toHaveText("Paso 2 de prueba");
    });

    await test.step("R4/R6: metas del plan y atribución Gym Visual visibles", async () => {
      await expect(page.getByText("4 × 8-12")).toBeVisible();
      await expect(page.getByText(/Descanso: 90 s/)).toBeVisible();
      await expect(
        page.getByRole("link", { name: "© Gym visual — https://gymvisual.com/" }),
      ).toBeVisible();
    });

    await test.step("R8: el control de volver regresa a Hoy", async () => {
      await page.getByRole("link", { name: "Volver" }).click();
      await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
      await expect(page.getByRole("heading", { name: FIXTURE_DAY_TITLE })).toBeVisible({
        timeout: 15_000,
      });
    });
  });
});
