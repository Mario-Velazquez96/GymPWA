# Design — 12_diet_offline

**Source:** requirements.md de esta feature; client_requirement_dieta RF-D6, RF-D10, §8 criterio 7; docs/architecture.md (regla "nunca cachear la API de Supabase en el SW"); docs/conventions.md §PWA; specs/07_pwa_install_and_cache/design.md (workbox); specs/10_diet_screen/design.md (`getActiveDietPlan`, `useDietPlan`, `DietScreen`); specs/11_diet_checklists (estado de tachado en `localStorage`); `vite.config.ts`; `e2e/pwa.spec.ts`; `src/lib/units.ts`; `src/hooks/useSession.tsx`; `src/components/ProtectedRoute.tsx`; `@supabase/auth-js` 2.110.7 (`GoTrueClient.js`, `lib/constants.js`, `lib/fetch.js`)

## Approach

Tres capas, ninguna toca el service worker ni Supabase:

1. **Persistencia local pura** (`src/lib/dietCache.ts`): el último `DietPlanFull`
   que devolvió la red se guarda como JSON en `localStorage` (`gym:diet:snapshot`),
   con versión de esquema (`v: 1`) y `savedAt`. Misma disciplina que
   `lib/units.ts`: `try/catch` en **todo** acceso, corrupto → `null`, escritura
   best-effort. El plan es texto ligero (~10–30 kB); cabe holgadamente.
2. **Stale-while-revalidate en el hook** (`src/hooks/useDietPlan.ts`): al montar
   muestra el snapshot si existe (sin loading), pide a la red, y según el
   resultado reemplaza + reescribe el snapshot, o conserva el snapshot con
   `isStale: true`. La pantalla solo añade un banner. El service `diet.ts` **no
   cambia**.
3. **Sesión sin red** (open item A, `useSession.tsx` + `ProtectedRoute.tsx`):
   distinguir "no hay sesión" de "hay sesión persistida pero el refresh falló
   por red", para no rebotar a `/login` en modo avión.

Por qué **no** en el service worker: docs/architecture.md prohíbe cachear
`/rest/` (los datos de planes y logs deben ser frescos; 07 R5 lo afirma con
test). Un snapshot a nivel app es explícito, versionado, testeable con
`localStorage` de jsdom, y no requiere que el SW conozca la forma de las
respuestas de PostgREST ni los headers de autorización. El SW sigue haciendo
lo que ya hace desde 07: precachear el shell (incluido el chunk lazy de
`/dieta`) y servir `index.html` en navegaciones sin red.

Las listas tachables de 11 no necesitan nada: su estado ya vive en
`localStorage` bajo `gym:diet:check:<planId>:<kind>` y el snapshot conserva los
mismos `id` y `plan.id` que la red (es el mismo objeto serializado), así que
tachar sin red funciona por construcción.

Capas tocadas: **lib + hooks + screens/UI** (y **auth** por el open item A/B).

## Services

`src/services/diet.ts` — **sin cambios** (R17). Sigue devolviendo
`Result<DietPlanFull | null>` con las hijas ya ordenadas por `position`
(`sortByPosition`), así que lo que se persiste ya está ordenado.

## Lib — `src/lib/dietCache.ts` (nuevo, puro)

