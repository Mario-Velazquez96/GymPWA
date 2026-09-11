import { test, expect, type Page } from "@playwright/test";
import { MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS, login } from "./helpers";

/**
 * 10_diet_screen — pantalla Dieta contra el proyecto Supabase real (R1, R2,
 * R3, R6, R8, R9, R12, R13, R14, R15, R17). Requiere E2E_EMAIL / E2E_PASSWORD
 * en .env.local.
 *
 * ⚠️ **Solo lectura**: este spec no crea, edita ni borra ninguna fila (la única
 * tabla que la app escribe es `workout_logs`, y aquí ni se toca).
 *
 * La pantalla puede resolver en tres estados según lo que haya en la BD, y los
 * tres son legítimos mientras el repo `Gym` no suba un plan (e incluso mientras
 * las tablas `diet_*` de 09 no estén aplicadas en el proyecto en vivo):
 *
 *  1. **plan activo** — macros, ventana, comidas, suplementos y secciones;
 *  2. **sin plan** — "Aún no tienes un plan de dieta asignado" (R17);
 *  3. **error** — "No se pudo cargar la dieta" + "Reintentar" (R18), que es lo
 *     que devuelve PostgREST si las tablas todavía no existen.
 *
 * El spec detecta cuál ocurrió, lo deja anotado en el reporte y afirma lo que
 * corresponde a ese estado. La navegación Hoy → Dieta → Hoy y el guard de
 * sesión se verifican siempre.
 */
const IPHONE_VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: IPHONE_VIEWPORT });

type DietState = "plan" | "sin-plan" | "error";

/** Errores de consola que no delatan un bug de la app (fallos de red del navegador). */
function isIgnorableConsoleError(text: string): boolean {
  return text.includes("Failed to load resource") || text.includes("net::ERR_");
}

/** Recolecta errores de consola y excepciones no atrapadas desde ya (R17). */
function collectErrors(page: Page): { console: string[]; pageErrors: string[] } {
  const collected = { console: [] as string[], pageErrors: [] as string[] };
  page.on("console", (message) => {
    if (message.type() === "error" && !isIgnorableConsoleError(message.text())) {
      collected.console.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    collected.pageErrors.push(error.message);
  });
  return collected;
}

/**
 * Espera a que /dieta resuelva en uno de sus tres estados, reintentando hasta
 * 3 veces con el propio botón "Reintentar" ante un fallo transitorio de red
 * (igual que haría Mario en el gym).
 */
async function waitForDiet(page: Page): Promise<DietState> {
  const macros = page.locator('dl[aria-label="Macros del día"]');
  const empty = page.getByText("Aún no tienes un plan de dieta asignado");
  const retry = page.getByRole("button", { name: "Reintentar" });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(macros.or(empty).or(retry)).toBeVisible({ timeout: 20_000 });
    if (await macros.isVisible()) {
      return "plan";
    }
    if (await empty.isVisible()) {
      return "sin-plan";
    }
    await retry.click();
  }

  await expect(macros.or(empty).or(retry)).toBeVisible({ timeout: 20_000 });
  if (await macros.isVisible()) {
    return "plan";
  }
  return (await empty.isVisible()) ? "sin-plan" : "error";
}

