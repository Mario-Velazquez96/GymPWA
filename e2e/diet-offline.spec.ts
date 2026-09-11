import { test, expect, type Locator, type Page } from "@playwright/test";
import { MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS, login } from "./helpers";

/**
 * 12_diet_offline — criterio 7 de client_requirement_dieta §8 contra la build
 * de producción (`pnpm preview`, el único sitio donde existe el service
 * worker): con el plan ya visto una vez, en modo avión `/dieta` sigue
 * mostrando el plan completo con el banner "Sin conexión", las listas se
 * siguen tachando y la sesión persistida no rebota a `/login`.
 *
 * ⚠️ **Cero escrituras a Supabase**: los tres tests son de solo lectura. Lo
 * único que se toca es el `localStorage` del navegador efímero de Playwright
 * (`gym:diet:snapshot`, `gym:diet:check:*` y, en el test 3, la fecha de
 * caducidad del token de la sesión de prueba, que supabase-js rota sola).
 *
 * Mientras las migraciones 003/004 de 09 no estén aplicadas en el proyecto en
 * vivo, `/dieta` resuelve en estado de error y los tests 2 y 3 se **saltan con
 * mensaje explícito** en vez de fingir que pasaron.
 */
const IPHONE_VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: IPHONE_VIEWPORT });

type DietState = "plan" | "sin-plan" | "error";

/** Texto del banner de 12 R12. */
const OFFLINE_BANNER = /^Sin conexión · plan guardado el .+$/;

/** Errores que emite el navegador/auth-js sin red y que no delatan un bug de la app. */
function isIgnorableConsoleError(text: string): boolean {
  return (
    text.includes("Failed to load resource") ||
    text.includes("net::ERR_") ||
    text.includes("Failed to fetch") ||
    text.includes("AuthRetryableFetchError")
  );
}

/** Recolecta errores de consola y excepciones no atrapadas desde ya. */
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

/** Espera a que /dieta resuelva en uno de sus tres estados (con hasta 3 reintentos). */
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

  if (await macros.isVisible()) {
    return "plan";
  }
  return (await empty.isVisible()) ? "sin-plan" : "error";
}

/** Login + navegación a /dieta por la barra inferior; devuelve el estado observado. */
async function goToDiet(page: Page): Promise<DietState> {
  await login(page);
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Dieta" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Dieta" })).toBeVisible();
  return waitForDiet(page);
}

/** Corta la red del contexto y, por si acaso, aborta lo que pudiera pedir el SW. */
async function goOffline(page: Page): Promise<void> {
  await page.context().route("**/*.supabase.co/**", (route) => route.abort("internetdisconnected"));
  await page.context().setOffline(true);
}

async function goOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
  await page.context().unroute("**/*.supabase.co/**");
}

/** El `<details>` cuyo `<summary>` dice `title`. */
function sectionByTitle(page: Page, title: string): Locator {
  return page.locator("details").filter({ has: page.locator("summary", { hasText: title }) });
}

/** Abre el `<details>` si estaba cerrado (tras un reload vuelve a estarlo). */
async function openSection(section: Locator): Promise<void> {
  if ((await section.getAttribute("open")) === null) {
    await section.locator("summary").click();
  }
  await expect(section).toHaveAttribute("open", /.*/);
}

/** Instantánea de lo que se ve del plan, para comparar con/sin red (R12). */
interface DietContent {
  planName: string;
  meals: number;
  macros: number;
  checkboxes: number;
  hasSupplements: boolean;
  sections: string[];
}

async function readDietContent(page: Page): Promise<DietContent> {
  const main = page.getByRole("main");
  return {
    planName: ((await main.locator("p").first().textContent()) ?? "").trim(),
    meals: await main.locator("article").count(),
    macros: await main.locator('dl[aria-label="Macros del día"] dt').count(),
    checkboxes: await main.getByRole("checkbox").count(),
    hasSupplements: (await page.getByRole("heading", { name: "Suplementos" }).count()) > 0,
    sections: await page.locator("details summary").allTextContents(),
  };
}

