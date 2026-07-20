# Review — 05_workout_logging

**Verdict: APPROVE**
**Reviewer run date:** 2026-07-19
**Spec:** specs/05_workout_logging/{requirements,design,tasks}.md (R1–R10; open
items resolved by the human on 2026-07-18 and applied as-is)

## What I verified

### 1. Traceability R1–R10 (all requirements have real, asserting tests)

- **R1** — `LoggingSection.test.tsx` "R1: renderiza target_sets filas numeradas
  desde 1" (asserts Serie 1–4 present, Serie 5 absent) and "R1: 'Agregar serie'
  agrega la fila 5" (also asserts `min-h-11`); `logging.test.ts >
  buildInitialRows`; `ExerciseScreen.test.tsx` "05/R1: monta la sección";
  e2e asserts 4 "Guardar serie" buttons after cleanup.
- **R2** — `logs.test.ts > getPreviousSession` asserts the exact query shape
  (`lt('performed_at', beforeISO)`, double order, `limit(10)`); the
  **max-date client-side filter has its own test** ("con filas de varias fechas
  filtra en cliente a las de la fecha máxima") covering the limit-10 window
  spanning two dates; `LoggingSection.test.tsx` asserts per-row
  "Anterior: 22.5 × 10" / "Anterior: 25 × 8" / "Anterior: —" per matching
  `set_number`; `SetRow.test.tsx` covers both Anterior states.
- **R3** — `logging.test.ts > resolvePrefill` covers the full chain
  (previous-session match → prior UI row → "8-12"→8 → "al fallo"→10) plus
  `firstNumber` cases incl. "0"→null; `LoggingSection.test.tsx` asserts
  prefilled stepper values with and without history.
- **R4** — `Stepper.test.tsx`: ±2.5 add/subtract, clamp at min 0 (weight) and
  min 1 (reps), tap-to-type opens `inputmode="decimal"` input, Enter/blur
  commit, comma decimal, clamp of typed "-5"→0, invalid/empty input reverts
  without `onChange`, all three touch targets `min-h-11`/`min-w-11`, disabled
  behavior. `SetRow.test.tsx` asserts propagation and save button ≥ 44px.
- **R5** — `logs.test.ts > logSet` asserts `insert` called exactly once with
  `{...input, user_id}` from the live session (`auth.getSession()`), then
  `.select().single()`; `LoggingSection.test.tsx` "R5" asserts the full
  payload including `performed_at: todayLocalISO()` and the ✓
  saved/disabled state; e2e saves two real rows. I confirmed `todayLocalISO()`
  in `src/lib/utils.ts` builds from **local** date components, never
  `toISOString()`/UTC, and `useWorkoutLog.saveRow` passes it explicitly
  (never the DB default).
- **R6** — `logs.test.ts` maps insert failure and thrown network error to
  "No se pudo guardar la serie, reintenta" (asserts the raw error never leaks);
  `LoggingSection.test.tsx` "R6" asserts Spanish alert, values intact (25 kg
  survives), and retry succeeding with exactly 2 total `logSet` calls (no
  duplicates); `SetRow.test.tsx` error-state test.
- **R7** — `logging.test.ts > validateSet` matrix: 4 valid + 10 invalid cases
  (negative, NaN, Infinity, non-0.5-step 22.3/10.25, reps 0/-1/8.5/NaN) each
  with its Spanish message; `LoggingSection.test.tsx` "R7" types 22.3 and
  asserts the save is blocked with `logSet` **never called**.
- **R8** — `logs.test.ts > getSessionSets` query shape; `buildInitialRows`
  tests (saved→`saved` status, out-of-order sort, all-saved, extra rows beyond
  target_sets); `LoggingSection.test.tsx` reopen test (rows 1–2 ✓ disabled
  with values, rows 3–4 editable); e2e real reload asserting persisted weight
  text and 2 remaining editable rows.
- **R9** — Grep audit run by me: `.insert(`/`.update(`/`.delete(`/`.upsert(`/
  `.rpc(` across `src/` → the **only** hit is `src/services/logs.ts:135`
  (`insert` into `workout_logs`); the `useWorkoutLog.ts:150` hit is
  `Set.delete()`, not supabase. All 7 `.from(` calls live in `services/`
  (plans/exercises/logs) — none elsewhere. `logs.test.ts` asserts
  `from("workout_logs")` in all three functions.
- **R10** — `LoggingSection.test.tsx` "R10": two synchronous `fireEvent.click`
  with the insert held pending → exactly 1 `logSet` call, "Guardando…"
  disabled, still 1 call after resolve. The guard is a synchronous
  `Set` in a ref (`useWorkoutLog`), robust against double-tap before
  re-render, plus the disabled button (`SetRow.test.tsx` saving state).

### 2. Data-correctness deep checks

- `getPreviousSession` returns only the most-recent prior session's rows —
  dedicated test with rows from 2026-07-17 and 2026-07-15 in one response.
- `logSet` payload: `user_id` from live session (missing session / getSession
  error → Spanish error **without** touching the table — both tested);
  `performed_at` from `todayLocalISO()` asserted in the component-level R5 test.
- `WorkoutLog` type in `src/lib/types.ts` mirrors `supabase/migrations/
  001_schema.sql` §3.5 exactly (incl. nullable `plan_exercise_id`); contract
  with the Gym repo intact — no schema change, no migration needed, existing
  RLS insert/select policies from 01 cover the write path.

### 3. Checks green (run by me)

- `./init.sh` (install → typecheck → lint → test+coverage → build): **PASS**.
  218 tests / 23 files, all green. Coverage: `services/logs.ts` **100%** lines,
  `src/lib` (incl. `logging.ts` validate/prefill helpers) **100%**,
  `useWorkoutLog.ts` 95.2%, global 97.0% — the ≥ 85% target in tasks.md is met.
  Build emits manifest + `sw.js` (PWA untouched by this feature).
- `./init.sh e2e`: **PASS** — 6/6, and `logging.spec.ts` genuinely ran
  (5.7s, "ok", not skipped): saved two sets, reloaded, both persisted.
- Cleanup verified independently: authenticated REST count of today's
  `workout_logs` rows for fixture exercises 0001/0002/0003 → **0 / 0 / 0**.
  No stray rows left. No credential values printed at any point.

### 4. Conventions & security

- 100% Spanish UI, kg units (`formatKg`), touch targets ≥ 44px asserted in
  tests; explicit loading ("Cargando series…"), error + "Reintentar", and
  per-row states.
- No `any`, no `console.log`/`warn`/`error`/`info` in `src/` (only the
  dev-gated `console.debug` pattern already approved in 02–04).
- No new dependencies, env vars, tables, or routes; `package.json`,
  `.env.example`, `supabase/`, auth code all untouched (verified via git diff).
- No service key / secret anywhere (grep hits are prose warnings only).
- The e2e DELETE lives only in `e2e/logging.spec.ts` via REST with the
  browser session's token (RLS-scoped) — app services have no delete, as
  designed.
- MVP cut respected: saved rows are fully disabled (steppers + button); no
  edit/delete UI exists.

### 5. Scope

- Exactly the spec: logs service, pure logging lib, Stepper/SetRow/
  LoggingSection, useWorkoutLog, ExerciseScreen mount, tests, e2e. No history
  screen, no offline queue, nothing extra.

## Notes (non-blocking)

- The e2e cleanup deletes ALL of today's rows for fixture exercise '0001' of
  the e2e user — acceptable while '0001'–'0003' remain placeholder fixtures
  (already flagged in the impl report, item 3).
- Manual phone check under throttled network (tasks.md > Verificación) remains
  a human step; automated equivalents (R6 failure/retry) are covered.

## Conclusion

All 12 tasks in `tasks.md` are checked and verifiably done. The leader may
mark `05_workout_logging` as **done** in `feature_list.json`.
