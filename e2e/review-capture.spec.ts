import { test, expect, type Page } from "@playwright/test";
import {
  MISSING_CREDENTIALS,
  SKIP_NO_CREDENTIALS,
  deleteCreatedLogs,
  ensureEditableRows,
  login,
  openExerciseCard,
  rowOfSet,
  saveButton,
  savedButton,
  setNumberOf,
  snapshotLogs,
  todayLocalISO,
  waitForToday,
  weightInput,
  weightValue,
  type LogSnapshot,
} from "./helpers";

/**
 * 14_ui_redesign_cyclorama (R33) — capturas de evidencia para la revisión de
 * cierre de Impeccable. NO es una prueba de comportamiento: se salta salvo
 * `CAPTURE=1` (y con credenciales). Produce, con datos reales del plan activo
 * y en un día de entrenamiento:
 *
 *   .impeccable/review/mobile.png                     Hoy, 390 × 844, página completa
 *   .impeccable/review/mobile-ejercicio.png           Ejercicio, ídem
 *   .impeccable/review/mobile-historial.png           Historial del mismo ejercicio
 *   .impeccable/review/mobile-dieta.png               Dieta, colapsables abiertos
 *   .impeccable/review/mobile-login.png               Login sin sesión
 *   .impeccable/review/desktop.png                    Hoy, 1440 × 900
 *   .impeccable/review/desktop-ejercicio.png          Ejercicio, ídem
 *   .impeccable/review/mobile-ejercicio-guardada.png  Ejercicio con una serie guardada
 *
 * Todas las capturas salvo la última son de **solo lectura**. La última
 * escribe UNA serie en `workout_logs` con el patrón de `logging.spec.ts`: foto
 * de los ids previos → guardar → capturar → borrar por id solo la fila nueva
 * (nunca por filtro de ejercicio/fecha), incluso si el test falla a mitad.
 *
 * Uso: `CAPTURE=1 pnpm test:e2e e2e/review-capture.spec.ts`
 * (PowerShell: `$env:CAPTURE="1"; pnpm test:e2e e2e/review-capture.spec.ts`).
 */

const CAPTURE = process.env.CAPTURE === "1";
const OUT_DIR = ".impeccable/review";
const MOBILE = { width: 390, height: 844 };

const VIEWPORTS = [
  { name: "mobile", viewport: MOBILE },
  { name: "desktop", viewport: { width: 1440, height: 900 } },
] as const;

/** Kicker de fecha de la banda del día (el `<p>` que sigue al `<h1>Hoy</h1>`). */
function dateKicker(page: Page) {
  return page.getByRole("heading", { name: "Hoy" }).locator("xpath=following-sibling::p[1]");
}

/**
 * Deja Hoy en un día con ejercicios: si la fecha actual es descanso / sin
 * rutina, avanza con "Día siguiente" hasta 7 veces. Devuelve cuántas cards hay.
 */
async function goToTrainingDay(page: Page): Promise<number> {
  let count = await waitForToday(page);
  for (let i = 0; i < 7 && count === 0; i += 1) {
    const next = page.getByRole("button", { name: "Día siguiente" });
    if (!(await next.isVisible()) || !(await next.isEnabled())) {
      break;
    }
    const before = await dateKicker(page).textContent();
    await next.click();
    await expect(dateKicker(page)).not.toHaveText(before ?? "");
    count = await waitForToday(page);
  }
  return count;
}

/** Espera a que la red se asiente (thumbnails / GIF) sin bloquear si algo sigue vivo. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

/**
 * Los thumbnails de Hoy van con `loading="lazy"`: sus peticiones arrancan
 * después del layout, así que `networkidle` puede resolver antes. Se espera a
 * que cada `<img>` de la lista esté completa (o falle) antes de fotografiar.
 */
async function waitForThumbnails(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href^='/ejercicio/'] img")).every(
            (img) => (img as HTMLImageElement).complete,
          ),
        ),
      { timeout: 20_000 },
    )
    .toBe(true)
    .catch(() => undefined);
}

