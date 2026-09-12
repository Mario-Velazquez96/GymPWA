# Session history (append-only)

## 2026-07-19 — 00_project_setup: implemented, reviewed, DONE

Bootstrapped the app at the repo root: Vite 8 + React 19 + TS 5.9 strict with
`@/` alias; Tailwind v4 (`@tailwindcss/vite`); React Router 7 with the 4 routes
(`/login`, `/`, `/ejercicio/:planExerciseId`, `/historial/:exerciseId`) as
Spanish placeholder screens; `src/lib/supabase.ts` singleton (only
`createClient`, exports `supabase | null` + `isConfigured`) with the
`<ConfigError />` missing-env screen (`/login` renders unguarded); vite-plugin-pwa
autoUpdate with manifest stub "Rutinas Gym" (build emits
`dist/manifest.webmanifest` + `sw.js` + `registerSW.js`); ESLint 10 flat +
Prettier; `.env.example` (two `VITE_` vars) with `.env.local` gitignored;
`vercel.json` SPA rewrite (Vercel-only). Tests: 14 Vitest+RTL (coverage 100%
lines, `src/lib/` 100%) + 1 Playwright smoke on `/login` vs `pnpm preview`.
Gates: `./init.sh` and `./init.sh e2e` both exit 0 — no Supabase credentials
needed. Reviewer: **APPROVE** (`progress/review_00_project_setup.md`).
Details: `progress/impl_00_project_setup.md`.

## 2026-07-19 — 01_supabase_schema_and_rls: implemented, reviewed, DONE

Authored `supabase/migrations/001_schema.sql` (5 tables + `workout_logs` index
verbatim from solution_design §3.1–3.5, + the 3 check constraints) and
`002_rls.sql` (RLS enabled on all 5 tables + 8 policies: 4 read-only selects,
4 `workout_logs` CRUD scoped to `auth.uid()`), plus `supabase/README.md` and
`scripts/check-rls.mjs` (plain Node, no new deps, reads `.env.local`, never
prints values). The **human applied 001 then 002** to the live Supabase project
via the SQL Editor. Verification all green: `node scripts/check-rls.mjs` →
anon-without-session gets 0 rows on all 5 tables (R7) and a spoofed-`user_id`
insert into `workout_logs` is rejected by RLS (R8); contract check via REST
probes → 42/42 columns and all 24 non-text types match §3, and the 3 R2 check
constraints fire with `23514` (information_schema/OpenAPI need the secret key,
absent here by design). `./init.sh quick` green (no TS changes). Reviewer:
**APPROVE** after one trivial doc fix (policy count "nueve" → "ocho";
comment-only in `002_rls.sql`, nothing re-applied)
(`progress/review_01_supabase_schema_and_rls.md`).
**Cross-repo pending:** re-run `node scripts/check-rls.mjs` after the `Gym`
repo seeds `exercises` — the own-`user_id` insert check (c) is currently SKIP
by design (FK on `exercise_id` blocks inserts against an empty catalog).
Details: `progress/impl_01_supabase_schema_and_rls.md`.

## 2026-07-19 — 02_auth: implemented, reviewed, DONE

Real email/password login against the live Supabase project: `services/auth.ts`
(`signIn`/`signOut` with Spanish error mapping — `invalid_credentials` →
"Correo o contraseña incorrectos", anything else → "Error de conexión,
reintenta"; details via dev-gated `console.debug` only), `hooks/useSession.tsx`
(`SessionProvider` over `getSession` + `onAuthStateChange`, persistent session
across reloads), `ProtectedRoute`/`PublicOnly` guards wired for all routes in
`App.tsx` (loading spinner, no redirect flash; missing-env `ConfigError`
contract from 00 preserved), real `LoginScreen` (labeled inputs, `min-h-11`
targets, disabled + "Entrando…" while pending, inline Spanish error), and an
app-shell header with "Cerrar sesión" on every protected screen.
`playwright.config.ts` loads `E2E_*` from `.env.local` via
`process.loadEnvFile` (no new deps). Gates: `./init.sh` and `./init.sh e2e`
both green — E2E includes the **real-credential round trip** (redirect to
/login, sign-in, reload keeps session, authenticated /login → /, sign-out,
wrong-password error) plus a verified clean skip when `E2E_*` are unset.
Coverage: **100% lines on `services/auth.ts` and `hooks/useSession.tsx`**
(45 Vitest tests, global 94.7% lines). Reviewer: **APPROVE**
(`progress/review_02_auth.md`). Details: `progress/impl_02_auth.md`.

## 2026-07-19 — 03_today_view: implemented, reviewed, DONE

Real "Hoy" screen replacing the placeholder: loads the active plan and shows
the `plan_day` matching the **device-local** date (`todayLocalISO()`, never
UTC; header "lun 3 ago" via es-MX `Intl.formatToParts`), with ‹ › day
navigation clamped to the plan's `start_date`–`end_date` (arrows disabled at
the edges) and the four Spanish body states — ordered exercise list (thumbnail
56px, name, "4 × 8-12", card → `/ejercicio/{plan_exercise.id}`), "Día de
descanso 💤", "Sin rutina asignada para este día", "Sin plan activo" — plus
loading and error + "Reintentar". New layer: `lib/types.ts` (row types
mirroring `001_schema.sql`), `lib/utils.ts` (date helpers incl. timezone-edge
tests), `services/plans.ts` (`getActivePlan`/`getPlanDay`/`getDayExercises`
with the `Result<T>` Spanish-error pattern; the only `supabase.from` in the
app), `hooks/usePlanDay.ts` (composes the 3 calls per date, early-exits,
`retry`), `components/ExerciseCard.tsx`. Read-only — zero writes, zero
migrations, zero new deps/env vars. The **human applied
`e2e/fixtures/test-plan.sql` live** (idempotent, `current_date`-relative plan
±3, placeholder exercises '0001'–'0003' with `ON CONFLICT DO NOTHING`).
Gates: `./init.sh` and `./init.sh e2e` green — **98 tests / 14 files**;
coverage 100% lines on `services/plans.ts` + `lib/utils.ts`, 88.4% on
`hooks/usePlanDay.ts` (global 95.3%); dual-path E2E `today.spec.ts` verified
on the **seeded path** against the live DB (day title, 3 ordered exercises,
tomorrow rest day, +2/+3 unassigned, › pinned at `end_date`). Reviewer:
**APPROVE** (`progress/review_03_today_view.md`). Details:
`progress/impl_03_today_view.md`.

## 2026-07-19 — 04_exercise_detail: implemented, reviewed, DONE