```ts
import { DIET_TIME_ZONE } from "@/lib/diet";
import type { DietPlanFull } from "@/lib/types";

/** Clave única del snapshot en localStorage (R1). */
export const DIET_SNAPSHOT_KEY = "gym:diet:snapshot";
/** Sube este número si cambia la forma de DietPlanFull: invalida snapshots viejos (R2). */
export const DIET_SNAPSHOT_VERSION = 1 as const;

export interface DietSnapshot {
  v: typeof DIET_SNAPSHOT_VERSION;
  plan: DietPlanFull;   // nunca null: "sin plan" = clave ausente (R4, open item C)
  savedAt: string;      // ISO 8601 UTC (new Date().toISOString())
}

function debugCache(...details: unknown[]): void {
  if (import.meta.env.DEV) console.debug("[dietCache]", ...details);
}

/** localStorage o null si el getter lanza (Safari privado con datos bloqueados) (R2, R5). */
function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; }
  catch (thrown: unknown) { debugCache("localStorage no accesible:", thrown); return null; }
}

const CHILD_KEYS = ["diet_meals", "diet_checklist_items", "diet_supplements", "diet_sections"] as const;

/** Chequeo estructural ligero (sin Zod): versión, savedAt, plan.id y las 4 hijas como arrays (R2). */
function isDietSnapshot(value: unknown): value is DietSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Record<string, unknown>;
  if (rec.v !== DIET_SNAPSHOT_VERSION || typeof rec.savedAt !== "string") return false;
  const plan = rec.plan;
  if (typeof plan !== "object" || plan === null) return false;
  const p = plan as Record<string, unknown>;
  return typeof p.id === "string" && CHILD_KEYS.every((k) => Array.isArray(p[k]));
}

/** Snapshot guardado, o null si no hay, está corrupto, es de otra versión o el storage lanza (R1, R2). */
export function readDietSnapshot(): DietSnapshot | null {
  try {
    const raw = storage()?.getItem(DIET_SNAPSHOT_KEY) ?? null;
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDietSnapshot(parsed)) { debugCache("snapshot inválido, se ignora"); return null; }
    return parsed;
  } catch (thrown: unknown) {
    debugCache("lectura del snapshot falló:", thrown);
    return null;
  }
}

/** Persiste el plan (o borra la clave con null). Best-effort: nunca lanza (R3, R4, R5). */
export function writeDietSnapshot(plan: DietPlanFull | null, now: Date = new Date()): void {
  try {
    const store = storage();
    if (store === null) return;
    if (plan === null) { store.removeItem(DIET_SNAPSHOT_KEY); return; }
    const snapshot: DietSnapshot = { v: DIET_SNAPSHOT_VERSION, plan, savedAt: now.toISOString() };
    store.setItem(DIET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (thrown: unknown) {
    debugCache("escritura del snapshot falló:", thrown);
  }
}

/** "2026-09-10T15:15:00Z" → "10 sep 09:15" (es-MX, America/Mexico_City); null si el ISO no parsea (R13). */
export function formatSavedAt(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: DIET_TIME_ZONE, day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value.replace(/\./g, "") ?? "";
  return `${part("day")} ${part("month")} ${part("hour")}:${part("minute")}`;
}
```

Decisiones:
- **Un snapshot corrupto no se borra al leer**: la siguiente respuesta OK lo
  sobrescribe; borrar añadiría otra vía de escritura sin beneficio.
- **`now` inyectable** en `writeDietSnapshot` para que el round-trip de test
  afirme `savedAt` exacto sin fake timers.
- **Sin validación profunda**: los componentes de 10/11 ya son defensivos con
  campos nulos; el chequeo estructural evita lo único que rompería la UI
  (hijas que no son arrays).

## Hooks — `src/hooks/useDietPlan.ts` (reescrito; misma API pública + 2 campos)

```ts
import { useCallback, useEffect, useState } from "react";
import { readDietSnapshot, writeDietSnapshot } from "@/lib/dietCache";
import type { DietPlanFull } from "@/lib/types";
import { getActiveDietPlan } from "@/services/diet";

export interface DietPlanState {
  loading: boolean;             // solo sin snapshot y con la red en vuelo (R7)
  error: string | null;         // solo sin snapshot y con la red fallida (R10)
  plan: DietPlanFull | null;    // null + !loading + !error = sin plan activo (10 R17)
  isStale: boolean;             // true = se muestra el snapshot porque la red falló (R9)
  savedAt: string | null;       // ISO del snapshot cuando isStale (R9, R12)
}

type Phase =
  | { kind: "loading" }                                        // sin snapshot, red en vuelo
  | { kind: "snapshot"; plan: DietPlanFull }                   // snapshot mostrado, red en vuelo
  | { kind: "fresh"; plan: DietPlanFull | null }               // red OK (null = vacío)
  | { kind: "stale"; plan: DietPlanFull; savedAt: string }     // red falló, snapshot
  | { kind: "error"; error: string };                          // red falló, sin snapshot

export function useDietPlan(): DietPlanState & { retry: () => void } {
  const [phase, setPhase] = useState<Phase>(() => {
    const snap = readDietSnapshot();                           // una sola lectura al montar (R6)
    return snap === null ? { kind: "loading" } : { kind: "snapshot", plan: snap.plan };
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setPhase((prev) => (prev.kind === "error" ? { kind: "loading" } : prev));   // R10
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    void getActiveDietPlan().then((result) => {
      if (!active) return;
      if (result.error === null) {
        writeDietSnapshot(result.data);                        // null → borra (R8, R4)
        setPhase({ kind: "fresh", plan: result.data });
        return;
      }
      const snap = readDietSnapshot();                         // el más reciente persistido (R9)
      setPhase(snap === null
        ? { kind: "error", error: result.error }               // R10
        : { kind: "stale", plan: snap.plan, savedAt: snap.savedAt });
    });
    return () => { active = false; };
  }, [attempt]);

  // Reintento al volver la red, solo mientras se muestre el snapshot (R11, open item D).
  useEffect(() => {
    if (phase.kind !== "stale") return;
    const onOnline = (): void => setAttempt((n) => n + 1);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [phase.kind]);

  const base = { loading: false, error: null, plan: null, isStale: false, savedAt: null, retry };
  switch (phase.kind) {
    case "loading":  return { ...base, loading: true };
    case "snapshot": return { ...base, plan: phase.plan };
    case "fresh":    return { ...base, plan: phase.plan };
    case "stale":    return { ...base, plan: phase.plan, isStale: true, savedAt: phase.savedAt };
    case "error":    return { ...base, error: phase.error };
  }
}
```

