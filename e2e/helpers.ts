import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Utilidades compartidas por los specs E2E que ESCRIBEN en la base real.
 *
 * ⚠️ Contexto (2026-08): la BD del proyecto ya NO es de prueba. El repo `Gym`
 * sembró el catálogo real (1324 ejercicios) y el usuario tiene un plan activo
 * real con historial real en `workout_logs`. Por eso estos helpers imponen dos
 * reglas innegociables:
 *
 * 1. **Limpieza ID-precisa.** Antes de escribir se toma una foto de los `id`
 *    existentes para (ejercicio, fecha); al terminar se borran ÚNICAMENTE los
 *    ids que no estaban en esa foto. Nunca se hace `DELETE` por
 *    `exercise_id`/`performed_at`: ese filtro puede arrastrar series que el
 *    usuario registró él mismo.
 * 2. **Nada de ids de ejercicio hardcodeados.** El ejercicio objetivo se deriva
 *    del DOM (la card de HOY y el enlace "Ver historial" del detalle), así que
 *    los specs funcionan con cualquier plan activo.
 *
 * La única tabla que se toca es `workout_logs`, y solo las filas que el propio
 * spec creó. RLS acota además todo al usuario autenticado.
 */

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
export const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "";

/** `true` si falta cualquier credencial → los specs se saltan con mensaje. */
export const MISSING_CREDENTIALS =
  E2E_EMAIL === "" || E2E_PASSWORD === "" || SUPABASE_URL === "" || ANON_KEY === "";

/** Mensaje único del `test.skip` por credenciales ausentes. */
export const SKIP_NO_CREDENTIALS =
  "E2E_EMAIL / E2E_PASSWORD / VITE_SUPABASE_* no definidos en .env.local — se omite el spec";

/** Mensaje del `test.skip` cuando HOY no ofrece el ejercicio que el spec necesita. */
export function skipNoExerciseMessage(index: number): string {
  const position = index + 1;
  return `Hoy no hay un ejercicio en la posición ${position} (descanso / sin rutina / sin plan activo / día más corto) — este spec necesita un día de entrenamiento con al menos ${position} ejercicios`;
}

/** Fecha local del dispositivo como "YYYY-MM-DD" (mismo criterio que la app). */
export function todayLocalISO(): string {
  const now = new Date();
  const pad2 = (value: number): string => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(E2E_EMAIL);
  await page.getByLabel("Contraseña").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
}

/** Access token de la sesión supabase persistida en localStorage del navegador. */
async function accessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
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
  if (token === null) {
    throw new Error("No se encontró la sesión supabase en localStorage");
  }
  return token;
}

/** Fila de `workout_logs` tal como la devuelve PostgREST. */
export interface LiveLog {
  id: string;
  set_number: number;
  reps: number;
  weight_kg: number | string;
}

