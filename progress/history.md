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
