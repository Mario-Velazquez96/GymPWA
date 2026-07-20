import { test, expect, type Page } from "@playwright/test";

/**
 * 05_workout_logging — registro de series contra el proyecto Supabase real
 * (R5, R8). Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y el fixture
 * e2e/fixtures/test-plan.sql aplicado ('Plan de prueba E2E', ejercicio '0001'
 * con 4 series objetivo hoy). Si la BD muestra "Sin plan activo", el spec se
 * salta con un mensaje claro en lugar de fallar.
 *
 * ESCRIBE filas reales en `workout_logs` (esperado y aprobado — ver
 * progress/current.md). Limpieza: borra las filas de HOY del ejercicio de
 * fixture '0001' del usuario E2E vía la API REST de Supabase con la sesión
 * autenticada del navegador (RLS acota el delete a las filas propias). Se
 * limpia al INICIO (corridas anteriores fallidas) y al FINAL (las filas que
 * este spec creó). La app NO tiene delete en services/ — el borrado vive solo
 * aquí, a propósito (R9).
 */
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

const FIXTURE_EXERCISE_ID = "0001";
const FIRST_EXERCISE_LINK = /Ejercicio E2E 1/;

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

test.describe("05_workout_logging — registro de series", () => {
  test.skip(
    email === "" || password === "" || supabaseUrl === "" || anonKey === "",
    "E2E_EMAIL / E2E_PASSWORD / VITE_SUPABASE_* no definidos en .env.local — se omite el registro de series",
  );

  test("guarda dos series, recarga y persisten como guardadas (R5, R8)", async ({ page }) => {
    await test.step("login y llegada a la pantalla Hoy", async () => {
      await login(page);
    });

    const sinPlan = page.getByText("Sin plan activo");
    const fixtureTitle = page.getByRole("heading", { name: "Pecho y espalda (prueba)" });

    await test.step("esperar a que resuelva la carga de Hoy", async () => {
      await expect(sinPlan.or(fixtureTitle).first()).toBeVisible({ timeout: 15_000 });
    });

    test.skip(
      await sinPlan.isVisible(),
      "Sin plan activo en la BD — aplica e2e/fixtures/test-plan.sql en el SQL editor de Supabase y re-corre",
    );

    await test.step("limpieza inicial: fuera las filas de hoy de corridas anteriores", async () => {
      await cleanupTodayLogs(page);
    });

    await test.step("abrir el primer ejercicio y esperar la sección de registro", async () => {
      await page.getByRole("link", { name: FIRST_EXERCISE_LINK }).click();
      await expect(page.getByRole("heading", { name: "Registro de series" })).toBeVisible({
        timeout: 15_000,
      });
      // target_sets = 4 del fixture → 4 filas editables tras la limpieza (R1)
      await expect(page.getByRole("button", { name: "Guardar serie" })).toHaveCount(4, {
        timeout: 15_000,
      });
    });

    const row1 = page.locator("li").filter({ has: page.getByRole("heading", { name: "Serie 1" }) });
    const row2 = page.locator("li").filter({ has: page.getByRole("heading", { name: "Serie 2" }) });
    let weightAtSave = "";

    await test.step("R5: ajustar el peso de la serie 1 con el stepper y guardar", async () => {
      await row1.getByRole("button", { name: "Aumentar Peso serie 1" }).click();
      await row1.getByRole("button", { name: "Aumentar Peso serie 1" }).click();
      weightAtSave =
        (await row1.getByRole("button", { name: "Peso serie 1", exact: true }).textContent()) ?? "";
      await row1.getByRole("button", { name: "Guardar serie" }).click();
      await expect(row1.getByRole("button", { name: "✓ Guardada" })).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("R5: guardar la serie 2", async () => {
      await row2.getByRole("button", { name: "Guardar serie" }).click();
      await expect(row2.getByRole("button", { name: "✓ Guardada" })).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("R8: recargar — las dos series persisten como guardadas", async () => {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Registro de series" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(row1.getByRole("button", { name: "✓ Guardada" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(row2.getByRole("button", { name: "✓ Guardada" })).toBeVisible();
      // Los valores guardados sobreviven la recarga (no filas vacías)
      await expect(row1.getByRole("button", { name: "Peso serie 1", exact: true })).toHaveText(
        weightAtSave,
      );
      // Las series 3 y 4 siguen editables
      await expect(page.getByRole("button", { name: "Guardar serie" })).toHaveCount(2);
    });

    await test.step("limpieza final: borrar las filas creadas por este spec", async () => {
      await cleanupTodayLogs(page);
    });
  });
});