/** Series del usuario para un ejercicio y una fecha (solo lectura). */
export async function fetchLogs(
  page: Page,
  exerciseId: string,
  isoDate: string,
): Promise<LiveLog[]> {
  const token = await accessToken(page);
  const url = `${SUPABASE_URL}/rest/v1/workout_logs?select=id,set_number,reps,weight_kg&exercise_id=eq.${exerciseId}&performed_at=eq.${isoDate}`;
  const response = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Lectura de workout_logs falló con status ${response.status}`);
  }
  return (await response.json()) as LiveLog[];
}

/** Tope de filas que un spec puede haber creado; por encima, no se borra nada. */
const MAX_ROWS_PER_SPEC = 8;

/** Foto de las filas preexistentes: la referencia de la limpieza ID-precisa. */
export interface LogSnapshot {
  exerciseId: string;
  date: string;
  existingIds: string[];
}

export async function snapshotLogs(
  page: Page,
  exerciseId: string,
  isoDate: string,
): Promise<LogSnapshot> {
  const rows = await fetchLogs(page, exerciseId, isoDate);
  return { exerciseId, date: isoDate, existingIds: rows.map((row) => row.id) };
}

/** Filas que aparecieron DESPUÉS de la foto, es decir, las que creó el spec. */
export async function createdLogs(page: Page, snapshot: LogSnapshot): Promise<LiveLog[]> {
  const rows = await fetchLogs(page, snapshot.exerciseId, snapshot.date);
  const before = new Set(snapshot.existingIds);
  return rows.filter((row) => !before.has(row.id));
}

/**
 * Borra EXCLUSIVAMENTE las filas creadas por el spec (`id=in.(…)`). Si no creó
 * ninguna, no emite ninguna petición de borrado. Jamás borra por filtro de
 * ejercicio/fecha, para no tocar las series reales del usuario.
 */
export async function deleteCreatedLogs(page: Page, snapshot: LogSnapshot): Promise<number> {
  const created = await createdLogs(page, snapshot);
  if (created.length === 0) {
    return 0;
  }
  // Red de seguridad sobre datos reales: ningún spec crea más de un puñado de
  // series. Un número alto significa que la foto inicial es incorrecta, y en
  // ese caso se prefiere fallar ruidosamente antes que borrar de más.
  if (created.length > MAX_ROWS_PER_SPEC) {
    throw new Error(
      `Limpieza abortada: ${created.length} filas nuevas superan el máximo de ${MAX_ROWS_PER_SPEC} que un spec puede crear. NO se borró nada; revisa la foto inicial antes de continuar.`,
    );
  }
  const token = await accessToken(page);
  const ids = created.map((row) => row.id).join(",");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/workout_logs?id=in.(${ids})`, {
    method: "DELETE",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Limpieza de workout_logs falló con status ${response.status}`);
  }
  return created.length;
}

/** Cards de ejercicio de la pantalla Hoy, en orden de `position`. */
export function exerciseCards(page: Page): Locator {
  return page.locator('a[href^="/ejercicio/"]');
}

/**
 * Espera a que Hoy resuelva (cards o alguno de sus estados vacíos) y devuelve
 * cuántos ejercicios tiene el día. 0 = descanso / sin rutina / sin plan activo.
 */
export async function waitForToday(page: Page): Promise<number> {
  const cards = exerciseCards(page);
  const empty = page.getByText(/Sin plan activo|Día de descanso|Sin rutina asignada para este día/);
  const retry = page.getByRole("button", { name: "Reintentar" });

  // Contra el backend real (y con varios workers en paralelo) una consulta
  // puede fallar de forma transitoria; la app muestra su error con
  // "Reintentar" (03 R8) y el spec hace lo mismo que haría el usuario en el
  // gym, en vez de dar por rota la pantalla.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(cards.first().or(empty.first()).or(retry)).toBeVisible({ timeout: 20_000 });
    if (!(await retry.isVisible())) {
      return cards.count();
    }
    await retry.click();
  }

  await expect(cards.first().or(empty.first())).toBeVisible({ timeout: 20_000 });
  return cards.count();
}

/** Ejercicio abierto desde Hoy: su id de catálogo y su nombre, leídos del DOM. */
export interface OpenedExercise {
  exerciseId: string;
  name: string;
}

/**
 * Abre la card `index` (0-based) de HOY y espera la sección de registro. El
 * `exercise_id` se deriva del enlace "Ver historial" (`/historial/<id>`), nunca
 * de una constante — así el spec es agnóstico del plan activo.
 */
export async function openExerciseCard(page: Page, index: number): Promise<OpenedExercise> {
  await exerciseCards(page).nth(index).click();
  await expect(page.getByRole("heading", { name: "Registro de series" })).toBeVisible({
    timeout: 20_000,
  });

  const historyLink = page.getByRole("link", { name: "Ver historial" });
  await expect(historyLink).toBeVisible({ timeout: 20_000 });
  const href = (await historyLink.getAttribute("href")) ?? "";
  const exerciseId = href.replace("/historial/", "");
  if (exerciseId === "") {
    throw new Error(`No se pudo derivar el exercise_id del enlace "Ver historial" (href: ${href})`);
  }

  const name = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  return { exerciseId, name };
}

/* ── Localizadores de la sección de registro (agnósticos del nº de serie) ──── */

/** Todas las filas de serie ("Serie N") de la pantalla. */
export function setRows(page: Page): Locator {
  return page.locator("li").filter({ has: page.getByRole("heading", { name: /^Serie \d+$/ }) });
}

/** Filas todavía editables (las que muestran "Guardar serie"). */
export function editableRows(page: Page): Locator {
  return setRows(page).filter({ has: page.getByRole("button", { name: "Guardar serie" }) });
}

/**
 * Garantiza que haya al menos `count` filas EDITABLES donde registrar.
 *
 * Con datos reales el usuario puede haber completado ya todas las series
 * objetivo de hoy (todas las filas en "✓ Guardada"). En ese caso se usa el
 * propio "Agregar serie" de la app (05 R1) para añadir filas extra al final:
 * llevan un `set_number` nuevo, así que no chocan con las series reales del
 * usuario y el `afterEach` las borra por id. Devuelve las filas editables.
 */
export async function ensureEditableRows(page: Page, count: number): Promise<Locator> {
  await expect(setRows(page).first()).toBeVisible({ timeout: 20_000 });

  const add = page.getByRole("button", { name: "Agregar serie" });
  for (let i = 0; i < 8 && (await editableRows(page).count()) < count; i += 1) {
    await expect(add).toBeVisible();
    await add.click();
  }

  const editable = editableRows(page);
  const available = await editable.count();
  if (available < count) {
    throw new Error(
      `No se pudieron obtener ${count} filas editables (hay ${available}) ni con "Agregar serie"`,
    );
  }
  return editable;
}

/** Fila concreta por número de serie, estable a través de recargas. */
export function rowOfSet(page: Page, setNumber: number): Locator {
  return page
    .locator("li")
    .filter({ has: page.getByRole("heading", { name: `Serie ${setNumber}` }) });
}

/** Número de serie de una fila ("Serie 3" → 3). */
export async function setNumberOf(row: Locator): Promise<number> {
  const text = (await row.getByRole("heading", { name: /^Serie \d+$/ }).textContent()) ?? "";
  const match = /\d+/.exec(text);
  if (match === null) {
    throw new Error(`No se pudo leer el número de serie de la fila (texto: "${text}")`);
  }
  return Number(match[0]);
}

export function weightValue(row: Locator): Locator {
  return row.getByRole("button", { name: /^Peso serie \d+$/ });
}

export function weightInput(row: Locator): Locator {
  return row.getByRole("textbox", { name: /^Peso serie \d+$/ });
}

export function increaseWeight(row: Locator): Locator {
  return row.getByRole("button", { name: /^Aumentar Peso serie \d+$/ });
}

export function repsValue(row: Locator): Locator {
  return row.getByRole("button", { name: /^Repeticiones serie \d+$/ });
}

export function saveButton(row: Locator): Locator {
  return row.getByRole("button", { name: "Guardar serie" });
}

export function savedButton(row: Locator): Locator {
  return row.getByRole("button", { name: "✓ Guardada" });
}