/** Espera el GIF del ejercicio (si falla, la caja placeholder sigue siendo válida). */
async function waitForExerciseMedia(page: Page): Promise<void> {
  await expect(page.getByTestId("exercise-media")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Serie 1$/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("exercise-media").locator("img").last())
    .toHaveClass(/opacity-100/, { timeout: 15_000 })
    .catch(() => undefined);
}

async function shoot(page: Page, name: string): Promise<void> {
  await settle(page);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true, animations: "disabled" });
}

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`review-capture — ${name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport });
    test.skip(!CAPTURE, "Solo se ejecuta con CAPTURE=1 (capturas de evidencia, no es un test)");
    test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

    test(`Hoy y Ejercicio → ${name}.png, ${name}-ejercicio.png`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await login(page);

      const count = await goToTrainingDay(page);
      expect(count, "se necesita un día de entrenamiento con al menos una card").toBeGreaterThan(0);
      await waitForThumbnails(page);
      await shoot(page, name);

      const opened = await openExerciseCard(page, 0);
      await waitForExerciseMedia(page);
      await shoot(page, `${name}-ejercicio`);

      if (name !== "mobile") {
        return;
      }

      // Historial del mismo ejercicio (solo lectura).
      await page.getByRole("link", { name: "Ver historial" }).click();
      await expect(page.getByRole("heading", { level: 1, name: opened.name })).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page
          .getByText("Aún no hay registros de este ejercicio")
          .or(page.getByText(/^Serie 1 —/).first()),
      ).toBeVisible({ timeout: 20_000 });
      await shoot(page, "mobile-historial");

      // Dieta con las secciones colapsables abiertas (solo lectura).
      await page.getByRole("link", { name: "Dieta" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Dieta" })).toBeVisible({
        timeout: 20_000,
      });
      // La consulta de la dieta puede resolver después de `networkidle`: se
      // espera a que el estado de carga desaparezca antes de abrir y fotografiar.
      await expect(page.getByText("Cargando dieta…")).toHaveCount(0, { timeout: 20_000 });
      const summaries = page.locator("summary");
      await expect(
        summaries.first().or(page.getByText("Aún no tienes un plan de dieta asignado")),
      ).toBeVisible({ timeout: 20_000 });
      const sections = await summaries.count();
      for (let i = 0; i < sections; i += 1) {
        await summaries.nth(i).click();
      }
      await shoot(page, "mobile-dieta");

      // Login sin sesión.
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible({
        timeout: 20_000,
      });
      await shoot(page, "mobile-login");
    });
  });
}

test.describe("review-capture — fila guardada (390 × 844)", () => {
  test.use({ viewport: MOBILE });
  test.skip(!CAPTURE, "Solo se ejecuta con CAPTURE=1 (capturas de evidencia, no es un test)");
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  let snapshot: LogSnapshot | null = null;

  test.afterEach(async ({ page }) => {
    const pending = snapshot;
    snapshot = null;
    if (pending !== null) {
      await deleteCreatedLogs(page, pending);
    }
  });

  test("Ejercicio con una serie guardada → mobile-ejercicio-guardada.png", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await login(page);

    const count = await goToTrainingDay(page);
    expect(count, "se necesita un día de entrenamiento con al menos una card").toBeGreaterThan(0);

    const opened = await openExerciseCard(page, 0);
    await waitForExerciseMedia(page);

    // Foto de las series preexistentes ANTES de escribir: base de la limpieza.
    snapshot = await snapshotLogs(page, opened.exerciseId, todayLocalISO());

    const editable = await ensureEditableRows(page, 1);
    const setNumber = await setNumberOf(editable.nth(0));
    const row = rowOfSet(page, setNumber);

    // El prefill hereda los valores de una sesión capturada en libras (p. ej.
    // 11.34 kg), que la validación de 0.5 kg rechaza. Se teclea un peso limpio
    // como haría Mario antes de guardar.
    await weightValue(row).click();
    const input = weightInput(row);
    await input.fill("12.5");
    await input.press("Enter");
    await expect(weightValue(row)).toHaveText("12.5 kg");

    await saveButton(row).click();
    await expect(savedButton(row)).toBeVisible({ timeout: 20_000 });

    await shoot(page, "mobile-ejercicio-guardada");
  });
});
