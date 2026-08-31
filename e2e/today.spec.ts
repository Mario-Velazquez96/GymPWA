import { test, expect } from "@playwright/test";
import {
  MISSING_CREDENTIALS,
  SKIP_NO_CREDENTIALS,
  exerciseCards,
  login,
  waitForToday,
} from "./helpers";

/**
 * 03_today_view — pantalla Hoy contra el proyecto Supabase real (R1, R3, R4,
 * R5, R6). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local.
 *
 * ⚠️ Agnóstico del plan: la BD ya no tiene el plan de fixture sino el plan REAL
 * del usuario, así que el spec no afirma títulos ni nombres de ejercicio
 * concretos — afirma la ESTRUCTURA y el comportamiento que exige la feature:
 * cards ordenadas con su meta "series × reps" (R1), navegación de días acotada
 * a start_date/end_date (R6) y los estados de descanso / día sin rutina / sin
 * plan (R3, R4, R5) según lo que traiga el plan vigente. Solo lectura: este
 * spec no escribe ni borra NADA.
 */
const MAX_PLAN_DAYS = 60;

test.describe("03_today_view — rutina del día", () => {
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  test("hoy renderiza la rutina del plan activo y la navegación de días respeta sus límites", async ({
    page,
  }, testInfo) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const cards = exerciseCards(page);
    const sinPlan = page.getByText("Sin plan activo");
    const descanso = page.getByText(/Día de descanso/);
    const sinRutina = page.getByText("Sin rutina asignada para este día");
    const prev = page.getByRole("button", { name: "Día anterior" });
    const next = page.getByRole("button", { name: "Día siguiente" });

    const todayCards = await test.step("esperar a que resuelva la carga de Hoy", () =>
      waitForToday(page));

    if (await sinPlan.isVisible()) {
      testInfo.annotations.push({ type: "camino", description: "sin-plan-activo (R5)" });

      await test.step("R5: 'Sin plan activo' sin navegación de días", async () => {
        await expect(sinPlan).toBeVisible();
        await expect(prev).toHaveCount(0);
        await expect(next).toHaveCount(0);
      });
      return;
    }

    testInfo.annotations.push({
      type: "camino",
      description: `plan activo (hoy: ${todayCards} ejercicio(s))`,
    });

    await test.step("R1/R3/R4: hoy muestra ejercicios en orden, o su estado vacío", async () => {
      if (todayCards > 0) {
        // Cada card es un enlace táctil al detalle, con nombre y meta del plan.
        for (let i = 0; i < todayCards; i += 1) {
          await expect(cards.nth(i)).toBeVisible();
          await expect(cards.nth(i)).toHaveText(/\S/);
          await expect(cards.nth(i)).toContainText(/\d+ × \S+/); // "4 × 8-12"
        }
      } else {
        // Día de descanso (R3) o día sin rutina asignada (R4).
        await expect(descanso.or(sinRutina).first()).toBeVisible();
        await expect(cards).toHaveCount(0);
      }
    });

    await test.step("R6: retroceder se clava en start_date (la flecha ‹ se deshabilita)", async () => {
      await expect(prev).toBeVisible();
      for (let i = 0; i < MAX_PLAN_DAYS && !(await prev.isDisabled()); i += 1) {
        await prev.click();
        await waitForToday(page);
      }
      await expect(prev).toBeDisabled();
      await expect(next).toBeEnabled();
    });

    const seen = { rest: false, unassigned: false, training: false };

    await test.step("R3/R4/R6: recorrer el plan hasta end_date (la flecha › se deshabilita)", async () => {
      for (let i = 0; i < MAX_PLAN_DAYS; i += 1) {
        const dayCards = await waitForToday(page);
        if (dayCards > 0) {
          seen.training = true;
        } else if (await descanso.isVisible()) {
          seen.rest = true;
        } else if (await sinRutina.isVisible()) {
          seen.unassigned = true;
        }
        if (await next.isDisabled()) {
          break;
        }
        await next.click();
      }
      await expect(next).toBeDisabled();
      await expect(prev).toBeEnabled();
    });

    await test.step("el recorrido cubrió al menos un día de entrenamiento del plan", async () => {
      testInfo.annotations.push({
        type: "días del plan",
        description: `entrenamiento: ${seen.training} · descanso: ${seen.rest} · sin rutina: ${seen.unassigned}`,
      });
      expect(seen.training).toBe(true);
    });
  });
});