Los cinco caminos SWR del leader, mapeados: (1) montar con snapshot →
`snapshot` sin loading (R6); (2) siempre una llamada a la red por `attempt`
(R6); (3) OK → `fresh` + reescritura/borrado (R8); (4) fallo con snapshot →
`stale` + `savedAt` (R9); (5) fallo sin snapshot → `error` + `retry` (R10).
Durante un reintento por `online`, `phase` sigue en `stale` (el banner y el
plan no parpadean) hasta que la red resuelva. `getActiveDietPlan` falla sin
red porque supabase-js lanza `TypeError: Failed to fetch` y el service lo
convierte en `DIET_ERROR_LOAD` (10 R5) — nada nuevo que manejar.

## Screens / components

```
DietScreen (src/screens/DietScreen.tsx)                     — cambio mínimo (R12)
  const { loading, error, plan, retry, isStale, savedAt } = useDietPlan()
  <main …>
    <h1>Dieta</h1>
    {isStale && savedAt !== null && <OfflineBanner savedAt={savedAt} />}   ← nuevo, aquí
    loading → …   error → …   !plan → …   plan → (igual que 10 + listas de 11)
```

| Componente | Props | Notas |
|---|---|---|
| `src/components/OfflineBanner.tsx` (nuevo) | `savedAt: string` | `<p role="status" className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-300">Sin conexión · plan guardado el {formatSavedAt(savedAt)}</p>`; si `formatSavedAt` devuelve `null`: "Sin conexión · plan guardado en este dispositivo" (R13). Presentacional: sin fetching, sin botón (R12, R22). Una línea de ~36 px: `MacroSummary` sigue cabiendo en el viewport inicial de 390×844 (10 R6). |

El banner va bajo el `<h1>` y no dentro del bloque `plan →` para que, en un
futuro estado `stale` sin plan (imposible hoy: `stale` siempre tiene plan) no
dependa del render del plan. `role="status"` = `aria-live="polite"`.

## Auth — sesión sin red (open item A; `useSession.tsx`, `ProtectedRoute.tsx`)

### Análisis del comportamiento actual (auth-js 2.110.7)

| Paso | Qué hace supabase-js | Referencia (`GoTrueClient.js`) |
|---|---|---|
| Lee la sesión de `localStorage` (`sb-<ref>-auth-token`) | Sin red. Si faltan > 90 s para caducar (`EXPIRY_MARGIN_MS`, `constants.js:10`) devuelve la sesión tal cual | 2467–2512 |
| Access token caducado o a < 90 s | Llama `_callRefreshToken` → `POST /auth/v1/token` | 2514 |
| Sin red | `fetch` lanza → `AuthRetryableFetchError(…, 0)` (`fetch.js:28,114`). `_callRefreshToken` **no** llama `_removeSession` (solo lo hace en errores no-retryables con token caducado); cachea el fallo 60 s (`REFRESH_FAILURE_COOLDOWN_MS`) | 4188–4223 |
| Resultado de `getSession()` | Si el access token sigue vigente devuelve la sesión; si ya caducó devuelve **`{ session: null, error }`** | 2525–2535 |
| `onAuthStateChange` | `_emitInitialSession` emite **`INITIAL_SESSION` con `null`** y hace `console.error(err)`; no emite `SIGNED_OUT` | 3593–3611 |
| Recuperación | Ticker cada 30 s (`_autoRefreshTokenTick`, 4534–4609) y `visibilitychange` (`_onVisibilityChanged` → `_recoverAndRefresh`, 4645–4675) reintentan; al lograrlo emiten `TOKEN_REFRESHED` (4180). Si el refresh token es inválido de verdad → `_removeSession` → `SIGNED_OUT` (4209, 4331) | |