Real exercise detail screen replacing the placeholder (RF-3, read-only): from
a "Hoy" card, `/ejercicio/:planExerciseId` loads the joined detail via the new
`services/exercises.ts#getPlanExerciseDetail` (`plan_exercises` +
`exercises(*)`, `maybeSingle`, `Result<T>` Spanish-error pattern; `null`
covers nonexistent ids, RLS-filtered rows **and** non-uuid junk ids via
`22P02` → same "Ejercicio no encontrado" path). UI: `ExerciseMedia` (GIF over
the `image_url` thumbnail in a fixed `aspect-square max-w-[240px]` box —
opacity swap on load, graceful degradation to a solid placeholder when the
media 404s, no layout shift, no infinite spinner; alt "Demostración de
{name}"), ordered Spanish steps (`InstructionSteps` `<ol>` from
`instruction_steps_es`), targets "4 × 8-12 · Descanso: N s" (rest line only
when present), equipment/target chips, notes callout when present, visible
"© Gym visual — https://gymvisual.com/" attribution link, header back control
(≥ 44px) to Hoy, and loading / error + "Reintentar" / not-found + "Volver a
Hoy" states. New type `PlanExerciseDetail`; zero writes, zero migrations,
zero new deps/env vars. Gates: `./init.sh` and `./init.sh e2e` green —
**126 tests / 18 files**, coverage **100% lines on `services/exercises.ts`
and `screens/ExerciseScreen.tsx`** (global 97.0%); new `e2e/exercise.spec.ts`
verified the **fixture path against the live DB** (Hoy → first card → detail
with degraded placeholder media → back to Hoy), with clean skips when
credentials or the fixture plan are absent. Reviewer: **APPROVE**
(`progress/review_04_exercise_detail.md`). Details:
`progress/impl_04_exercise_detail.md`.

## 2026-07-19 — 05_workout_logging: implemented, reviewed, DONE

The app's core write slice (RF-4/RF-5): "Registro de series" section mounted
on the exercise screen. New `services/logs.ts` — the **only** writer in the
app, writing **only** `workout_logs`: `getPreviousSession` (max-`performed_at`
client filter over `.lt` + double order + limit 10), `getSessionSets` (today's
saved sets), `logSet` (one confirmed insert per set with the live session's
`user_id` and **device-local** `performed_at` via `todayLocalISO()`, never the
DB default). Pure helpers in `lib/logging.ts`: `validateSet` (weight ≥ 0 in
0.5-kg steps, integer reps ≥ 1, Spanish message per violation), the prefill
chain `resolvePrefill` (previous-session set *n* → current UI row *n−1* →
weight 0 + first number of `target_reps`, fallback 10 — as the human resolved
2026-07-18), and `buildInitialRows` (today's saved rows ++ editable rows up to
`target_sets`). UI: `Stepper` (±2.5 kg / ±1 rep, min clamp, ≥ 44px targets,
tap-to-type `inputmode="decimal"` committing on blur/Enter), `SetRow` with the
`editable → saving(disabled) → saved(✓) | error(values intact + "No se pudo
guardar la serie, reintenta")` state machine and the "Anterior: 22.5 × 10 | —"
column, `LoggingSection` + `useWorkoutLog` (parallel load, retry, "Agregar
serie", and a synchronous in-flight ref guard so a double tap can never
double-insert). Same-day reopen renders saved sets as ✓ rows. Zero migrations,
zero new deps/env vars. Gates: `./init.sh` and `./init.sh e2e` green —
**218 tests / 23 files**, coverage **100% lines on `services/logs.ts` and
`lib/logging.ts`** (global 97.0%); new `e2e/logging.spec.ts` ran against the
live DB (**real writes**, approved): saved 2 sets for fixture exercise '0001'
adjusting weight with the steppers, reload showed both as ✓ with persisted
values, then deleted its rows via the authenticated Supabase REST API inside
the spec (the app services have no delete, by design), with clean skips when
credentials or the fixture plan are absent. Reviewer: **APPROVE**
(`progress/review_05_workout_logging.md`). Details:
`progress/impl_05_workout_logging.md`.

## 2026-07-20 — 06_history: implemented, reviewed, DONE

Per-exercise history screen (RF-5, read-only) at `/historial/:exerciseId`:
sessions grouped by `performed_at` **newest-first**, each rendered as a
`SessionCard` with a Spanish date header incl. year ("lun 3 ago 2026") and rows
"Serie N — X kg × Y"; states loading / error + "Reintentar" / empty ("Aún no
hay registros de este ejercicio", header still rendered) / not-found
("Ejercicio no encontrado" + "Volver a Hoy"). Added a "Ver historial" link
(≥ 44px) on the exercise screen pointing to `/historial/{exercise.id}` (the
embedded `exercises.id`, not the `plan_exercise.id`). Extended existing services
(no new `supabase.from` surfaces beyond the read): `services/logs.ts#getExerciseHistory`
(`workout_logs` by `exercise_id`, `performed_at` desc + `set_number` asc,
RLS-scoped) and `services/exercises.ts#getExercise` (`exercises` by id via
`maybeSingle` → `Exercise | null` for title + not-found). New pure helpers in
`lib/utils.ts`: `groupByDate` (Map-based, preserves newest-first order) and
`formatKg` ("22 kg" / "22.5 kg"), plus a `{ year: true }` option on
`formatDateEs` (default output unchanged). Zero writes beyond the existing
logging path, zero migrations, zero new deps/env vars. Gates: `./init.sh` and
`./init.sh e2e` green — **252 tests / 25 files**, coverage **100% lines on
`lib/utils.ts`, `services/logs.ts`, `services/exercises.ts`, and
`screens/HistoryScreen.tsx`** (global 97.8%); **8/8 E2E** incl. new
`e2e/history.spec.ts` (happy path against the live DB: log a set → "Ver
historial" → assert "X kg × Y" → self-cleanup via authenticated REST; plus the
bogus-id not-found path). Two **test-infra** fixes along the way (no app code
changed, no test weakened): (1) re-anchored the shared `e2e/fixtures/test-plan.sql`
on the **device-local (America/Mexico_City)** date —
`v_today := (now() at time zone 'America/Mexico_City')::date` with all
`start/end/day_date` derived from it — because Postgres `current_date` (UTC)
drifts vs the app's `todayLocalISO()` and misaligned "today" (human re-applied
it once; still idempotent); (2) isolated the history E2E on fixture exercise
**'0002'** so its parallel writes/deletes never collide with the 05 spec that
owns '0001'. Reviewer: **APPROVE** (`progress/review_06_history.md`). Details:
`progress/impl_06_history.md`.

## 2026-07-20 — 07_pwa_install_and_cache: implemented, reviewed, DONE (last feature)

