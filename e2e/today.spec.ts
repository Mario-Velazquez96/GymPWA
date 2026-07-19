import { test, expect, type Page } from "@playwright/test";

/**
 * 03_today_view — pantalla Hoy contra el proyecto Supabase real (R1, R3, R5,
 * R6). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local.
 *
 * Doble camino, decidido en runtime según lo que muestre la página:
 *  - Con el fixture aplicado (e2e/fixtures/test-plan.sql en el SQL editor):
 *    hoy renderiza el día 'Pecho y espalda (prueba)' con 3 ejercicios en orden
 *    y navegar a mañana muestra "Día de descanso".
 *  - Sin plan activo en la BD (antes de aplicar el fixture): se afirma el
 *    estado "Sin plan activo" sin navegación de días.
 * El camino ejecutado se anota en el reporte y en la consola.
 */
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";

const FIXTURE_DAY_TITLE = "Pecho y espalda (prueba)";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
}

test.describe("03_today_view — rutina del día", () => {
  test.skip(
    email === "" || password === "",
    "E2E_EMAIL / E2E_PASSWORD no definidos en .env.local — se omite la pantalla Hoy",
  );

  test("hoy renderiza la rutina del fixture o, sin plan activo, su estado vacío", async ({
    page,
  }, testInfo) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const sinPlan = page.getByText("Sin plan activo");
    const fixtureTitle = page.getByRole("heading", { name: FIXTURE_DAY_TITLE });

    await test.step("esperar a que resuelva la carga (uno de los dos estados)", async () => {
      await expect(sinPlan.or(fixtureTitle).first()).toBeVisible({ timeout: 15_000 });
    });

    if (await sinPlan.isVisible()) {
      testInfo.annotations.push({
        type: "camino",
        description: "sin-plan-activo (fixture test-plan.sql aún no aplicado)",
      });
      console.warn("[e2e today] camino ejecutado: SIN PLAN ACTIVO (R5)");

      await test.step("R5: 'Sin plan activo' sin navegación de días", async () => {
        await expect(sinPlan).toBeVisible();
        await expect(page.getByRole("button", { name: "Día anterior" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Día siguiente" })).toHaveCount(0);
      });
      return;
    }

    testInfo.annotations.push({
      type: "camino",
      description: "fixture-aplicado (plan 'Plan de prueba E2E' activo)",
    });
    console.warn("[e2e today] camino ejecutado: FIXTURE APLICADO (R1, R3, R6)");

    await test.step("R1: título del día y 3 ejercicios en orden de position", async () => {
      await expect(fixtureTitle).toBeVisible();
      const cards = page.getByRole("link", { name: /Ejercicio E2E/ });
      await expect(cards).toHaveCount(3);
      await expect(cards.nth(0)).toContainText("Ejercicio E2E 1");
      await expect(cards.nth(0)).toContainText("4 × 8-12");
      await expect(cards.nth(1)).toContainText("Ejercicio E2E 2");
      await expect(cards.nth(2)).toContainText("Ejercicio E2E 3");
    });

    await test.step("R3/R6: mañana es 'Día de descanso'", async () => {
      await page.getByRole("button", { name: "Día siguiente" }).click();
      await expect(page.getByText(/Día de descanso/)).toBeVisible();
    });

    await test.step("R4/R6: los días +2 y +3 no tienen rutina y la flecha se clava en end_date", async () => {
      await page.getByRole("button", { name: "Día siguiente" }).click();
      await expect(page.getByText("Sin rutina asignada para este día")).toBeVisible();

      await page.getByRole("button", { name: "Día siguiente" }).click();
      await expect(page.getByText("Sin rutina asignada para este día")).toBeVisible();
      await expect(page.getByRole("button", { name: "Día siguiente" })).toBeDisabled();
    });
  });
});
