import { test, expect } from "@playwright/test";
import {
  MISSING_CREDENTIALS,
  SKIP_NO_CREDENTIALS,
  createdLogs,
  deleteCreatedLogs,
  ensureEditableRows,
  login,
  openExerciseCard,
  repsValue,
  rowOfSet,
  saveButton,
  savedButton,
  setNumberOf,
  skipNoExerciseMessage,
  snapshotLogs,
  todayLocalISO,
  waitForToday,
  weightInput,
  weightValue,
  type LogSnapshot,
} from "./helpers";

/**
 * 08_weight_units — captura y lectura en libras contra el proyecto Supabase
 * real (R2, R6, R12, R14). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y un
 * día de entrenamiento con al menos tres ejercicios en el plan activo; si no lo
 * hay, el spec se salta con un mensaje claro en lugar de fallar.
 *
 * ⚠️ La BD ya contiene datos REALES del usuario. Este spec por tanto:
 *  - **no hardcodea ningún exercise_id**: usa el 3er ejercicio de HOY (05 usa el
 *    1º y 06 el 2º → sin colisiones al correr en paralelo) y deriva su id del
 *    enlace "Ver historial";
 *  - **borra en `afterEach` solo las filas que él creó** (ids nuevos respecto a
 *    la foto inicial), nunca por filtro de ejercicio/fecha;
 *  - **no asume historial vacío**: la columna "Anterior" puede traer valores
 *    reales y el historial puede tener sesiones previas; las aserciones son
 *    sobre la serie que este spec acaba de guardar.
 *
 * La preferencia de unidad vive en el `localStorage` del contexto de Playwright
 * (efímero, uno por test), así que nunca altera el dispositivo del usuario.
 */
const EXERCISE_INDEX = 2;

/** Peso capturado en libras y su equivalente canónico en kg (R7, R14). */
const WEIGHT_LB = "45";
const WEIGHT_KG = 20.41;

let snapshot: LogSnapshot | null = null;

test.afterEach(async ({ page }) => {
  const pending = snapshot;
  snapshot = null;
  if (pending !== null) {
    // Corre aunque el test haya fallado a mitad: no deja basura en la BD real.
    await deleteCreatedLogs(page, pending);
  }
});

test.describe("08_weight_units — registro en libras", () => {
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  test("captura 45 lb, persiste en lb tras recargar y la BD guarda 20.41 kg (R2, R6, R12, R14)", async ({
    page,
  }) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const exerciseCount = await waitForToday(page);
    test.skip(exerciseCount <= EXERCISE_INDEX, skipNoExerciseMessage(EXERCISE_INDEX));

    const opened =
      await test.step("abrir el 3er ejercicio de hoy y esperar la sección de registro", () =>
        openExerciseCard(page, EXERCISE_INDEX));

    const taken =
      await test.step("foto de las series preexistentes (base de la limpieza ID-precisa)", async () => {
        const snap = await snapshotLogs(page, opened.exerciseId, todayLocalISO());
        snapshot = snap; // el afterEach borra solo lo que se cree a partir de aquí
        return snap;
      });

    // Si el usuario ya completó sus series de hoy, "Agregar serie" crea la fila
    // extra que este spec necesita (el afterEach la borra por id).
    const editable = await ensureEditableRows(page, 1);

    const setNumber = await setNumberOf(editable.first());
    const row = rowOfSet(page, setNumber);
    const unitGroup = page.getByRole("group", { name: "Unidad de peso" });
    let repsAtSave = "";

    await test.step("R1/R2: el toggle arranca en kg y al pulsar 'lb' el ejercicio pasa a libras", async () => {
      await expect(unitGroup.getByRole("button", { name: "kg" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await unitGroup.getByRole("button", { name: "lb" }).click();
      await expect(unitGroup.getByRole("button", { name: "lb" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(weightValue(row)).toContainText("lb");
    });

    await test.step("R5/R6: teclear 45 en el stepper de peso lo interpreta como libras", async () => {
      await weightValue(row).click();
      const input = weightInput(row);
      await input.fill(WEIGHT_LB);
      await input.press("Enter");
      await expect(weightValue(row)).toHaveText(`${WEIGHT_LB} lb`);
    });

    await test.step("R6: guardar la serie deja la fila '✓ Guardada' mostrando 45 lb", async () => {
      repsAtSave = (await repsValue(row).textContent())?.trim() ?? "";
      await saveButton(row).click();
      await expect(savedButton(row)).toBeVisible({ timeout: 20_000 });
      await expect(weightValue(row)).toHaveText(`${WEIGHT_LB} lb`);
    });

    await test.step("R2/R6: recargar — el ejercicio sigue en lb y la serie sigue leyéndose 45 lb", async () => {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Registro de series" })).toBeVisible({
        timeout: 20_000,
      });
      await expect(unitGroup.getByRole("button", { name: "lb" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(savedButton(row)).toBeVisible({ timeout: 20_000 });
      await expect(weightValue(row)).toHaveText(`${WEIGHT_LB} lb`);
    });

    await test.step("R12: 'Ver historial' muestra la sesión de hoy en libras, sin toggle propio", async () => {
      await page.getByRole("link", { name: "Ver historial" }).click();
      await expect(page).toHaveURL(new RegExp(`/historial/${opened.exerciseId}$`));
      await expect(page.getByRole("heading", { name: opened.name, level: 1 })).toBeVisible({
        timeout: 20_000,
      });
      // `.first()`: puede haber sesiones reales previas con una línea idéntica.
      await expect(
        page.getByText(`Serie ${setNumber} — ${WEIGHT_LB} lb × ${repsAtSave}`).first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("group", { name: "Unidad de peso" })).toHaveCount(0);
    });

    await test.step("R14: la fila creada está en KILOGRAMOS (contrato con el repo Gym)", async () => {
      const created = await createdLogs(page, taken);
      expect(created).toHaveLength(1);
      expect(created[0].set_number).toBe(setNumber);
      expect(Number(created[0].weight_kg)).toBe(WEIGHT_KG);
    });
  });
});