PWA polish over the `00` `vite-plugin-pwa` scaffold — no app-logic, service,
SQL, or auth changes. **Manifest** completed in `vite.config.ts`: `name`
"Rutinas Gym", `short_name` "Rutinas", `lang` "es", `display` "standalone",
`start_url` "/", `theme_color`/`background_color` `#0f172a`, and a 192/512/
512-maskable `icons` array (R1); `registerType: 'autoUpdate'` kept (R6).
**Icons** generated from one source SVG (white dumbbell on dark blue `#0f172a`)
by `scripts/generate-icons.mjs` — a **no-new-dependency** rasterizer using only
Node built-ins (`zlib`/`fs`, 4x4 supersampling); outputs committed to `public/`:
`apple-touch-icon.png` (180), `pwa-192x192.png`, `pwa-512x512.png`,
`pwa-maskable-512x512.png` (maskable = full-bleed bg, glyph at 72% for the safe
zone). **index.html**: `apple-touch-icon` link + iOS meta
(`apple-mobile-web-app-capable`, `-status-bar-style` black-translucent,
`-title` "Rutinas") (R2). **Workbox**: `globPatterns`
(js/css/html/svg/png/woff2) precache the shell + `navigateFallback:
'/index.html'` (R3); **one** `runtimeCaching` CacheFirst rule
(`cacheName: 'exercise-media'`, `maxEntries: 100`, `maxAgeSeconds: 30d`) whose
`urlPattern` matches only `*.supabase.co` + path `/storage/` (R4, R7) — **no rule
matches `/rest/` or `/auth/`, verified absent in the built `dist/sw.js`** so plan
data and logs stay network-only (R5). **README.md** (new, repo root): Spanish
iPhone install section (Safari → Compartir → "Agregar a pantalla de inicio") +
HTTPS/Vercel note, local-run steps, env vars. New `e2e/pwa.spec.ts` (3 specs vs
`pnpm preview`): SW `activated` + manifest link/fields (R1/R3); a Storage URL
fetched twice lands in the `exercise-media` cache via real SW-request
interception with `context.route` + a synthetic 200 (deterministic, not a mock)
(R4/R7); a `/rest/` response is absent from every cache (R5). Build-manifest
assertion folded into e2e (unit tests run before build in `init.sh`, so reading
`dist/` from Vitest would be non-deterministic). Zero migrations, zero new deps,
zero new env vars. Gates: `./init.sh` and `./init.sh e2e` green — **11/11 e2e**,
`dist/` emits `sw.js` + `workbox-*.js` + `manifest.webmanifest` (all R1 fields) +
the 4 PNGs. Reviewer: **APPROVE** (`progress/review_07_pwa_install_and_cache.md`).
Details: `progress/impl_07_pwa_install_and_cache.md`.
**HUMAN-verify (not auto-verifiable):** the iPhone PWA checklist — install to
home screen, standalone open, correct icon, airplane-mode shell + cached GIF,
Lighthouse "installable" — see the checklist in
`progress/impl_07_pwa_install_and_cache.md`.

---

### Project milestone: all 8 SDD features (00–07) DONE.

Remaining open items (none block the build; all are external/human):
- (a) **Human iPhone PWA checklist** above — requires a real iPhone + HTTPS deploy.
- (b) **Cross-repo seed:** the `Gym` repo must seed the `exercises` catalog +
  media and upload a real plan. Until then the app runs on the
  `e2e/fixtures/test-plan.sql` 'Plan de prueba E2E' fixture with placeholder media.
- (c) **RLS own-insert check:** re-run `node scripts/check-rls.mjs` after (b) to
  complete the own-`user_id` insert check (currently SKIP — FK on `exercise_id`
  against an empty catalog).

---

## 2026-08-31 — 08_weight_units: implemented, reviewed, DONE

Per-exercise **kg/lb** preference so the dumbbells and machines marked in pounds
stop needing mental arithmetic between sets. New pure module `src/lib/units.ts`
(`WeightUnit`, exact `LB_IN_KG = 0.45359237`, `WEIGHT_STEP` kg 2.5 / lb 5,
`WEIGHT_GRAIN` kg 0.5 / lb 0.1, `toKg`/`fromKg`/`quantize`/`formatWeight`/
`validateWeight`, plus `readExerciseUnit`/`writeExerciseUnit` with **every**
`localStorage` access in `try/catch` → degrades to kg, writes fail silently);
new `useExerciseUnit(exerciseId)` hook (lazy init, re-reads on id change, state
adjusted during render — ESLint 10 forbids `setState` in an effect) and new
`UnitToggle` (role=group "Unidad de peso", `aria-pressed`, ≥44px) rendered next
to "Registro de series". `SetRow` shows `fromKg(row.weight_kg, unit)` with
`step = WEIGHT_STEP[unit]` and returns `toKg(quantize(v, unit), unit)`, so the
row state and the insert payload **stay in kilograms**; "Anterior", saved rows,
`SessionCard` and `HistoryScreen` (read-only, **no toggle of its own**) all
render through `formatWeight`. `validateSet(values, unit = "kg")` now validates
the weight **in the unit it was typed in** — 45 lb = 20.41 kg saves fine, the
0.5-kg rule is not applied in lb mode — and `lib/utils.ts#formatKg` was removed
once it had no production callers. Rounding is round-trip stable: entry
`round2(lb × 0.45359237)`, display `round1(kg ÷ 0.45359237)`, asserted over the
whole 0.1-lb grid from 0 to 320 lb, so "45 lb" never becomes "45.0001 lb".
**Zero SQL migrations, zero RLS changes, zero new columns, zero new deps/env
vars, no service-worker change:** `workout_logs.weight_kg` keeps meaning
kilograms, so the `Gym`-repo contract (solution_design §3.5) is untouched — a
set logged as 45 lb is stored as 20.41. Gates: `./init.sh` green (404 tests /
28 files; `units.ts`, `useExerciseUnit.ts`, `UnitToggle.tsx`, `logging.ts` at
100% lines, global 98%) and `./init.sh e2e` green **12/12** against the live
project. Reviewer: **APPROVE** (`progress/review_08_weight_units.md`) with
live-data evidence: 154 `workout_logs` before and after, 0 rows carrying the
test signature, the real plan untouched. Details:
`progress/impl_08_weight_units.md`.

### Durable note — E2E safety against LIVE data (introduced here, applies to every future feature)

The database stopped being a test database mid-feature: the `Gym` repo seeded
the real 1324-exercise catalog with real Storage media, a **real plan is active**
("Recomposición en casa — Septiembre 2026", 2026-08-29 → 2026-09-27) and the
user has ~154 real `workout_logs`. The old E2E pattern (hardcoded fixture
exercises `'0001'`/`'0002'` + `DELETE workout_logs?exercise_id=eq.<id>&
performed_at=eq.<today>`) would have written test sets into the user's real
exercise of the day and deleted rows he logged himself. It was replaced by
`e2e/helpers.ts`:

- **ID-precise cleanup.** `snapshotLogs()` photographs the existing row ids for
  (exercise, date) before writing; `deleteCreatedLogs()` in an `afterEach` (so it
  runs even when an assertion fails mid-test) deletes **only the ids that
  appeared afterwards** via `?id=in.(…)`. Never a delete filtered by
  exercise/date. A safety cap aborts without deleting anything if more new rows
  show up than a spec can create.
- **Plan-agnostic targets.** The exercise is derived from the DOM (n-th card of
  Hoy → `exercise_id` read off the "Ver historial" link): 05 uses the 1st, 06 the
  2nd, 08 the 3rd, so parallel runs never collide. 03 and 04 were made
  plan-agnostic too (they asserted fixture literals that no longer exist).
- **Robust to real history.** "Anterior" may legitimately show real values and
  the History screen already holds real sessions, so specs assert the set they
  just created, never emptiness or list length. If the user already completed
  today's sets, the spec uses the app's own "Agregar serie" to get a working row
  (new `set_number`, deleted afterwards by id).
- **`e2e/fixtures/test-plan.sql` is now LEGACY** and carries a ⛔ header: applying
  it while a real plan is active would create a **second** `status='active'` plan
  and the app could show the test plan instead of the user's real routine.

## 2026-08-31 — Cierre del pendiente cross-repo de 01_supabase_schema_and_rls

Con el catalogo ya sembrado por el repo `Gym` (1324 ejercicios), se re-ejecuto
`node scripts/check-rls.mjs` contra el proyecto en vivo: **todos los checks
PASARON**, incluido el (c) `insert con el user_id propio` que estaba en SKIP por
la FK contra un `exercises` vacio. Verificacion de seguridad de datos:
`workout_logs` = 154 filas antes y 154 despues (la limpieza del script borra por
`id=eq.<id>` exacto de la fila que inserta). Queda cerrada la ultima asercion
abierta de `01_supabase_schema_and_rls`; no quedan pendientes automatizables en
el repo — solo las verificaciones manuales en el iPhone (PWA de 07 y humo de
kg/lb de 08).

## 2026-09-10 — 09_diet_schema_and_rls: implemented, reviewed, DONE (migraciones pendientes de aplicar)

Primera de las cuatro features de **Dieta** (09 → 10 → 11 → 12), rebanadas del
nuevo `project-documents/client_requirement_dieta.md`. Solo capa de datos:
`supabase/migrations/003_diet_schema.sql` con las 5 tablas de §6 copiadas
**verbatim** (`diet_plans`, `diet_meals`, `diet_checklist_items` con `kind`
meal_prep|super, `diet_supplements`, `diet_sections` con `kind`
reglas|rotacion|libre; `unique (diet_plan_id, …)` y `on delete cascade` tal
cual) más el índice único parcial `diet_plans_one_active_per_user on diet_plans
(user_id) where status = 'active'`; `004_diet_rls.sql` con RLS en las 5 tablas y
exactamente 5 policies `select to authenticated` (padre por `user_id =
auth.uid()`, hijas vía `exists` a `diet_plans`) y **cero policies de
escritura**: la PWA solo lee, el repo `Gym` escribe con la service key. Tipos
`DietPlan`/`DietMeal`/`DietChecklistItem`/`DietSupplement`/`DietSection`
añadidos al final de `src/lib/types.ts` (adición pura) con
`src/lib/types.test.ts` (13 tests: conteo de columnas 14/9/7/8/6, `expectTypeOf`
por columna, 3 `@ts-expect-error` que `tsc` valida). `scripts/check-rls.mjs`
extendido: check (a) itera 10 tablas, `missingTableMsg` apunta a 003/004 para
`diet_*`, y nuevos checks (d) insert propio en `diet_plans` → 42501, (e) insert
en `diet_meals` → 42501 y no 23503, (f) select autenticado ×5 → 200 + array;
ningún probe de dieta puede crear una fila. Docs: anexo `### 3.7 Tablas de
dieta` en `solution_design.md` (**tercer contrato entre repos**: `upload-diet.mjs`
del repo `Gym` debe construirse contra ese DDL y **archivar el plan anterior
antes de insertar**) y `supabase/README.md` (orden 003 → 004, checks d/e/f,
`pg_policies` = 13, query `pg_indexes`). **Sin deps, sin env vars, sin cambios en
`src/` fuera de `types.ts` + test; la app sigue escribiendo solo
`workout_logs`.** Open items resueltos por el humano con la opción recomendada
(índice parcial sí; sin índices extra en hijas; sin checks semánticos). Gates:
`./init.sh` verde (418 tests / 29 archivos, 98 % líneas). Reviewer: **APPROVE**
(`progress/review_09_diet_schema_and_rls.md`, 0 bloqueantes; reprodujo el
`diff` §6 vs 003 = IDENTICAL y la salida del script). Detalles:
`progress/impl_09_diet_schema_and_rls.md`.

**⏳ PENDIENTE EXPLÍCITO (humano): migraciones 003/004 NO aplicadas en vivo.**
Este repo no tiene service key ni Supabase CLI enlazada. Aplicar desde el SQL
Editor `003_diet_schema.sql` y luego `004_diet_rls.sql` (mismo mecanismo que
001/002) y re-correr `node scripts/check-rls.mjs` → debe salir con exit 0 y
PASS en (a) ×10, (b), (c), (d), (e), (f); luego `pg_policies` = 13,
`pg_indexes like 'diet_%'` con el índice parcial, contrato de columnas ×10
tablas, y marcar `[x]` las tareas 6.1–6.4 de `specs/09_diet_schema_and_rls/tasks.md`.
Hasta entonces el script termina con exit 1 reportando "la tabla no existe
(… pega 003_diet_schema.sql y luego 004_diet_rls.sql …)" para las 5 tablas
`diet_*` — comportamiento diseñado, no fallo de RLS; los checks de 01 siguen en
PASS. Avisar además al repo `Gym` del nuevo contrato §3.7.

Hallazgos menores del reviewer (no bloqueantes, opcionales):
1. `scripts/check-rls.mjs` check (e) reutiliza `FOREIGN_USER_ID` como
   `diet_plan_id` aleatorio; funciona pero el nombre confunde — un alias
   `RANDOM_PLAN_ID` o un comentario lo aclararía.