En la app: `useSession.tsx:35-40` fija `session = null` con lo que devolvió
`getSession()`; `:44-49` vuelve a fijar `null` con `INITIAL_SESSION`;
`ProtectedRoute.tsx:31-33` redirige a `/login`. **Hoy sí expulsa** en modo
avión con token caducado (> 1 h desde el último refresh), pese a que la sesión
sigue en storage y se repararía sola al volver la red.

### Cambio mínimo propuesto

```tsx
// src/hooks/useSession.tsx
import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js"; // reexportado de auth-js (dist/index.mjs:9)

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  /** true: hay sesión persistida cuyo refresh falló por red (token caducado sin conexión). No es logout (12 R18). */
  offlineSession: boolean;
}

// dentro del efecto:
void supabase.auth.getSession().then(({ data, error }) => {
  if (!active) return;
  if (data.session === null && error !== null && isAuthRetryableFetchError(error)) {
    setOfflineSession(true);                 // R18: solo llega aquí si había sesión en storage
  } else {
    setSession(data.session);
  }
  setLoading(false);
});

const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
  if (!active || event === "INITIAL_SESSION") return;   // R18: getSession() ya fijó el estado inicial
  setSession(nextSession);                                // R20
  setOfflineSession(false);
  setLoading(false);
});
```

```tsx
// src/components/ProtectedRoute.tsx
const { session, loading, offlineSession } = useSession();
…
if (session === null && !offlineSession) {               // R19
  return <Navigate to="/login" replace />;
}
```

Por qué es correcto y suficiente:
- `__loadSession` **solo** hace red si había una sesión válida en storage
  (2469–2479: sin sesión devuelve `{ session: null, error: null }` sin
  fetch). Por tanto `error` retryable + `session: null` ⇔ "sesión persistida
  no refrescable por red". No hace falta parsear `localStorage` a mano.
- Ignorar `INITIAL_SESSION` no cambia el comportamiento con red: ese evento
  repite el resultado de `getSession()` (misma `__loadSession`). Los tests de
  02 usan `SIGNED_IN`/`SIGNED_OUT`, que siguen igual.
- Con `offlineSession` la app no puede hacer nada útil contra Supabase (no hay
  red): Hoy/Historial muestran sus errores en español con "Reintentar" (03/06);
  Dieta muestra el snapshot. Al volver la red, supabase-js refresca solo y
  emite `TOKEN_REFRESHED` → `session` se fija (R20). Si el refresh token murió
  (revocado, > 1 semana) → `SIGNED_OUT` → `/login` (R20).
- `PublicOnly` no cambia: con `session === null` renderiza `/login` si el
  usuario navega ahí a mano; nadie lo manda automáticamente.
- Efecto colateral conocido (preexistente en auth-js, no de 12): durante los
  60 s de cooldown tras volver la red, `getSession()` puede seguir devolviendo
  `null` y una petición de Hoy saldría solo con la anon key → RLS devuelve
  `[]` → "Sin plan activo" transitorio; se resuelve solo al siguiente tick o
  con "Reintentar". Se documenta, no se engineerea.
- `_emitInitialSession` hace `console.error` en este camino (3610): el E2E de
  sesión debe tolerar ese error de consola concreto (`AuthRetryableFetchError`).

### Limpieza al cerrar sesión (open item B)

`src/services/auth.ts#signOut`: tras `supabase.auth.signOut()`, llamar
`writeDietSnapshot(null)` (R21). Una línea; `writeDietSnapshot` nunca lanza.

## PWA

- **`vite.config.ts`: sin cambios** (R15). `workbox.runtimeCaching` conserva
  su única regla (`/storage/` → `CacheFirst`); `/rest/` y `/auth/` siguen sin
  regla → red directa (07 R5, `e2e/pwa.spec.ts:115-141` lo afirma).