test.describe("10_diet_screen — pantalla Dieta (solo lectura)", () => {
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  test("sin sesión, /dieta rebota a /login (R1)", async ({ page }) => {
    await page.goto("/dieta");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
  });

  test("la barra inferior lleva de Hoy a Dieta y de vuelta, y la pantalla resuelve en un estado válido", async ({
    page,
  }, testInfo) => {
    const errors = collectErrors(page);

    await test.step("login y llegada a Hoy", async () => {
      await login(page);
    });

    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const hoy = nav.getByRole("link", { name: "Hoy" });
    const dieta = nav.getByRole("link", { name: "Dieta" });

    await test.step("R2: la nav es visible con Hoy como pestaña activa", async () => {
      await expect(nav).toBeVisible();
      await expect(hoy).toHaveAttribute("aria-current", "page");
      await expect(dieta).not.toHaveAttribute("aria-current", "page");

      // R2/R3: pestañas táctiles (≥ 44px) y por encima del borde inferior.
      for (const tab of [hoy, dieta]) {
        const box = await tab.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });

    await test.step("R3: tocar 'Dieta' navega sin recargar", async () => {
      await dieta.click();

      await expect(page).toHaveURL(/\/dieta$/);
      await expect(page.getByRole("heading", { level: 1, name: "Dieta" })).toBeVisible();
      await expect(dieta).toHaveAttribute("aria-current", "page");
      await expect(hoy).not.toHaveAttribute("aria-current", "page");
    });

    const state = await test.step("esperar a que /dieta resuelva", () => waitForDiet(page));

    testInfo.annotations.push({ type: "estado observado en /dieta", description: state });

    if (state === "error") {
      await test.step("R18: estado de error con mensaje y botón de reintento", async () => {
        await expect(page.getByRole("alert")).toHaveText("No se pudo cargar la dieta");
        const retry = page.getByRole("button", { name: "Reintentar" });
        await expect(retry).toBeVisible();
        expect((await retry.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
        await expect(nav).toBeVisible();
      });
    }

    if (state === "sin-plan") {
      await test.step("R17: sin plan activo, mensaje vacío y nav intacta", async () => {
        await expect(page.getByText("Aún no tienes un plan de dieta asignado")).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(nav).toBeVisible();
        expect(errors.console).toEqual([]);
        expect(errors.pageErrors).toEqual([]);
      });
    }

    if (state === "plan") {
      await test.step("R6: los cuatro macros se ven sin hacer scroll", async () => {
        const macros = page.locator('dl[aria-label="Macros del día"]');
        await expect(macros).toBeInViewport();
        await expect(macros.locator("dt")).toHaveCount(4);
        for (const label of ["Calorías", "Proteína", "Carbohidrato", "Grasa"]) {
          await expect(macros.getByText(label, { exact: true })).toBeVisible();
        }
        await expect(macros.locator("dd").first()).toContainText("kcal");
      });

      await test.step("R8/R9: la ventana de alimentación informa su estado", async () => {
        const ventana = page.getByRole("heading", {
          name: /Ventana de alimentación|Este plan no tiene ventana de ayuno/,
        });
        await expect(ventana).toBeVisible();
        if (/Ventana de alimentación/.test((await ventana.textContent()) ?? "")) {
          await expect(
            page.getByText(/Fuera de la ventana|Dentro de la ventana|Ventana cerrada/),
          ).toBeVisible();
        }
      });

      await test.step("R12: las comidas tienen título y renglones", async () => {
        const meals = page.locator("article");
        const count = await meals.count();
        testInfo.annotations.push({ type: "comidas", description: String(count) });
        if (count === 0) {
          await expect(page.getByText("Este plan no tiene comidas")).toBeVisible();
        } else {
          for (let i = 0; i < count; i += 1) {
            await expect(meals.nth(i).getByRole("heading", { level: 3 })).toBeVisible();
            await expect(meals.nth(i).locator("li").first()).toBeVisible();
          }
        }
      });

      await test.step("R13: los suplementos llevan etiqueta de recomendación", async () => {
        const suplementos = page.getByRole("heading", { name: "Suplementos" });
        if ((await suplementos.count()) === 0) {
          testInfo.annotations.push({ type: "suplementos", description: "el plan no trae" });
          return;
        }
        const marcas = page.getByRole("img", { name: /^(Recomendado|No recomendado)$/ });
        expect(await marcas.count()).toBeGreaterThan(0);
      });

      await test.step("R14/R15: la primera sección abre y su Markdown se ve interpretado", async () => {
        const sections = page.locator("details");
        const count = await sections.count();
        testInfo.annotations.push({ type: "secciones", description: String(count) });
        if (count === 0) {
          return;
        }
        const first = sections.first();
        await expect(first).not.toHaveAttribute("open", /.*/);

        await first.locator("summary").click();
        await expect(first).toHaveAttribute("open", /.*/);

        const body = (await first.textContent()) ?? "";
        expect(body).not.toContain("**");
        expect(body.split("\n").some((line) => line.trim().startsWith("|"))).toBe(false);
      });

      await test.step("R17: la pantalla con plan tampoco ensucia la consola", async () => {
        expect(errors.console).toEqual([]);
        expect(errors.pageErrors).toEqual([]);
      });
    }

    await test.step("R3: volver a Hoy desde la barra inferior", async () => {
      await hoy.click();

      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1, name: "Hoy" })).toBeVisible();
      await expect(hoy).toHaveAttribute("aria-current", "page");
    });
  });
});
