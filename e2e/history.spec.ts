import { test, expect, type Page } from "@playwright/test";

/**
 * 06_history — historial por ejercicio contra el proyecto Supabase real
 * (R1, R5, R8). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y el fixture
 * e2e/fixtures/test-plan.sql aplicado ('Plan de prueba E2E', ejercicio '0001').
 * Si la BD muestra "Sin plan activo", el spec se salta con un mensaje claro.
 *
 * A diferencia de 05, este spec CREA su propio historial (05 limpia sus filas
 * al terminar): registra una serie de HOY para el ejercicio '0001', abre "Ver
 * historial" y afirma que la sesión aparece con "X kg × Y". ESCRIBE filas
 * reales en `workout_logs` y las borra al inicio y al final vía la API REST de
 * Supabase con la sesión autenticada del navegador (RLS acota el delete a las
 * filas propias). La app NO tiene delete en services/ — el borrado vive solo
 * aquí, a propósito (R7).
 */
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

// Aislamiento de datos: 05 (logging.spec) es dueño del ejercicio '0001' y en
// paralelo borra sus filas de HOY; este spec usa el 2º ejercicio del fixture
// ('0002') para que sus escrituras/limpiezas nunca colisionen con las de 05.
const FIXTURE_EXERCISE_ID = "0002";
const FIXTURE_EXERCISE_LINK = /Ejercicio E2E 2/;
const FIXTURE_EXERCISE_NAME = "Ejercicio E2E 2 — remo con barra";

/** Fecha local del dispositivo como "YYYY-MM-DD" (mismo criterio que la app). */
function todayLocalISO(): string {
  const now = new Date();
  const pad2 = (value: number): string => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
}

/** Access token de la sesión supabase persistida en localStorage del navegador. */
async function accessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw === null) {
          return null;
        }
        try {
          return (JSON.parse(raw) as { access_token?: string }).access_token ?? null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
}

/**
 * Borra las filas de workout_logs de HOY para el ejercicio de fixture, con la
 * sesión del usuario E2E (RLS: solo borra filas propias). Nunca imprime
 * credenciales.
 */
async function cleanupTodayLogs(page: Page): Promise<void> {
  const token = await accessToken(page);
  if (token === null) {
    throw new Error("No se encontró la sesión supabase en localStorage para la limpieza");
  }
  const url = `${supabaseUrl}/rest/v1/workout_logs?exercise_id=eq.${FIXTURE_EXERCISE_ID}&performed_at=eq.${todayLocalISO()}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Limpieza de workout_logs falló con status ${response.status}`);
  }
}

test.describe("06_history — historial por ejercicio", () => {
  test.skip(
    email === "" || password === "" || supabaseUrl === "" || anonKey === "",
    "E2E_EMAIL / E2E_PASSWORD / VITE_SUPABASE_* no definidos en .env.local — se omite el historial",
  );

  test("registra una serie hoy y aparece en 'Ver historial' con su peso × reps (R1, R5)", async ({
    page,
  }) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    // Historial necesita un día de ENTRENAMIENTO con el ejercicio de fixture:
    // esperar a que aparezca su card. Si hoy es descanso / sin rutina / sin
    // plan (fixture sin re-centrar en current_date), se salta limpio en vez de
    // fallar — el humano re-aplica e2e/fixtures/test-plan.sql para re-centrar.
    const fixtureExercise = page.getByRole("link", { name: FIXTURE_EXERCISE_LINK });
    await fixtureExercise.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);

    test.skip(
      !(await fixtureExercise.isVisible()),
      "Hoy no es un día de entrenamiento con el ejercicio de fixture (descanso / sin rutina / sin plan) — re-aplica e2e/fixtures/test-plan.sql en el SQL editor de Supabase para re-centrar el plan en la fecha local y re-corre",
    );

    await test.step("limpieza inicial: fuera las filas de hoy de corridas anteriores", async () => {
      await cleanupTodayLogs(page);
    });

    await test.step("abrir el ejercicio de fixture y esperar la sección de registro", async () => {
      await fixtureExercise.click();
      await expect(page.getByRole("heading", { name: "Registro de series" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole("button", { name: "Guardar serie" }).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    const row1 = page.locator("li").filter({ has: page.getByRole("heading", { name: "Serie 1" }) });
    let expectedLine = "";

    await test.step("R5: ajustar el peso de la serie 1 y guardar, capturando el valor esperado", async () => {
      await row1.getByRole("button", { name: "Aumentar Peso serie 1" }).click();
      await row1.getByRole("button", { name: "Aumentar Peso serie 1" }).click();

      const weightText =
        (await row1.getByRole("button", { name: "Peso serie 1", exact: true }).textContent()) ?? "";
      const repsText =
        (await row1
          .getByRole("button", { name: "Repeticiones serie 1", exact: true })
          .textContent()) ?? "";
      // El botón de peso ya trae la unidad ("5 kg"); el de reps es solo el número.
      expectedLine = `Serie 1 — ${weightText.trim()} × ${repsText.trim()}`;

      await row1.getByRole("button", { name: "Guardar serie" }).click();
      await expect(row1.getByRole("button", { name: "✓ Guardada" })).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("R5: 'Ver historial' navega a /historial/0002 con el nombre como título", async () => {
      await page.getByRole("link", { name: "Ver historial" }).click();
      await expect(page).toHaveURL(/\/historial\/0002$/);
      await expect(
        page.getByRole("heading", { name: FIXTURE_EXERCISE_NAME, level: 1 }),
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step("R1: la sesión de hoy aparece con la serie recién registrada", async () => {
      await expect(page.getByText(expectedLine)).toBeVisible({ timeout: 15_000 });
    });

    await test.step("limpieza final: borrar las filas creadas por este spec", async () => {
      await cleanupTodayLogs(page);
    });
  });

  test("un exercise_id inexistente muestra 'Ejercicio no encontrado' (R8)", async ({ page }) => {
    await test.step("login para pasar el guard de rutas protegidas", async () => {
      await login(page);
    });

    await test.step("R8: /historial/<id inexistente> cae en el estado no-encontrado", async () => {
      await page.goto("/historial/id-inexistente-e2e");
      await expect(page.getByText("Ejercicio no encontrado")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("link", { name: "Volver a Hoy" })).toBeVisible();
    });
  });
});