- **Precache del chunk de `/dieta`** (R16): `globPatterns: ["**/*.{js,css,html,svg,png,woff2}"]`
  (`vite.config.ts:51`) incluye **todos** los `.js` de `dist/assets/`, y el
  `React.lazy(() => import("@/screens/DietScreen"))` de 10 emite
  `dist/assets/DietScreen-<hash>.js` (nombre por defecto de Rollup,
  `assets/[name]-[hash].js`). Por tanto **ya está precacheado**; 12 no cambia
  la config pero lo **verifica en runtime** en `e2e/diet-offline.spec.ts`:
  con el SW activo, alguna entrada de la caché `workbox-precache-*` termina en
  `/assets/DietScreen-<hash>.js`. Si la build de 10 nombrara el chunk de otra
  forma, se ajusta el patrón del test (tarea explícita), no la config.
- **Navegación sin red a `/dieta`**: `navigateFallback: "/index.html"`
  (`vite.config.ts:52`) sirve el shell precacheado; React Router resuelve
  `/dieta` en cliente; `Suspense` carga el chunk desde el precache.
- **`localStorage` en iOS**: Safari puede purgar el almacenamiento de un sitio
  tras 7 días sin uso (ITP); la app instalada en la pantalla de inicio y de
  uso diario no cae en ese caso. Si ocurriera, se pierden a la vez el
  snapshot y la sesión — comportamiento equivalente al de hoy.
- Manifest, iconos y `registerType: "autoUpdate"` intactos.

## Auth & security

- RLS de 09 sigue siendo la autorización: el snapshot solo puede contener lo
  que la red devolvió para `auth.uid()`. El guard `offlineSession` es UX; sin
  red no hay peticiones, y con red cada petición vuelve a pasar por RLS.
- El snapshot vive en claro en `localStorage` del dispositivo, igual que la
  sesión de supabase-js; es el plan de dieta del único usuario del teléfono.
  Se borra al cerrar sesión (R21) y cuando la red responde "sin plan" (R4).
- **Cero escrituras a Supabase**; `services/diet.ts` intacto (inspección de
  fuente de 10 sigue aplicando). Sin service key, sin env vars nuevas.

## Validation

No hay entrada del usuario nueva. Robustez de datos: `isDietSnapshot` rechaza
snapshots sin versión/forma; los componentes de 10/11 toleran campos nulos.
`formatSavedAt` devuelve `null` con ISO inválido y el banner degrada a texto
sin fecha (R13).

## Test approach

**Unit — `src/lib/dietCache.test.ts`** (≥ 90 % líneas; `localStorage.clear()`
en `beforeEach`):
- vacío → `null` (R1); JSON inválido → `null`; `v: 2` → `null`; forma inválida
  (`plan` sin arrays / `plan.id` no string / `savedAt` ausente) → `null`;
  getter de `localStorage` que lanza (`Object.defineProperty(globalThis,
  "localStorage", { get() { throw … }, configurable: true })`) → read `null`
  y write no lanza (R2, R5); `setItem` que lanza `QuotaExceededError` → no
  lanza (R5).
- round-trip: `writeDietSnapshot(plan, new Date("2026-09-10T15:15:00Z"))` →
  `readDietSnapshot()` `toEqual({ v: 1, plan, savedAt: "2026-09-10T15:15:00.000Z" })`;
  los `id` de `diet_checklist_items` y el orden de las hijas se conservan
  (R3, R14).
- `writeDietSnapshot(null)` tras un write → clave ausente y read `null` (R4).
- `formatSavedAt("2026-09-10T15:15:00Z")` cumple `/^10 sept? 09:15$/`
  (tolerante a la abreviatura ICU "sep"/"sept"); `"2026-09-11T05:59:00Z"` →
  `10 … 23:59` (no cambia de día); `"no-es-fecha"` → `null` (R13).

**Hook — `src/hooks/useDietPlan.test.tsx`** (`renderHook`; `@/services/diet`
mockeado como en `usePlanDay.test.tsx`; `dietCache` real sobre el
`localStorage` de jsdom, sembrado/leído directamente para afirmar la
persistencia):
1. sin snapshot + OK(plan) → `loading: true` → plan, `isStale: false`, clave
   escrita (R7, R8).
