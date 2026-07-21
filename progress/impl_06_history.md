# Impl progress — 06_history

**Feature:** Historial por ejercicio (evolución de peso/reps). Status: `in_progress`.
**Scope:** read-only slice over `workout_logs` + `exercises`; no schema/RLS/auth
changes, no new deps, no writes. All queries stay in `services/`.

## What changed

- **`src/services/logs.ts`** — added `getExerciseHistory(exerciseId)`:
  `workout_logs.select("*").eq("exercise_id", id).order("performed_at", desc)
  .order("set_number", asc)` → `Result<WorkoutLog[]>`. RLS scopes rows to the
  signed-in user; no logs → `{ data: [], error: null }`. New message constant
  `LOGS_ERROR_HISTORY = "No se pudo cargar el historial"` (R6).
- **`src/services/exercises.ts`** — added `getExercise(exerciseId)`:
  `exercises.select("*").eq("id", id).maybeSingle()` → `Result<Exercise | null>`.
  `null` (no error) = not-found path (R3 title / R8). Exercise ids are contract
  text ("0001".."1324"), not uuid, so a bogus id resolves to `null`.
- **`src/lib/utils.ts`** — pure helpers (unit-tested):
  - `formatKg(n)` → integer `"22 kg"`, fractional `"22.5 kg"` (R2, R7).
  - `groupByDate(logs)` → `{ date, sets }[]`, `Map`-based, preserves input order
    so sessions come out newest-first with sets in `set_number` order (R1).
  - `formatDateEs(iso, { year: true })` → `"lun 3 ago 2026"` (R2). Default
    behaviour (no options) unchanged — existing Hoy tests still pass.
- **`src/components/SessionCard.tsx`** — new presentational card: Spanish date
  header (`formatDateEs(date, { year: true })`) + rows `"Serie N — 22.5 kg × 10"`
  via `formatKg` (R2). No data fetching.
- **`src/screens/HistoryScreen.tsx`** — route `/historial/:exerciseId` (already
  wired in `App.tsx`). Loads exercise + history in parallel. Title = exercise
  name (R3). States: loading `role="status"` / error `role="alert"` +
  "Reintentar" (R6) / empty "Aún no hay registros de este ejercicio" with header
  still rendered (R4) / not-found "Ejercicio no encontrado" + "Volver a Hoy"
  (R8). Back control ≥ 44px (`min-h-11 min-w-11`, R7).
- **`src/screens/ExerciseScreen.tsx`** — added a "Ver historial" link
  (`min-h-11`, full-width) → `/historial/${exercise.id}` using the embedded
  `exercises.id` (not the `plan_exercise.id`) (R5, R7).

## Requirement → test mapping

- **R1** (sessions grouped by `performed_at`, newest-first):
  `src/lib/utils.test.ts` > groupByDate ("separa días distintos… newest-first",
  "reagrupa filas… no contiguas"); `src/services/logs.test.ts` >
  getExerciseHistory ("order performed_at desc + set_number asc");
  `src/screens/HistoryScreen.test.tsx` > "R1/R2: agrupa por fecha newest-first…".
- **R2** (date header + "Serie N — X kg × Y" by set_number):
  `src/components/SessionCard.test.tsx` ("fecha en español con año",
  "'Serie N — X kg × Y' en orden por set_number"); `utils.test.ts` > formatKg,
  formatDateEs `{ year: true }`.
- **R3** (title from exercise name): `HistoryScreen.test.tsx` > "R3: usa el id de
  la URL y muestra el nombre…"; `src/services/exercises.test.ts` > getExercise
  ("consulta exercises por id con maybeSingle…").
- **R4** (empty state, header still renders): `HistoryScreen.test.tsx` > "R4: sin
  registros muestra el estado vacío y el título sigue presente".
- **R5** ("Ver historial" → /historial/{exercise_id}):
  `src/screens/ExerciseScreen.test.tsx` > "06/R5: el enlace 'Ver historial'
  apunta a /historial/{exercise_id}…"; `e2e/history.spec.ts` (happy path).
- **R6** (loading + error/retry): `HistoryScreen.test.tsx` > "R6: muestra el
  estado de carga…", "R6: si el historial falla… 'Reintentar' recarga", "R6: si
  falla la carga del ejercicio…"; `logs.test.ts` history error/exception cases.