2. El check (f) solo prueba 200 + array con un único usuario E2E; la parte
   "solo filas propias" de R11 queda cubierta por el check (a) (anon → 0 filas)
   y por la policy inspeccionada. No leerlo como test de aislamiento entre
   usuarios.
3. `scripts/check-rls.mjs` sigue con comillas simples (no conforme a Prettier
   desde 01); se dejó a propósito para no reescribir líneas ajenas. Si se
   formatea, hacerlo en un commit aparte.
4. `progress/current.md` tenía dos fragmentos sueltos tras la edición del
   leader (la línea de nombres bajo "Feature in progress" y "(status →
   `in_progress`, …) o pedir cambios a `spec_author`." en "Notes / blockers");
   el primero se limpió al cerrar 09, el segundo se conserva tal cual por
   instrucción del leader de no tocar esa sección.

## 2026-09-11 — 10_diet_screen: implemented, reviewed (REJECT → fix → APPROVE), DONE

Segunda rebanada de **Dieta** y primera **navegación principal** de la app.
Pantalla `/dieta` de **solo lectura** montada sobre las tablas de 09: `<h1>Dieta</h1>`
→ `MacroSummary` (`<dl>` de 4 columnas: Calorías/Proteína/Carbohidrato/Grasa con
"kcal"/"g", visible sin scroll en 390×844) → `EatingWindow` (ventana
`HH:MM–HH:MM` y su estado ahora mismo: "faltan 60 min para Desayuno fuerte
(10:00)" / "Dentro de la ventana · siguiente: …" / "Ventana cerrada · próxima
comida mañana a las 10:00 (…)" / "Este plan no tiene ventana de ayuno") →
"Comidas" (`MealCard` por comida en orden de `position`, partes nulas omitidas
sin separadores huérfanos) → "Suplementos" (`SupplementList` en grupos
"Recomendados" / "No vale la pena" con marca + `aria-label`) → "Más del plan"
(`CollapsibleSection` = `<details>` cerrado por defecto con `Markdown`).
`services/diet.ts#getActiveDietPlan()` hace **una** consulta anidada
(`select("*, diet_meals(*), diet_checklist_items(*), diet_supplements(*),
diet_sections(*)").eq("status","active").limit(1)`), ordena las cuatro hijas por
`position` en el cliente y devuelve `DIET_ERROR_LOAD` ("No se pudo cargar la
dieta") ante error/excepción/cliente nulo; **cero escrituras** (la app sigue
escribiendo solo `workout_logs`). Lógica pura en `src/lib/diet.ts`
(`nowLocalHM` con `Intl` + zona fija `America/Mexico_City` y `hourCycle "h23"`,
`parseHM`, `formatHora`, `formatMinutes`, `sortByPosition`, `getWindowState`
como función pura que recibe los minutos). Hooks `useDietPlan` (loading / vacío
/ error + `retry`) y `useNowMinutes` (recalcula cada 60 s **sin** reconsultar
Supabase). Navegación: `BottomNav` fija abajo con dos pestañas Hoy | Dieta
(≥ 44px, `aria-current="page"`, `pb-[env(safe-area-inset-bottom)]`), montada una
sola vez en `ProtectedRoute`; `viewport-fit=cover` en `index.html`; **único**
cambio en Today/Exercise/History: la clase `pb-24` del `<main>`. `/dieta` va
detrás de `ProtectedRoute` con `React.lazy` + `Suspense`, así que
`react-markdown@10.1.0` + `remark-gfm@4.0.1` (las **únicas** deps nuevas,
fijadas exactas, sin `rehype-raw` ni `dangerouslySetInnerHTML`) viajan en su
propio chunk: `DietScreen-*.js` 164.04 kB (49.36 kB gz), sin engordar el camino
del gym. Open items resueltos por el humano con la opción recomendada:
(A) barra inferior de dos pestañas, Historial no es pestaña; (B) react-markdown
+ remark-gfm; (C) zona horaria fija; (D) `rotacion` visible como colapsable
hasta que 11 la reubique. Sin env vars, sin migraciones, sin tocar el service
worker. Gates: `./init.sh` verde (42 archivos / 571 tests, 98.46 % stmts /
98.41 % líneas; módulos de la feature al 100 % salvo `EatingWindow.tsx` 93.33 %)
y `e2e/diet.spec.ts` 2/2. Detalles: `progress/impl_10_diet_screen.md`.

**Ronda de review.** El reviewer primero **RECHAZÓ** (`progress/review_10_diet_screen.md`):
`src/App.dieta.test.tsx` era **flaky** y tumbaba `./init.sh` antes del `build`
en ~50 % de las corridas. Causa raíz: `React.lazy` transformaba
`react-markdown` + `remark-gfm` (~164 kB) **dentro** del render, y bajo la
contención de la suite completa eso superaba el plazo por defecto de 1000 ms de
`findBy*`, que vencía con el fallback de `<Suspense>` montado. Arreglo de raíz
(sin reintentos ni `test.retry`): precargar el chunk con `await
import("@/screens/DietScreen")` en un `beforeAll`, de modo que el `lazy` resuelva
desde la caché de módulos. Verificado con **5 corridas completas de `./init.sh`
seguidas** (más 3 suites en paralelo con caché fría, para reproducir la
contención). También se cerraron los menores: caso nuevo que afirma que el tick
de 60 s **no** vuelve a llamar a `getActiveDietPlan` (la mitad "sin reconsultar"
de R10) y limpieza del reformateo ajeno en `TodayScreen.test.tsx` (su diff queda
en `+11`: solo el test añadido). Veredicto final: **APPROVE**, 0 bloqueantes.

**⏳ PENDIENTE (humano), bloqueado por 09:** mientras `003_diet_schema.sql` /
`004_diet_rls.sql` no estén aplicadas en vivo, `/dieta` resuelve —
correctamente — en su **estado de error con "Reintentar"**, y eso es lo que
ejercitó el E2E (anotación `estado observado en /dieta: error`). Queda por
verificar cuando existan las tablas y el repo `Gym` suba el plan:
1. **camino "plan activo" de `e2e/diet.spec.ts`** (macros en viewport, ventana,
   comidas, suplementos, secciones que abren sin `**` ni `|` crudos) — el spec
   ya está escrito y se bifurca solo; basta re-correrlo;
2. **checklist manual en el iPhone**: los cuatro macros sin scroll en 390×844,
   "faltan 60 min para Desayuno fuerte" a las 09:00 y "Ventana cerrada …" a las
   19:00, secciones con negritas/listas/tablas, y la barra inferior alcanzable
   con el pulgar y **sobre** el indicador de inicio en modo standalone.
Ajeno a 10 pero detectado al correr sus E2E: el bug de producción del prefill en
lb (`13_fix_lb_prefill_validation`, `pending`), documentado en
`progress/current.md`; no se tocó nada de 05 ni de 08.

## 2026-09-11 — 11_diet_checklists: implemented, reviewed (APPROVE), DONE

Tercera rebanada de **Dieta**: las dos listas **tachables** que Mario usa con las
manos ocupadas. Dentro de `/dieta`, entre "Suplementos" y "Más del plan",
aparecen ahora dos `CollapsibleSection` cerradas por defecto: **"Qué cocinar"**
(los `diet_checklist_items` de `kind='meal_prep'` en orden de `position`, y
**debajo** la sección `rotacion` del plan como bloque directo `<h3>` +
`Markdown`, que deja de listarse entre las colapsables genéricas del final) y
**"Lista de súper"** (los `kind='super'` **agrupados por `categoria`** en orden
de primera aparición, con un grupo final "Otros" para los que no la traen y sin
`<h3>` cuando ese es el único grupo). Cada renglón es **un solo**
`<button type="button" role="checkbox" aria-checked>` a ancho completo y
`min-h-11` — el toque acierta en cualquier punto de la fila, Enter/Space
funcionan nativos y el nombre accesible es "<item> · <cantidad>" (o solo
"<item>" si la cantidad es nula/blanca); marcado se ve con `line-through` +
texto atenuado. Cada lista lleva contador **"<n> de <m> marcados"**
(`aria-live="polite"`) y botón **"Desmarcar todo"** con `disabled` nativo
mientras ningún renglón **visible** esté marcado (un id viejo del
almacenamiento no lo habilita).

**El tachado es estado del dispositivo, no del plan** (client_requirement_dieta
§6): vive en `localStorage` bajo `gym:diet:check:<planId>:<kind>` como array
JSON de ids, con el mismo rigor que `lib/units.ts` de 08 — `try/catch` en el
propio getter de `globalThis.localStorage` (Safari privado con datos
bloqueados lanza ahí), en `getItem`/`JSON.parse` y en `setItem` (cuota); valor
ausente, JSON inválido o no-array → `Set` vacío, entradas no-string
descartadas, escritura best-effort que **nunca** propaga (con el storage
bloqueado se sigue tachando en memoria durante la sesión). Capas nuevas:
`src/lib/checklist.ts` (puro: `checklistStorageKey`, `readChecked`,
`writeChecked`, `selectChecklist`, `checklistLabel`, `groupByCategoria`,
`OTROS_LABEL`), `src/hooks/useChecklist.ts` (`{ checked, toggle, clearAll }`,
lectura perezosa, re-lectura **durante el render** al cambiar de plan, escritura
en el callback y nunca al montar ni dentro del updater) y los presentacionales
`Checklist.tsx` / `ChecklistItem.tsx`. **Cero escrituras a Supabase, cero
consultas nuevas** (`services/diet.ts` de 10 ya traía los
`diet_checklist_items`, y quedó byte-idéntico), **cero migraciones, cero
dependencias, cero env vars, cero cambios en el service worker**; la única
tabla que la app escribe sigue siendo `workout_logs`. Un plan nuevo (mes nuevo)
arranca con su propia clave y la del anterior no se toca ni se migra.
Open items resueltos por el humano con la opción recomendada: (A) rotación como
bloque directo dentro de "Qué cocinar"; (B) apertura de las listas **no**
persistida (estado nativo del `<details>`); (C) agrupación por igualdad exacta
tras `trim()` — sugerencia abierta al repo `Gym` de normalizar `categoria` en
`upload-diet.mjs`; (D) "Más del plan" se omite si no queda ninguna sección tras
excluir `rotacion`; (E) se mantiene el contador. El único archivo de 10 tocado
es `DietScreen.tsx` (+ su test).

Gates: **`./init.sh` verde en 4 corridas completas** (3 del implementer + 3 del
reviewer sobre el mismo código, más una tras aplicar los menores): 46 archivos /
668 tests, 98.56 % líneas globales y **100 % de líneas en los cinco módulos de
la feature** (`checklist.ts`, `useChecklist.ts`, `Checklist.tsx`,
`ChecklistItem.tsx`, `DietScreen.tsx`). Sin tests intermitentes: el flake de 10
no reapareció. Review: **APPROVE** con 0 bloqueantes y 6 menores
(`progress/review_11_diet_checklists.md`); se aplicaron los baratos — key de
grupo prefijada (`cat:<categoría>` vs. `otros`), `sortByPosition` reaplicado a
las secciones `rotacion` con test de dos rotaciones desordenadas, y la casilla
7.2 de `tasks.md` matizada con el resultado real de los E2E. Desviación
declarada del spec: `checklistLabel` vive en `lib/checklist.ts` y no en
`ChecklistItem.tsx` (exportar una función no-componente desde un archivo de
componente dispara `react-refresh/only-export-components`); y dos aserciones de
10 en `DietScreen.test.tsx` se actualizaron —una afirmaba lo contrario de 11 R9,
la otra solo cambió de selector—, ambas comentadas en el código. Detalles:
`progress/impl_11_diet_checklists.md`.

**⏳ PENDIENTE (humano), bloqueado por 09 igual que en 10:** mientras
`003_diet_schema.sql` / `004_diet_rls.sql` no estén aplicadas en el proyecto en
vivo, `/dieta` resuelve en su estado de error y **los dos tests nuevos de
`e2e/diet-checklists.spec.ts` se saltan** (verificado con `--reporter=json`:
`status: "skipped"`, anotaciones `estado observado en /dieta: error` y el
mensaje "…las tablas `diet_*` de 09 aún no están aplicadas en el proyecto en
vivo"). **No han llegado a ejecutarse nunca de verdad**: las 18 requirements
están cubiertas por Vitest, pero los criterios 4 y 5 del brief no se han visto
en un navegador real. Al aplicar las migraciones y subir un plan desde el repo
`Gym`, **volver a correr `npx playwright test e2e/diet-checklists.spec.ts`** (y
el camino "plan activo" de `e2e/diet.spec.ts`, pendiente de 10). Falta también
el checklist manual en el iPhone: tachar con el pulgar en la cocina y en el
súper, cerrar y reabrir la app → sigue tachado; "Desmarcar todo" limpia; en modo
avión se puede tachar; en Safari privado con datos bloqueados la app abre, se
tacha en sesión y no aparece ningún error. Ajenos a 11 y sin empeorar:
`e2e/logging.spec.ts` y `e2e/history.spec.ts` siguen rojos por
`13_fix_lb_prefill_validation`, y `e2e/today.spec.ts` falla por **rozar el
timeout de 30 s** (recorre el plan real día a día; pasa en 34.7 s con
`--timeout=180000`) — decisión pendiente del humano, nada que ver con 11.

## 2026-09-11 — 12_diet_offline: implemented, reviewed (APPROVE), DONE (cierra el lote de Dieta)

Cuarta y última feature del lote de Dieta. La sección Dieta queda **consultable
sin señal**: tras haberla abierto una vez con red, en modo avión se ve el plan
completo (macros, ventana, comidas, meal prep, súper, suplementos, secciones),
las listas se siguen tachando y la sesión persistida **ya no rebota a
`/login`**. Todo con un **snapshot a nivel app** en `localStorage`
(`gym:diet:snapshot`, `{ v: 1, plan, savedAt }`) y **sin cachear jamás la API de
Supabase en el service worker** (docs/architecture.md; `vite.config.ts` quedó
byte-idéntico y `e2e/pwa.spec.ts` R5 "/rest/ nunca se cachea" sigue verde).

Capas: `src/lib/dietCache.ts` (puro: `readDietSnapshot`, `writeDietSnapshot`
—`null` **borra** la clave—, `formatSavedAt`, validación estructural con
versión y `try/catch` en todo acceso, al estilo de `lib/units.ts`);
`src/hooks/useDietPlan.ts` reescrito a **stale-while-revalidate** con la máquina
de fases `loading | snapshot | fresh | stale | error` (snapshot inmediato sin
spinner, una consulta por intento, reescritura/borrado del snapshot en OK,
`isStale` + `savedAt` cuando la red falla, y **reintento único al evento
`online`** mientras esté stale); `src/components/OfflineBanner.tsx`
(`<p role="status">` "Sin conexión · plan guardado el 10 sep 09:15", con texto
de respaldo sin fecha si el ISO no parsea) montado bajo el `<h1>` de
`DietScreen`. Los `id` del plan viajan intactos en el snapshot, así que el
tachado de 11 (`gym:diet:check:<planId>:<kind>`) aplica igual sin red. El chunk
lazy de `/dieta` (`assets/DietScreen-<hash>.js`) ya entraba en el precache de
Workbox: se **verificó** en `dist/sw.js` y en runtime, no se cambió la config.
**Cero migraciones, cero dependencias, cero env vars, cero escrituras a
Supabase**; `src/services/diet.ts` byte-idéntico.

**Cambio en 02_auth (open item A, aprobado por el humano y auditado por el
reviewer).** Hallazgo: con el access token caducado y sin red, `getSession()`
devuelve `{ session: null, error: AuthRetryableFetchError }` (auth-js conserva
la sesión en storage pero no la entrega) y la app **expulsaba a `/login`** en
pleno modo avión. Arreglo mínimo: `SessionProvider` expone `offlineSession`
—true solo si `session === null` **y** el error es retryable, es decir, un fallo
de infraestructura (sin red o 5xx), nunca un 4xx de credenciales— e ignora el
evento `INITIAL_SESSION` (sin red auth-js lo emite con `null` y pisaría la
bandera); `ProtectedRoute` redirige solo `if (session === null &&
!offlineSession)`. `TOKEN_REFRESHED`/`SIGNED_IN` reponen la sesión y limpian la
bandera; `SIGNED_OUT` y cualquier error no retryable **siguen llevando a
`/login`**. Se añadió un `.catch()` en `getSession()` (fail-closed: solo apaga
el spinner) porque al ignorar `INITIAL_SESSION` se perdía el único apagador en
el camino de promesa rechazada. Dictamen del reviewer: **no abre ningún hueco**
—sin token válido toda consulta sale con la anon key y RLS la rechaza; lo único
visible sin red es el snapshot local, que `signOut` borra—.

**Menor del review atendido dentro de 12 (privacidad):** "Cerrar sesión" sin red
y con token caducado **no cerraba nada**, porque `GoTrueClient._signOut`
devuelve el `sessionError` antes de `_removeSession()` (ni borra la sesión
persistida ni emite `SIGNED_OUT`), y con `offlineSession` el guard tampoco
rebotaba. Arreglo confinado a `services/auth.ts#signOut`: si el cierre no se
completa, se purga la clave `sb-*-auth-token` del dispositivo (best-effort,
nunca lanza, solo claves de supabase) y se repite `signOut()`; el segundo
intento ya no encuentra sesión, **no sale a la red** y termina en
`_removeSession()`, que emite `SIGNED_OUT` → `/login`. Con red el camino es
idéntico al de antes (una sola llamada, nada que purgar), con test que lo
afirma. No aplicado el menor 2 (`signOut` no limpia `gym:diet:check:*`): esas
claves son de 11 y su limpieza cae fuera de la superficie que el spec de 12
autoriza; queda como decisión del humano.

Gates: **`./init.sh` verde en 5 corridas completas** (3 del implementer + 3 del
reviewer sobre el mismo código + 1 tras aplicar los menores): 48 archivos /
**732 tests**, 98.72 % de líneas globales y **100 % de líneas en los siete
módulos tocados** (`dietCache.ts`, `useDietPlan.ts`, `OfflineBanner.tsx`,
`DietScreen.tsx`, `useSession.tsx`, `ProtectedRoute.tsx`, `services/auth.ts`).
Review: **APPROVE**, 0 bloqueantes, 4 menores
(`progress/review_12_diet_offline.md`). Detalles y trazabilidad R1–R22:
`progress/impl_12_diet_offline.md`. Desviaciones declaradas: el banner va sobre
todo `renderBody()` (no solo sobre `MacroSummary`), el `.catch()` de
`getSession()`, el reordenado de `signOut` y los timeouts del E2E 3 (auth-js
reintenta el refresh ~30 s sin red antes de rendirse, así que la app muestra
"Cargando…" ese rato antes de pintar Dieta con el banner — comportamiento de
supabase-js, previo a 12).

E2E (`e2e/diet-offline.spec.ts`, contra `pnpm preview`, solo lectura): **test 1
(precache del chunk de Dieta, sin credenciales) PASA**; **test 3 (token caducado
+ `setOffline(true)` → sigue en `/dieta`, no `/login`) PASA contra el proyecto
real**; `auth` 2/2, `pwa` 3/3, `smoke` y `diet` verdes.

**⏳ PENDIENTE (humano), bloqueado por 09 como en 10 y 11:** el **test 2
(criterio 7 completo)** se salta con mensaje explícito porque `/dieta` sigue
resolviendo en error mientras `003_diet_schema.sql` / `004_diet_rls.sql` no
estén aplicadas; **nunca se ha ejecutado de verdad**. Al aplicarlas y subir un
plan desde el repo `Gym`: correr `npx playwright test e2e/diet-offline.spec.ts`,
`e2e/diet-checklists.spec.ts` y el camino "plan activo" de `e2e/diet.spec.ts`,
más el checklist manual en el iPhone (modo avión tras abrir Dieta, tachado sin
red, vuelta de la señal, y reapertura tras **más de 1 h** para ejercitar el
token caducado). Ajenos a 12 y sin empeorar: `e2e/logging.spec.ts` y
`e2e/history.spec.ts` siguen rojos por `13_fix_lb_prefill_validation`, y
`e2e/today.spec.ts` por rozar el timeout de 30 s.

## 2026-09-12 — 14_ui_redesign_cyclorama: implemented, reviewed (APPROVE), DONE

Primera feature puramente **visual** del proyecto. El humano pidió el 2026-09-12
"mejorar todo el UI, que se vea mejor y con paleta más llamativa" y el leader lo
resolvió con el skill **Impeccable**: `/impeccable init` levantó `PRODUCT.md`
(prisa entre series, manos sudadas o con guantes, luz fuerte del gym) y la ronda
de dirección (`concept-seed --scope direction`, seed **eee43132**) ofreció una
dirección asignada y varias retadoras; el humano eligió **"Ciclorama de
amanecer"** (`stagecraft-theater-lighting-cyclorama-dawn`) por encima de la
asignada. De ahí salieron la paleta oficial —negro #050505, horizonte cobalto
#0A33FF → rosa #FF6AAE, rosa pálido #FFC1D6, blanco roto #F7F5FF, día blanco
#FFFFFF— y el contrato de dirección en
`.impeccable/surfaces/src-screens-todayscreen-tsx.md`.

**Solo presentación.** Las 5 pantallas, el app shell (`AppHeader`, `BottomNav`),
los 22 componentes, `src/index.css` (Tailwind v4 `@theme` + 4 `@utility`), el
`theme_color` del manifest y el `<meta name="theme-color">` de `index.html`.
`git diff --stat` sobre `src/services`, `src/hooks`, `src/lib`, `src/App.tsx`,
`src/main.tsx`, `supabase/`, `e2e/helpers.ts`, `package.json`, `pnpm-lock.yaml`
y `.env.example` → **salida vacía**: cero cambios de datos, consultas, rutas,
copy, dependencias, env vars, migraciones ni reglas del service worker (`/rest/`
y `/auth/` siguen sin cachearse). La única escritura a Supabase sigue siendo
`services/logs.ts#logSet` sobre **`workout_logs`**, y la accesibilidad heredada
quedó intacta atributo por atributo (`aria-label` 20→20, `role=` 20→20,
`aria-pressed`, `aria-checked`, `aria-current`, `aria-live`, `aria-labelledby`
sin variación). De los 732 asserts heredados solo se reescribió **uno de color**
(`bg-slate-800` → `bg-blackout` en `ExerciseMedia.test.tsx`).

**Decisiones del humano en el gate del spec:** (A) Historial en **día blanco**;
(B) Dieta con las **fases literales** del mundo según el estado de la ventana de
alimentación; (C-1) la fase de ejercicio se deriva **solo dentro de la pantalla
de Ejercicio, sin ninguna consulta nueva** (en Hoy todas las filas son noche;
"las filas hechas ya son de día" queda para una feature futura); (D) **sin
webfont**, tipografía del sistema; (E) las flechas ‹ › y los signos −/+ como
**glifos de texto**, no como iconos. Ya en vuelo, el humano firmó la **Enmienda
1** de `requirements.md`, que reescribe R9/R10 para autorizar el **fix 4**: el
título del día pasa a ser el protagonista de la banda de horizonte ("HOY · LUN
14 SEP" como kicker de 12 px sobre "Torso · empuje" a 22 px bold) y desaparece
el `<h2>` huérfano de debajo; autorizó exactamente dos asserts de
`TodayScreen.test.tsx`.

**Ciclo de revisión.** El `impeccable-finish-reviewer` abrió con **7 fixes
materiales** (nombres truncados en Hoy, el horizonte repetido en cuatro slabs
idénticos, miniaturas blancas que robaban el rol de "día", el orden de lectura
de la banda, `hover:bg-blackout` pintando la fila tocada con el color de
deshabilitado, y la columna de escritorio descolgada del header). **Ronda 1:** 6
aplicadas, y el `verdict pass 1` detectó **2 regresiones** propias del arreglo
(seis rectángulos idénticos en Ejercicio y miniaturas demasiado apagadas a
`opacity-60`). **Ronda 2:** los 4 puntos restantes —fix 4 tras la Enmienda 1,
el clipping de la fila 07 a tres líneas, los tres niveles de acción y las
miniaturas a `opacity-75`— resueltos; `verdict pass 2` → **`ship`**
(`.impeccable/critique/finish-review-14.md`), con contraste muestreado sobre la
banda nueva (kicker 6.5:1, título 4.7:1).

Gates: **`./init.sh` verde**, typecheck y lint en 0, **868/868 tests** en 50
archivos, cobertura **98.8 % stmts / 93.63 % branches / 100 % funcs / 98.75 %
lines** (umbral 80), build OK y **CSS 1.116×** el tamaño de referencia (límite
R30: ≤ 2×), sin tipos de artefacto nuevos en `dist/`; **detector de Impeccable
`[]`** (sin hallazgos). Blindaje permanente en `src/theme.test.ts`: recorre los
33 `.tsx` de producción y prohíbe paleta Tailwind, hex sueltos, `style={{`,
sombras, `backdrop-`, gradientes fuera del token y radios grandes, además de
fijar la lista exacta de dependencias. Review del harness: **APPROVE**, 0
bloqueantes, 6 menores (`progress/review_14_ui_redesign_cyclorama.md`);
trazabilidad R1–R33 y detalle de implementación en
`progress/impl_14_ui_redesign_cyclorama.md`. E2E no corrido en esta feature (por
instrucción: requiere credenciales en vivo) y los dos fallos preexistentes
—timeout de `e2e/today.spec.ts` y el helper `readDietContent` de
`e2e/diet-offline.spec.ts`— siguen abiertos y son **ajenos** a 14.

Artefactos nuevos que deja la feature: **`PRODUCT.md`** (contexto de producto),
**`DESIGN.md`** (sistema visual documentado por `impeccable-documenter`),
**`.impeccable/design.json`**,
**`.impeccable/surfaces/src-screens-todayscreen-tsx.md`** (contrato de
dirección) y **`.impeccable/critique/finish-review-14.md`** (las dos rondas y el
`ship`).

**⏳ PENDIENTE (humano):** smoke manual del rediseño en el iPhone y la decisión
de versionado de las 8 capturas de `.impeccable/review/` (hoy ignoradas por
`.gitignore`); ambos anotados en `progress/current.md`.