2. sin snapshot + OK(null) → `plan: null`, sin error, sin clave (R8, R4).
3. con snapshot + OK(plan distinto) → **primer render** ya con `plan =
   snapshot`, `loading: false`, `isStale: false`; tras resolver, `plan` nuevo y
   clave reescrita con el `id` nuevo; el service se llamó **una** vez (R6, R8).
4. con snapshot + OK(null) → `plan: null` y clave borrada (R8, R4).
5. con snapshot + error → `plan = snapshot`, `isStale: true`, `savedAt` del
   snapshot, `error: null` (R9).
6. sin snapshot + error → `error: DIET_ERROR_LOAD`; `retry()` → `loading:
   true` → OK → `fresh`; el service se llamó dos veces (R10).
7. `online`: en `stale`, `window.dispatchEvent(new Event("online"))` →
   segunda llamada → OK → `isStale: false`; variante que vuelve a fallar →
   sigue `stale`; en `fresh` el evento **no** relanza (spy en
   `getActiveDietPlan` sigue en 1); `unmount` → `removeEventListener("online")`
   llamado (spy) (R11).

**Component (RTL):**
- `OfflineBanner.test.tsx`: `role="status"`, texto exacto con fecha; con ISO
  inválido, texto "…en este dispositivo" (R12, R13).
- `DietScreen.test.tsx` (ampliar el de 10; hooks mockeados): `isStale: true,
  savedAt` → banner presente, situado **después del `<h1>` y antes del
  `<dl>` de macros** (`compareDocumentPosition`), y todo el plan renderizado
  (macros, comidas, suplementos, secciones, listas de 11); `isStale: false` →
  `queryByText(/Sin conexión/)` es `null` (R12).
- `useSession.test.tsx` (ampliar el de 02): `getSession` resuelve
  `{ data: { session: null }, error: new AuthRetryableFetchError("Failed to fetch", 0) }`
  → `offlineSession: true`, `session: null`, `loading: false`; después
  `INITIAL_SESSION` con `null` **no** cambia nada; `TOKEN_REFRESHED` con
  sesión → `session` fijada y `offlineSession: false`; `SIGNED_OUT` →
  `null`/`false`; `getSession` con error **no** retryable (`new AuthError("x")`)
  → `session: null`, `offlineSession: false`; los tests existentes siguen
  verdes (R18, R20).
- `ProtectedRoute.test.tsx` (ampliar): `session: null, offlineSession: true`
  → hijos + "Cerrar sesión" + nav visibles, sin "pantalla de login";
  `offlineSession: false` → redirige (existente) (R19).
- `services/auth.test.ts` (ampliar): `signOut()` llama `writeDietSnapshot(null)`
  (mock de `@/lib/dietCache`) (R21).

**E2E — `e2e/diet-offline.spec.ts`** (Playwright contra `pnpm preview`, como
`e2e/pwa.spec.ts`: `playwright.config.ts` levanta `webServer: "pnpm preview"`
en `:4173`, por lo que exige `pnpm build` previo — `./init.sh` full lo hace y
luego `./init.sh e2e` corre `pnpm test:e2e`; el SW solo existe en esa build):

- **Test 1 (sin credenciales): precache del chunk de Dieta (R16).**
  `page.goto("/login")`, sondear `navigator.serviceWorker.ready` hasta
  `"activated"` (patrón de `pwa.spec.ts:38-54`), luego `page.evaluate`: para
  cada `caches.keys()` que empiece por `workbox-precache`, `cache.keys()` →
  afirmar que alguna URL cumple `/\/assets\/DietScreen-[\w-]+\.js$/`.