- **R7** (queries in services only, kg formatting, ≥44px): `utils.test.ts` >
  formatKg; `HistoryScreen.test.tsx` > "R7: control de volver… ≥ 44px";
  `ExerciseScreen.test.tsx` link `min-h-11`. Screens/components use mocked
  services only — no `supabase.from` outside `services/`.
- **R8** (not-found for bogus id): `HistoryScreen.test.tsx` > "R8: id inexistente
  muestra 'Ejercicio no encontrado'…" and "Volver a Hoy regresa a Hoy";
  `exercises.test.ts` > getExercise ("id inexistente devuelve null");
  `e2e/history.spec.ts` > "un exercise_id inexistente muestra 'Ejercicio no
  encontrado' (R8)" — **passing** against live Supabase.

## Verification

- `./init.sh` (install → typecheck → lint → test+coverage → build): **green**.
  252 unit/component tests pass. Coverage on changed modules: `utils.ts` 100%
  lines, `services/logs.ts` 100% lines, `services/exercises.ts` 100% lines,
  `screens/HistoryScreen.tsx` 100% lines — all ≥ 80% target.
- `./init.sh e2e`: my `e2e/history.spec.ts` R8 test **passes**; the happy-path
  test **skips cleanly** (see blocker). The suite as a whole is **red**, but
  only because of a pre-existing environmental data-drift issue affecting the
  three older specs identically — not this feature (details below).

## Final verification — both green

- **`./init.sh` (full: typecheck → lint → test+coverage → build) — green.**
  252 unit/component tests pass. Coverage on changed modules: `lib/utils.ts`,
  `services/logs.ts`, `services/exercises.ts`, `screens/HistoryScreen.tsx` all
  100% lines (target ≥ 80%). Production build emits manifest + service worker.
- **`./init.sh e2e` — green: 8/8 specs pass** (auth ×2, smoke, today, exercise,
  logging, history ×2). The history happy path **RAN, not skipped** (login →
  Hoy → fixture exercise → log serie → "Ver historial" → assert "X kg × Y"),
  and its start/end cleanup steps executed (the authenticated REST DELETE throws
  on non-2xx, so a passing run means no stray `workout_logs` rows). The R8
  not-found test also passes live.

Two test-infra issues were diagnosed and fixed along the way — both data/test
problems, **no app code changed and no test weakened**:

1. **Fixture date/timezone offset (shared `e2e/fixtures/test-plan.sql`).** The
   fixture anchored on Postgres `current_date` (UTC), but the app computes
   "today" with the DEVICE-LOCAL date (America/Mexico_City — a feature-03
   requirement via `todayLocalISO()`). When UTC had rolled to the next day but
   local hadn't, the app's "today" landed on the wrong fixture day (the
   exercise-less "Pierna (prueba)"), breaking `today`/`exercise`/`logging`/
   `history` identically. **Fix:** re-anchored the fixture on the CDMX-local date
   — `v_today date := (now() at time zone 'America/Mexico_City')::date;` in the
   DO block, with `start_date`/`end_date`/all `day_date` derived from `v_today`
   (± N) and a comment explaining WHY. Kept idempotent (delete-then-insert
   'Plan de prueba E2E' by name) and `ON CONFLICT DO NOTHING` for exercises
   0001–0003; no schema/contract change. (Human re-applied it once.)
2. **Parallel data collision between `history.spec.ts` and `logging.spec.ts`.**
   Both ran on exercise `0001`'s today rows (each with a DELETE cleanup), so
   under `fullyParallel` one spec's cleanup wiped the other's just-saved rows,
   failing the saved-row assertions non-deterministically. **Fix (test
   isolation, not weakening):** pointed the history spec at the fixture's 2nd
   exercise `0002` (`/historial/0002`), so its writes/deletes never touch `0001`
   which the 05 spec owns. The spec still fully exercises R1/R5 end-to-end.

## Notes

- There is an unrelated `formatKg` in `src/lib/logging.ts` (returns the number
  only, e.g. "22.5", for the logging steppers). Per the approved design, the
  history `formatKg` with the " kg" unit lives in `src/lib/utils.ts`. Left the
  logging one untouched to avoid scope creep; a future refactor could unify them.
- No schema/RLS/migration changes; no new env vars; no new dependencies; Spanish
  UI throughout; kg units; touch targets ≥ 44px.
