import { test, expect } from "@playwright/test";
import {
  MISSING_CREDENTIALS,
  SKIP_NO_CREDENTIALS,
  exerciseCards,
  login,
  skipNoExerciseMessage,
  waitForToday,
} from "./helpers";

/**
 * 04_exercise_detail — detalle de ejercicio contra el proyecto Supabase real
 * (R1–R6, R8). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y un día de
 * entrenamiento con al menos un ejercicio; si no lo hay, el spec se salta con
 * un mensaje claro en lugar de fallar.
 *
 * ⚠️ Agnóstico del plan: la BD ya trae el catálogo real y el plan real del
 * usuario, así que el nombre y la meta esperados se leen de la propia card de
 * HOY en vez de hardcodearse. Solo lectura: este spec no escribe ni borra NADA.
 */
const EXERCISE_INDEX = 0;

test.describe("04_exercise_detail — pantalla de ejercicio", () => {
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  test("desde Hoy, la primera card abre el detalle y volver regresa a Hoy", async ({ page }) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const exerciseCount = await waitForToday(page);
    test.skip(exerciseCount <= EXERCISE_INDEX, skipNoExerciseMessage(EXERCISE_INDEX));

    const card = exerciseCards(page).nth(EXERCISE_INDEX);
    const cardText = (await card.textContent())?.trim() ?? "";
    // La card es "<nombre><series> × <reps>": el nombre es su primer span.
    const exerciseName = (await card.locator("span > span").first().textContent())?.trim() ?? "";
    const meta = (await card.locator("span > span").nth(1).textContent())?.trim() ?? "";
    expect(exerciseName).not.toBe("");
    expect(meta).toMatch(/\d+ × \S+/);

    await test.step("R1: tocar la card abre el detalle con el nombre del ejercicio como título", async () => {
      await card.click();
      await expect(page).toHaveURL(/\/ejercicio\//);
      await expect(page.getByRole("heading", { name: exerciseName, level: 1 })).toBeVisible({
        timeout: 20_000,
      });
      expect(cardText).toContain(exerciseName);
    });

    await test.step("R2/R3: caja de media presente y pasos numerados en orden", async () => {
      await expect(page.getByTestId("exercise-media")).toBeVisible();

      const steps = page.locator("ol > li");
      const sinPasos = page.getByText("Sin instrucciones disponibles");
      if ((await steps.count()) > 0) {
        await expect(steps.first()).toHaveText(/\S/);
        await expect(steps.last()).toHaveText(/\S/);
      } else {
        // Caso borde documentado del catálogo: aviso en vez de lista vacía.
        await expect(sinPasos).toBeVisible();
      }
    });

    await test.step("R4/R6: metas del plan y atribución Gym Visual visibles", async () => {
      await expect(page.getByText(meta, { exact: false }).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: "© Gym visual — https://gymvisual.com/" }),
      ).toBeVisible();
    });

    await test.step("R8: el control de volver regresa a Hoy", async () => {
      await page.getByRole("link", { name: "Volver" }).click();
      await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
      await expect(exerciseCards(page).first()).toBeVisible({ timeout: 20_000 });
    });
  });
});