- **Test 2 (criterio 7 completo; `test.skip(MISSING_CREDENTIALS, …)`):**
  1. `login(page)`; clic en la pestaña "Dieta"; esperar resolución con hasta
     3 "Reintentar" (patrón `waitForToday`, adaptado a
     `<dl>` de macros | "Aún no tienes un plan de dieta asignado" | "Reintentar").
  2. Si se ve el vacío → `test.skip(true, "Sin plan de dieta activo — el
     criterio 7 requiere un plan; se omite")` (skip explícito, no fallo).
  3. Capturar en línea: nombre del plan, nº de `<article>` de comidas, nº de
     renglones tachables (localizador que defina 11, p. ej.
     `getByRole("checkbox")` dentro de las secciones de meal prep y súper),
     presencia de "Suplementos" y de las secciones; afirmar que **no** hay
     `role="status"` con "Sin conexión".
  4. `await page.context().setOffline(true)` **y**
     `page.context().route("**/*.supabase.co/**", (r) => r.abort("internetdisconnected"))`
     (cinturón y tirantes: `setOffline` corta la red del page target;
     el `route` garantiza que también fallen las peticiones que pudiera
     originar el SW, que Playwright sí intercepta — ver comentario de
     `pwa.spec.ts:7-12`).
  5. `page.reload()` → URL sigue en `/dieta`, `<h1>Dieta</h1>` visible
     (shell + chunk desde el precache, R16), banner `role="status"` con texto
     `/^Sin conexión · plan guardado el .+$/` visible **debajo** del h1 (R12),
     `<dl>` con 4 `<dt>` (macros), mismo nombre de plan, mismo nº de comidas,
     "Suplementos" y secciones presentes, mismo nº de renglones tachables (R9,
     R12, R14).
  6. Tocar el primer renglón tachable → queda marcado (aserción según 11:
     `aria-checked="true"` o clase `line-through`); `page.reload()` **aún sin
     red** → sigue marcado; "Desmarcar todo" → limpio (R14).
  7. `setOffline(false)` + `unroute`; clic "Hoy" y de nuevo "Dieta" (remonta
     el hook) → el banner desaparece y el `<dl>` sigue visible (R8 tras R9).
  8. Recolectar `pageerror` durante todo el test → lista vacía.
- **Test 3 (open item A; `test.skip` sin credenciales): token caducado sin
  red no expulsa (R18, R19).** `login` → "Dieta" → esperar resolución →
  en `page.evaluate` localizar la clave `sb-*-auth-token` de `localStorage`
  (como `e2e/helpers.ts:59-81`), parsear y reescribir con
  `expires_at = Math.floor(Date.now()/1000) - 60` → `setOffline(true)` +
  `route` abort → `page.reload()` → `expect(page).toHaveURL(/\/dieta$/)` y
  `<h1>Dieta</h1>` visible (no `/login`); si había plan, banner visible.
  Errores de consola tolerados: los que contengan `AuthRetryableFetchError`,
  `Failed to fetch` o `Failed to load resource` (los emite auth-js/el
  navegador, no la app). No se afirma la recuperación por `TOKEN_REFRESHED`
  en E2E (ticker de 30 s + cooldown de 60 s): la cubre el unit de
  `useSession`. El contexto de Playwright es efímero: no hay que restaurar el
  token; el refresh real al volver la red solo rota tokens de la sesión del
  propio usuario E2E y no escribe en ninguna tabla.
- Los tres tests son **de solo lectura** sobre Supabase (no usan
  `snapshotLogs`/`deleteCreatedLogs`).

**Coverage:** ≥ 90 % líneas en `src/lib/dietCache.ts`; ≥ 80 % en
`src/hooks/useDietPlan.ts`, `src/components/OfflineBanner.tsx`,
`src/screens/DietScreen.tsx`, `src/hooks/useSession.tsx`,
`src/components/ProtectedRoute.tsx`, `src/services/auth.ts`; umbral global del
repo (80 %) intacto.

## Open items / discrepancies

- **A. Sesión sin red (toca 02_auth):** hoy expulsa a `/login` con token
  caducado y sin red (evidencia línea a línea arriba). Cambio mínimo:
  `offlineSession` en `SessionProvider` (detectado con
  `isAuthRetryableFetchError`, ignorando `INITIAL_SESSION`) + guard en
  `ProtectedRoute`. Requiere aprobación explícita; sin él, R18–R20 y el test
  E2E 3 se retiran y el criterio 7 queda limitado a la primera hora tras el
  último refresh.
- **B. `signOut` borra el snapshot** (`services/auth.ts`, R21). Recomendado.
- **C. `readDietSnapshot()` devuelve `DietSnapshot | null` con `plan` no
  nulo** (precisión sobre la firma pedida): "sin plan" = clave ausente.
- **D. Reintento al evento `online`** incluido (R11); sin polling ni
  `visibilitychange`.
- **Sin cambios al contrato entre repos**, al SW, a `.env.example` ni a
  `package.json`.
