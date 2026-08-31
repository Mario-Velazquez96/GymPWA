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
  repsValue,
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
 * 06_history — historial por ejercicio contra el proyecto Supabase real
 * (R1, R5, R8). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y un día de
 * entrenamiento con al menos dos ejercicios en el plan activo; si no lo hay, el
 * spec se salta con un mensaje claro en lugar de fallar.
 *
 * ⚠️ La BD ya contiene datos REALES del usuario. Este spec por tanto:
 *  - **no hardcodea ningún exercise_id**: usa el 2º ejercicio de HOY (05 usa el
 *    1º y 08 el 3º → sin colisiones al correr en paralelo) y deriva su id del
 *    enlace "Ver historial";
 *  - **borra en `afterEach` solo las filas que él creó** (ids nuevos respecto a
 *    la foto inicial), nunca por filtro de ejercicio/fecha;
 *  - **no asume historial vacío**: el ejercicio puede tener sesiones reales
 *    previas, así que afirma que aparece LA SERIE QUE ACABA DE REGISTRAR, sin
 *    exigir un número de sesiones ni un estado vacío.
 */
const EXERCISE_INDEX = 1;

let snapshot: LogSnapshot | null = null;

test.afterEach(async ({ page }) => {
  const pending = snapshot;
  snapshot = null;
  if (pending !== null) {
    // Corre aunque el test haya fallado a mitad: no deja basura en la BD real.
    await deleteCreatedLogs(page, pending);
  }
});

test.describe("06_history — historial por ejercicio", () => {
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  test("registra una serie hoy y aparece en 'Ver historial' con su peso × reps (R1, R5)", async ({
    page,
  }) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const exerciseCount = await waitForToday(page);
    test.skip(exerciseCount <= EXERCISE_INDEX, skipNoExerciseMessage(EXERCISE_INDEX));

    const opened =
      await test.step("abrir el 2º ejercicio de hoy y esperar la sección de registro", () =>
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
    let expectedLine = "";

    await test.step("R5: ajustar el peso de la serie y guardar, capturando el valor esperado", async () => {
      await increaseWeight(row).click();
      await increaseWeight(row).click();

      const weightText = (await weightValue(row).textContent())?.trim() ?? "";
      const repsText = (await repsValue(row).textContent())?.trim() ?? "";
      // El botón de peso ya trae la unidad ("5 kg"); el de reps es solo el número.
      expectedLine = `Serie ${setNumber} — ${weightText} × ${repsText}`;

      await saveButton(row).click();
      await expect(savedButton(row)).toBeVisible({ timeout: 20_000 });
    });

    await test.step("R5: se insertó exactamente una fila para esa serie", async () => {
      const created = await createdLogs(page, taken);
      expect(created).toHaveLength(1);
      expect(created[0].set_number).toBe(setNumber);
    });

    await test.step("R5: 'Ver historial' navega al historial del ejercicio con su nombre como título", async () => {
      await page.getByRole("link", { name: "Ver historial" }).click();
      await expect(page).toHaveURL(new RegExp(`/historial/${opened.exerciseId}$`));
      await expect(page.getByRole("heading", { name: opened.name, level: 1 })).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("R1: la sesión de hoy aparece con la serie recién registrada", async () => {
      // `.first()`: el ejercicio puede tener sesiones reales previas con una
      // línea idéntica; basta con que la de hoy esté presente.
      await expect(page.getByText(expectedLine).first()).toBeVisible({ timeout: 20_000 });
    });
  });

  test("un exercise_id inexistente muestra 'Ejercicio no encontrado' (R8)", async ({ page }) => {
    await test.step("login para pasar el guard de rutas protegidas", async () => {
      await login(page);
    });

    await test.step("R8: /historial/<id inexistente> cae en el estado no-encontrado", async () => {
      await page.goto("/historial/id-inexistente-e2e");
      await expect(page.getByText("Ejercicio no encontrado")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("link", { name: "Volver a Hoy" })).toBeVisible();
    });
  });
});