test.describe("12_diet_offline — Dieta sin señal (snapshot local, sin caché de API)", () => {
  test("R16: el chunk de DietScreen viaja en el precache del service worker", async ({
    page,
  }, testInfo) => {
    await page.goto("/login");
    // `ready` resuelve al existir un worker activo, que puede seguir en
    // "activating"; se sondea hasta "activated" (patrón de pwa.spec.ts).
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const registration = await navigator.serviceWorker.ready;
            return registration.active?.state ?? null;
          }),
        { timeout: 10_000 },
      )
      .toBe("activated");

    const precached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        if (!name.startsWith("workbox-precache")) {
          continue;
        }
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          urls.push(new URL(request.url).pathname);
        }
      }
      return urls;
    });

    const dietChunk = precached.filter((url) => /\/assets\/DietScreen-[\w-]+\.js$/.test(url));
    testInfo.annotations.push({
      type: "chunk de Dieta precacheado",
      description: dietChunk.join(", ") || `no encontrado entre: ${precached.join(", ")}`,
    });
    expect(dietChunk.length).toBeGreaterThan(0);
    // R15: el shell se precachea, pero ninguna respuesta de la API entra ahí.
    expect(precached.some((url) => url.startsWith("/rest/"))).toBe(false);
  });

  test.describe("con credenciales", () => {
    test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

    test.afterEach(async ({ page }) => {
      await goOnline(page);
      // Higiene del navegador de prueba: solo claves locales de la app.
      await page.evaluate(() => {
        const doomed: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key !== null && key.startsWith("gym:diet:")) {
            doomed.push(key);
          }
        }
        for (const key of doomed) {
          localStorage.removeItem(key);
        }
      });
    });

    test("criterio 7: en modo avión Dieta muestra el plan guardado, se tacha y al volver la red se actualiza (R8, R9, R12, R14)", async ({
      page,
    }, testInfo) => {
      const errors = collectErrors(page);

      const state = await goToDiet(page);
      testInfo.annotations.push({ type: "estado observado en /dieta", description: state });
      test.skip(
        state !== "plan",
        state === "error"
          ? "/dieta resolvió en estado de error (las tablas diet_* de 09 aún no están aplicadas en el proyecto en vivo) — el criterio 7 necesita un plan de dieta activo"
          : "No hay plan de dieta activo en la base — el criterio 7 necesita uno; se omite",
      );

      const online = await readDietContent(page);
      testInfo.annotations.push({
        type: "contenido con red",
        description: `${online.planName} · ${online.meals} comidas · ${online.checkboxes} renglones`,
      });
      await expect(page.getByRole("status").filter({ hasText: "Sin conexión" })).toHaveCount(0);

      await test.step("R12: sin red, el plan guardado se pinta con el banner bajo el título", async () => {
        await goOffline(page);
        await page.reload();

        await expect(page).toHaveURL(/\/dieta$/);
        await expect(page.getByRole("heading", { level: 1, name: "Dieta" })).toBeVisible();

        const banner = page.getByRole("status").filter({ hasText: "Sin conexión" });
        await expect(banner).toBeVisible({ timeout: 20_000 });
        await expect(banner).toHaveText(OFFLINE_BANNER);

        const titulo = page.getByRole("heading", { level: 1, name: "Dieta" });
        const bannerBox = await banner.boundingBox();
        const tituloBox = await titulo.boundingBox();
        expect(bannerBox?.y ?? 0).toBeGreaterThan(tituloBox?.y ?? 0);
      });

      await test.step("R9/R12: el plan sin red es idéntico al de la última carga con red", async () => {
        const offline = await readDietContent(page);
        expect(offline.macros).toBe(4);
        expect(offline.planName).toBe(online.planName);
        expect(offline.meals).toBe(online.meals);
        expect(offline.checkboxes).toBe(online.checkboxes);
        expect(offline.hasSupplements).toBe(online.hasSupplements);
        expect(offline.sections).toEqual(online.sections);
      });

      const superSection = sectionByTitle(page, "Lista de súper");
      const hasSuper = (await superSection.count()) > 0;
      testInfo.annotations.push({
        type: "lista de súper",
        description: hasSuper ? "presente" : "ausente",
      });

      if (hasSuper) {
        await test.step("R14: sin red se tacha, sobrevive a la recarga y 'Desmarcar todo' limpia", async () => {
          await openSection(superSection);
          const first = superSection.getByRole("checkbox").first();
          const firstName = ((await first.textContent()) ?? "").trim();
          await first.click();
          await expect(first).toHaveAttribute("aria-checked", "true");

          await page.reload(); // sigue sin red
          await expect(page.getByRole("status").filter({ hasText: "Sin conexión" })).toBeVisible({
            timeout: 20_000,
          });
          const reloaded = sectionByTitle(page, "Lista de súper");
          await openSection(reloaded);
          const marcado = reloaded.getByRole("checkbox").filter({ hasText: firstName }).first();
          await expect(marcado).toHaveAttribute("aria-checked", "true");

          await reloaded.getByRole("button", { name: "Desmarcar todo" }).click();
          await expect(reloaded.getByRole("checkbox").first()).toHaveAttribute(
            "aria-checked",
            "false",
          );
        });
      }

      await test.step("R8: al volver la red y reabrir Dieta, el banner desaparece", async () => {
        await goOnline(page);
        await page
          .getByRole("navigation", { name: "Navegación principal" })
          .getByRole("link", { name: "Hoy" })
          .click();
        await expect(page.getByRole("heading", { level: 1, name: "Hoy" })).toBeVisible();
        await page
          .getByRole("navigation", { name: "Navegación principal" })
          .getByRole("link", { name: "Dieta" })
          .click();

        expect(await waitForDiet(page)).toBe("plan");
        await expect(page.getByRole("status").filter({ hasText: "Sin conexión" })).toHaveCount(0);
      });

      await test.step("la pantalla no lanza excepciones en ningún momento", () => {
        expect(errors.pageErrors).toEqual([]);
        expect(errors.console).toEqual([]);
      });
    });

    test("R18/R19: con el token caducado y sin red, la sesión persistida no rebota a /login", async ({
      page,
    }, testInfo) => {
      // Sin red y con el token caducado, auth-js reintenta el refresh con
      // backoff durante ~30 s antes de rendirse (AUTO_REFRESH_TICK_DURATION_MS),
      // así que `getSession()` tarda: la app enseña su spinner mientras tanto.
      // Es comportamiento de supabase-js, previo a 12; lo que 12 garantiza es
      // que al resolver NO se expulsa a /login.
      test.setTimeout(120_000);

      const state = await goToDiet(page);
      testInfo.annotations.push({ type: "estado observado en /dieta", description: state });

      // Caduca el access token en el storage: al recargar, supabase-js
      // intentará refrescarlo y sin red fallará con AuthRetryableFetchError.
      const expired = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key === null || !key.startsWith("sb-") || !key.endsWith("-auth-token")) {
            continue;
          }
          const raw = localStorage.getItem(key);
          if (raw === null) {
            return false;
          }
          try {
            const parsed = JSON.parse(raw) as { expires_at?: number; expires_in?: number };
            parsed.expires_at = Math.floor(Date.now() / 1000) - 60;
            parsed.expires_in = 0;
            localStorage.setItem(key, JSON.stringify(parsed));
            return true;
          } catch {
            return false;
          }
        }
        return false;
      });
      expect(expired, "no se encontró la sesión sb-*-auth-token en localStorage").toBe(true);

      await goOffline(page);
      await page.reload();

      // Lo que este test afirma: NO se expulsa a /login (12 R19).
      await expect(page).toHaveURL(/\/dieta$/);
      await expect(page.getByRole("heading", { level: 1, name: "Dieta" })).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText("pantalla de login")).toHaveCount(0);
      await expect(page.getByLabel("Correo")).toHaveCount(0);

      if (state === "plan") {
        await expect(page.getByRole("status").filter({ hasText: "Sin conexión" })).toBeVisible({
          timeout: 30_000,
        });
      } else {
        testInfo.annotations.push({
          type: "sin snapshot",
          description:
            "/dieta no tenía plan que guardar (09 sin aplicar o sin plan activo): se afirma solo que la sesión no rebota a /login",
        });
      }
    });
  });
});
