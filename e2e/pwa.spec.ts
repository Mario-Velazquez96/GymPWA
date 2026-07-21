import { test, expect, type Page } from "@playwright/test";

/**
 * 07_pwa_install_and_cache — comportamiento del service worker y del manifest.
 * Corre contra la build de producción (`pnpm preview`), donde el SW sí existe.
 *
 * Las pruebas de caché son deterministas: en vez de depender de una URL real de
 * Supabase Storage (que podría 404 o cambiar), se interceptan a nivel de
 * contexto las peticiones cross-origin con `context.route` y se sirve una
 * respuesta 200 sintética. Playwright enruta también las peticiones que hace el
 * service worker, así que la regla CacheFirst se ejerce de verdad y se afirma el
 * resultado inspeccionando la Cache API (`caches`).
 */

// Host ficticio que cumple el predicado de la regla runtime (*.supabase.co).
const STORAGE_URL =
  "https://e2e-test.supabase.co/storage/v1/object/public/exercise-media/e2e.gif";
const REST_URL = "https://e2e-test.supabase.co/rest/v1/plans?select=id";

// GIF transparente de 1x1 px (base64).
const GIF_1PX = Buffer.from(
  "R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
  "base64",
);

type ManifestShape = {
  name: string;
  short_name: string;
  lang: string;
  display: string;
  start_url: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type?: string; purpose?: string }[];
};

/** Estado del service worker activo (o null si aún no hay). */
function serviceWorkerState(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state ?? null;
  });
}

test.describe("07_pwa_install_and_cache", () => {
  test("R1/R3: SW activo, link de manifest presente y campos requeridos", async ({
    page,
  }) => {
    await page.goto("/login");
    // `ready` resuelve al existir un worker activo, que puede seguir en
    // "activating"; se sondea hasta "activated".
    await expect.poll(() => serviceWorkerState(page), { timeout: 5_000 }).toBe(
      "activated",
    );

    const manifestHref = await page.getAttribute('link[rel="manifest"]', "href");
    if (!manifestHref) throw new Error("Falta <link rel=\"manifest\"> en el documento");

    const manifest = await page.evaluate(async (href): Promise<ManifestShape> => {
      const res = await fetch(href);
      return (await res.json()) as ManifestShape;
    }, manifestHref);

    expect(manifest.name).toBe("Rutinas Gym");
    expect(manifest.short_name).toBe("Rutinas");
    expect(manifest.lang).toBe("es");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();

    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    const purposes = manifest.icons.map((i) => i.purpose);
    expect(purposes).toContain("maskable");
  });

  test("R4/R7: el media de Storage se sirve desde la caché 'exercise-media'", async ({
    page,
  }) => {
    await page.context().route("**/storage/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/gif",
        headers: { "access-control-allow-origin": "*" },
        body: GIF_1PX,
      });
    });

    await page.goto("/login");
    await page.evaluate(() => navigator.serviceWorker.ready);

    // Dos peticiones al mismo recurso: la primera puebla la caché, la segunda
    // debería resolverse desde ella (CacheFirst).
    await page.evaluate(async (url) => {
      await fetch(url, { mode: "cors" });
      await fetch(url, { mode: "cors" });
    }, STORAGE_URL);

    // El recurso quedó almacenado en 'exercise-media' (la escritura de caché de
    // Workbox es asíncrona, por eso se sondea).
    await expect
      .poll(
        () =>
          page.evaluate(async (url) => {
            const cache = await caches.open("exercise-media");
            return Boolean(await cache.match(url));
          }, STORAGE_URL),
        { timeout: 5_000 },
      )
      .toBe(true);
  });

  test("R5: las respuestas de /rest/ nunca se cachean", async ({ page }) => {
    await page.context().route("**/rest/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify([{ id: 1 }]),
      });
    });

    await page.goto("/login");
    await page.evaluate(() => navigator.serviceWorker.ready);

    await page.evaluate(async (url) => {
      await fetch(url, { mode: "cors" });
      await fetch(url, { mode: "cors" });
    }, REST_URL);

    const foundInAnyCache = await page.evaluate(async (url) => {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        if (await cache.match(url)) return true;
      }
      return false;
    }, REST_URL);
    expect(foundInAnyCache).toBe(false);
  });
});
