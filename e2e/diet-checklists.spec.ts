import { test, expect, type Locator, type Page } from "@playwright/test";
import { MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS, login } from "./helpers";

/**
 * 11_diet_checklists — listas tachables de la pantalla Dieta contra el proyecto
 * Supabase real (R2, R3, R6, R7, R10, R11, R15, R17). Requiere
 * E2E_EMAIL / E2E_PASSWORD en .env.local.
 *
 * ⚠️ **Cero escrituras a Supabase**: el tachado vive en el `localStorage` del
 * navegador de prueba (`gym:diet:check:*`), que este spec limpia al terminar.
 * No se crea, edita ni borra ninguna fila de la base.
 *
 * `/dieta` puede resolver en tres estados según lo que haya en la BD (ver
 * `e2e/diet.spec.ts`). Este spec **necesita un plan activo con lista de súper**;
 * en cualquier otro caso se salta con un mensaje explícito en vez de fingir que
 * pasó. Mientras las migraciones 003/004 de 09 no estén aplicadas en el
 * proyecto en vivo, el estado esperado es "error" y el spec se salta.
 */
const IPHONE_VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: IPHONE_VIEWPORT });

type DietState = "plan" | "sin-plan" | "error";

/** Errores de consola que no delatan un bug de la app (fallos de red del navegador). */
function isIgnorableConsoleError(text: string): boolean {
  return text.includes("Failed to load resource") || text.includes("net::ERR_");
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

/**
 * Espera a que /dieta resuelva en uno de sus tres estados, reintentando hasta
 * 3 veces con el propio botón "Reintentar" ante un fallo transitorio de red.
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

/** El `<details>` cuyo `<summary>` dice `title`. */
function sectionByTitle(page: Page, title: string): Locator {
  return page.locator("details").filter({ has: page.locator("summary", { hasText: title }) });
}

/** Abre el `<details>` si estaba cerrado (tras un reload vuelve a estarlo, R12). */
async function openSection(section: Locator): Promise<void> {
  if ((await section.getAttribute("open")) === null) {
    await section.locator("summary").click();
  }
  await expect(section).toHaveAttribute("open", /.*/);
}

test.describe("11_diet_checklists — listas tachables (localStorage, sin escrituras a Supabase)", () => {
  test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS);

  test.afterEach(async ({ page }) => {
    // Higiene del navegador de prueba: se borran solo las claves del tachado.
    // La base de datos no se toca en ningún momento (R15).
    await page.evaluate(() => {
      const doomed: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key !== null && key.startsWith("gym:diet:check:")) {
          doomed.push(key);
        }
      }
      for (const key of doomed) {
        localStorage.removeItem(key);
      }
    });
  });

  test("tachar la lista de súper sobrevive a la recarga y 'Desmarcar todo' la limpia (R2, R3, R6, R7, R17)", async ({
    page,
  }, testInfo) => {
    const errors = collectErrors(page);

    const state = await goToDiet(page);
    testInfo.annotations.push({ type: "estado observado en /dieta", description: state });

    test.skip(
      state !== "plan",
      state === "error"
        ? "/dieta resolvió en estado de error (las tablas diet_* de 09 aún no están aplicadas en el proyecto en vivo) — este spec necesita un plan de dieta activo"
        : "No hay plan de dieta activo en la base — este spec necesita uno con lista de súper",
    );

    const superSection = sectionByTitle(page, "Lista de súper");
    const hasSuper = (await superSection.count()) > 0;
    testInfo.annotations.push({
      type: "lista de súper",
      description: hasSuper ? "presente" : "ausente",
    });
    test.skip(
      !hasSuper,
      "El plan activo no tiene lista de súper (diet_checklist_items kind='super') — nada que tachar",
    );

    await test.step("R12: la sección arranca cerrada y se abre con un toque", async () => {
      await expect(superSection).not.toHaveAttribute("open", /.*/);
      await openSection(superSection);
    });

    const boxes = superSection.getByRole("checkbox");
    const total = await boxes.count();
    testInfo.annotations.push({ type: "renglones de súper", description: String(total) });
    expect(total).toBeGreaterThan(0);

    const first = boxes.first();
    const firstName = ((await first.textContent()) ?? "").trim();
    const clearAll = superSection.getByRole("button", { name: "Desmarcar todo" });

    await test.step("R7/R17: nada marcado → botón deshabilitado y contador en 0", async () => {
      await expect(first).toHaveAttribute("aria-checked", "false");
      await expect(clearAll).toBeDisabled();
      await expect(superSection.getByText(`0 de ${total} marcados`)).toBeVisible();
      expect((await first.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    });

    await test.step("R2/R17: un toque tacha el renglón y actualiza el contador", async () => {
      await first.click();

      await expect(first).toHaveAttribute("aria-checked", "true");
      await expect(first.locator("span").last()).toHaveClass(/line-through/);
      await expect(superSection.getByText(`1 de ${total} marcados`)).toBeVisible();
      await expect(clearAll).toBeEnabled();
    });

    await test.step("R3: tras recargar la app, el renglón sigue tachado", async () => {
      await page.reload();
      expect(await waitForDiet(page)).toBe("plan");
      await openSection(sectionByTitle(page, "Lista de súper"));

      const reloaded = sectionByTitle(page, "Lista de súper")
        .getByRole("checkbox")
        .filter({ hasText: firstName })
        .first();
      await expect(reloaded).toHaveAttribute("aria-checked", "true");
      await expect(
        sectionByTitle(page, "Lista de súper").getByText(`1 de ${total} marcados`),
      ).toBeVisible();
    });

    await test.step("R6/R7: 'Desmarcar todo' limpia la lista entera", async () => {
      const section = sectionByTitle(page, "Lista de súper");
      await section.getByRole("button", { name: "Desmarcar todo" }).click();

      for (let i = 0; i < total; i += 1) {
        await expect(section.getByRole("checkbox").nth(i)).toHaveAttribute("aria-checked", "false");
      }
      await expect(section.getByRole("button", { name: "Desmarcar todo" })).toBeDisabled();
      await expect(section.getByText(`0 de ${total} marcados`)).toBeVisible();
    });

    await test.step("R6: el vaciado también persiste al recargar", async () => {
      await page.reload();
      expect(await waitForDiet(page)).toBe("plan");
      await openSection(sectionByTitle(page, "Lista de súper"));

      await expect(
        sectionByTitle(page, "Lista de súper").getByRole("checkbox").first(),
      ).toHaveAttribute("aria-checked", "false");
    });

    await test.step("la pantalla no ensucia la consola", () => {
      expect(errors.console).toEqual([]);
      expect(errors.pageErrors).toEqual([]);
    });
  });

  test("la lista de súper agrupa por categoría y 'Qué cocinar' lleva la rotación debajo (R10, R11)", async ({
    page,
  }, testInfo) => {
    const state = await goToDiet(page);
    testInfo.annotations.push({ type: "estado observado en /dieta", description: state });

    test.skip(
      state !== "plan",
      state === "error"
        ? "/dieta resolvió en estado de error (las tablas diet_* de 09 aún no están aplicadas en el proyecto en vivo) — este spec necesita un plan de dieta activo"
        : "No hay plan de dieta activo en la base — este spec necesita uno con listas",
    );

    const superSection = sectionByTitle(page, "Lista de súper");
    test.skip(
      (await superSection.count()) === 0,
      "El plan activo no tiene lista de súper (diet_checklist_items kind='super')",
    );

    await test.step("R10: los grupos llevan encabezado y 'Otros' va al final", async () => {
      await openSection(superSection);

      const headings = await superSection.getByRole("heading", { level: 3 }).allTextContents();
      testInfo.annotations.push({ type: "grupos del súper", description: headings.join(" · ") });

      for (const heading of headings) {
        expect(heading.trim()).not.toBe("");
      }
      const otros = headings.indexOf("Otros");
      if (otros !== -1) {
        expect(otros).toBe(headings.length - 1);
      }
    });

    const cocinar = sectionByTitle(page, "Qué cocinar");
    if ((await cocinar.count()) === 0) {
      testInfo.annotations.push({ type: "qué cocinar", description: "el plan no trae meal prep" });
      return;
    }

    await test.step("R11: la rotación va dentro de 'Qué cocinar', después del último renglón", async () => {
      await openSection(cocinar);

      const headings = cocinar.getByRole("heading", { level: 3 });
      if ((await headings.count()) === 0) {
        testInfo.annotations.push({ type: "rotación", description: "el plan no trae rotación" });
        return;
      }

      const rotacion = headings.last();
      await expect(rotacion).toBeVisible();

      const boxes = cocinar.getByRole("checkbox");
      const count = await boxes.count();
      if (count > 0) {
        const lastBox = (await boxes.last().boundingBox())?.y ?? 0;
        const headingY = (await rotacion.boundingBox())?.y ?? 0;
        expect(headingY).toBeGreaterThan(lastBox);
      }

      // R11: el Markdown de la rotación se ve interpretado, sin pipes crudos.
      const body = (await cocinar.textContent()) ?? "";
      expect(body.split("\n").some((line) => line.trim().startsWith("|"))).toBe(false);
      expect(body).not.toContain("**");
    });
  });
});
