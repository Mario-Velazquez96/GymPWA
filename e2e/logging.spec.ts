import { test, expect } from "@playwright/test";
import {
  MISSING_CREDENTIALS,
  SKIP_NO_CREDENTIALS,
  createdLogs,
  deleteCreatedLogs,
  ensureEditableRows,
  increaseWeight,
  login,
  openExerciseCard,
  rowOfSet,
  saveButton,
  savedButton,
  setNumberOf,
  skipNoExerciseMessage,
  snapshotLogs,
  todayLocalISO,
  waitForToday,
  weightValue,
  type LogSnapshot,
} from "./helpers";

/**
 * 05_workout_logging — registro de series contra el proyecto Supabase real
 * (R5, R8). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y un día de
 * entrenamiento con al menos un ejercicio en el plan activo; si no lo hay, el
 * spec se salta con un mensaje claro en lugar de fallar.
 *
 * ⚠️ La BD ya contiene datos REALES del usuario (plan activo real, historial
 * real). Este spec por tanto:
 *  - **no hardcodea ningún exercise_id**: usa el 1er ejercicio de HOY y deriva
 *    su id del DOM (05 usa el 1º, 06 el 2º y 08 el 3º → sin colisiones al
 *    correr en paralelo);
 *  - **escribe solo en `workout_logs`** y borra en `afterEach`
 *    EXCLUSIVAMENTE las filas cuyo `id` no existía antes de empezar
 *    (`deleteCreatedLogs`), nunca por filtro de ejercicio/fecha;
 *  - **no asume historial vacío**: "Anterior" puede traer valores reales y hoy
 *    puede tener series ya registradas por el usuario, así que trabaja sobre
 *    las primeras filas EDITABLES y afirma sobre lo que él mismo guardó.
 */
const EXERCISE_INDEX = 0;

let snapshot: LogSnapshot | null = null;

test.afterEach(async ({ page }) => {
  const pending = snapshot;
  snapshot = null;
  if (pending !== null) {
    // Corre aunque el test haya fallado a mitad: no deja basura en la BD real.
    await deleteCreatedLogs(page, pending);
  }
});

test.describe("05_workout_logging — registro de series", () => {
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  test("guarda dos series, recarga y persisten como guardadas (R5, R8)", async ({ page }) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const exerciseCount = await waitForToday(page);
    test.skip(exerciseCount <= EXERCISE_INDEX, skipNoExerciseMessage(EXERCISE_INDEX));

    const opened =
      await test.step("abrir el ejercicio de hoy y esperar la sección de registro", () =>
        openExerciseCard(page, EXERCISE_INDEX));

    const taken =
      await test.step("foto de las series preexistentes (base de la limpieza ID-precisa)", async () => {
        const snap = await snapshotLogs(page, opened.exerciseId, todayLocalISO());
        snapshot = snap; // el afterEach borra solo lo que se cree a partir de aquí
        return snap;
      });

    // Se trabaja sobre las dos primeras filas EDITABLES: las series que el
    // usuario ya guardó hoy quedan intactas más arriba. Si ya completó todas
    // sus series objetivo, "Agregar serie" crea las filas extra que este spec
    // necesita (y el afterEach las borra por id).
    const editable = await ensureEditableRows(page, 2);

    const firstSet = await setNumberOf(editable.nth(0));
    const secondSet = await setNumberOf(editable.nth(1));
    const row1 = rowOfSet(page, firstSet);
    const row2 = rowOfSet(page, secondSet);
    let weightAtSave = "";

    await test.step("R5: ajustar el peso de la primera fila editable con el stepper y guardar", async () => {
      await increaseWeight(row1).click();
      await increaseWeight(row1).click();
      weightAtSave = (await weightValue(row1).textContent())?.trim() ?? "";
      await saveButton(row1).click();
      await expect(savedButton(row1)).toBeVisible({ timeout: 20_000 });
    });

    await test.step("R5: guardar la segunda fila editable", async () => {
      await saveButton(row2).click();
      await expect(savedButton(row2)).toBeVisible({ timeout: 20_000 });
    });

    await test.step("R5: se insertó exactamente una fila por serie guardada", async () => {
      const created = await createdLogs(page, taken);
      expect(created).toHaveLength(2);
      expect(created.map((row) => row.set_number).sort((a, b) => a - b)).toEqual(
        [firstSet, secondSet].sort((a, b) => a - b),
      );
    });

    await test.step("R8: recargar — las dos series persisten como guardadas", async () => {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Registro de series" })).toBeVisible({
        timeout: 20_000,
      });
      await expect(savedButton(row1)).toBeVisible({ timeout: 20_000 });
      await expect(savedButton(row2)).toBeVisible();
      // Los valores guardados sobreviven la recarga (no filas vacías)
      await expect(weightValue(row1)).toHaveText(weightAtSave);
    });
  });
});
