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
