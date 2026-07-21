# Review — 06_history — VERDICT: APPROVE

Reviewer pass over feature `06_history` (Historial por ejercicio). Read-only
verification; no code changed. The leader may mark the feature `done`.

## 1. Traceability R1–R8 (each mapped to a test that genuinely asserts it)

- **R1** (sessions grouped by `performed_at`, newest-first): `services/logs.ts#getExerciseHistory`
  orders `performed_at` desc + `set_number` asc; asserted in `src/services/logs.test.ts`
  ("order performed_at desc + set_number asc"). Grouping preserves input order via a
  `Map`; `src/lib/utils.test.ts#groupByDate` proves newest-first ordering AND robustness
  for non-contiguous same-date rows. `HistoryScreen.test.tsx` asserts the two session
  headings render `["mié 5 ago 2026", "lun 3 ago 2026"]`. ✓
- **R2** (date header + "Serie N — X kg × Y" by set_number): `SessionCard.test.tsx`
  asserts exact rows `["Serie 1 — 22.5 kg × 10", "Serie 2 — 25 kg × 8"]` and Spanish date
  header with year; `formatDateEs({year:true})` and `formatKg` unit-tested. ✓
- **R3** (title from exercise name): `getExercise` via `maybeSingle`; `exercises.test.ts`
  asserts query shape; `HistoryScreen.test.tsx` asserts the H1 shows "Press de banca". ✓
- **R4** (empty state, header still renders): `HistoryScreen.test.tsx` asserts
  "Aún no hay registros de este ejercicio" AND the H1 name still present. ✓
- **R5** (navigates to /historial/<exercise_id>): VERIFIED it uses the EXERCISE id, not
  the plan_exercise id — `ExerciseScreen.tsx` links `to={`/historial/${exercise.id}`}`
  where `exercise = detail.exercises`; `ExerciseScreen.test.tsx` asserts
  `href="/historial/0001"` (not the plan_exercise `pe-1`). E2E navigates to
  `/historial/0002`. ✓
- **R6** (loading + error/retry): `HistoryScreen.test.tsx` covers loading `role="status"`,
  error `role="alert"` with "Reintentar" that reloads, and exercise-load failure path;
  `logs.test.ts` covers history error + exception → `LOGS_ERROR_HISTORY`. ✓
- **R7** (services-only, kg formatting, ≥44px): no `supabase.from` in screens/components
  (grep clean; services mocked at their boundary in tests); `formatKg` integer vs
  fractional unit-tested ("22 kg" / "22.5 kg"); back control asserted `min-h-11 min-w-11`,
  "Ver historial" link `min-h-11`. ✓
- **R8** (not-found for bogus id): `getExercise` returns `null` for non-existent contract
  id; `HistoryScreen.test.tsx` asserts "Ejercicio no encontrado" + "Volver a Hoy" → "/";
  E2E `/historial/id-inexistente-e2e` passes live. ✓

## 2. Task completeness

All 10 tasks in `tasks.md` are `- [x]` and verified against code. The previously-premature
"all green" task is now truthful — confirmed by running both pipelines myself (below).

## 3. Checks green (run by reviewer, Git Bash)

- `./init.sh` — green. typecheck + lint clean; 252 unit/component tests pass; build emits
  `dist/manifest.webmanifest` + `dist/sw.js` (+workbox). Coverage on the feature's core:
  `lib/utils.ts` 100% lines (groupByDate/formatKg), `services/logs.ts` 100% lines
  (getExerciseHistory), `services/exercises.ts` 100% lines (getExercise),
  `screens/HistoryScreen.tsx` 100% lines — all ≥ 80% target.
- `./init.sh e2e` — green, **8/8 specs pass**. The history happy path
  (`history.spec.ts:91`, "registra una serie hoy y aparece en 'Ver historial'") **RAN,
  not skipped** (test #4, 5.5s). Its start+end cleanup steps DELETE via authenticated REST
  and throw on any non-2xx, so a passing run means no stray `workout_logs` rows for
  exercise 0002 today. R8 not-found test also passes live.

## 4. Fixture change soundness

`e2e/fixtures/test-plan.sql` re-anchored from Postgres UTC `current_date` to
`(now() at time zone 'America/Mexico_City')::date` (`v_today`), matching feature 03's
device-local date behavior. Idempotency preserved (delete-then-insert 'Plan de prueba E2E'
by name; `ON CONFLICT (id) DO NOTHING` for exercises 0001–0003). No schema/contract change
— only date arithmetic and comments. Features 03/04/05 e2e all still pass under the new
fixture (today, exercise, logging specs green in the same run). History isolated on
exercise 0002 to avoid the parallel collision with 05's 0001 — sound.

## 5. Conventions & security

Spanish UI throughout; no `supabase.from` outside `services/` (grep clean); no `any`
(grep clean); no `console.log` (only `console.debug` gated on `import.meta.env.DEV`);
no new dependencies (`package.json` untouched); no new env vars / `.env.example` untouched;
no service key or non-`VITE_` secret in the repo; `supabase/` migrations, RLS, and auth
untouched; `groupByDate`/`formatKg`/`formatDateEs` are pure. Cross-repo contract
(exercise IDs, schema) intact.

## 6. Scope discipline

Read-only history slice: no charts, no date-range filtering, no editing from history — all
out of scope per the spec and confirmed absent. One new service fn each in `logs.ts`/
`exercises.ts`, one screen, one presentational card, one entry-point link. No new table,
route (only `/historial/:exerciseId`, ProtectedRoute), env var, or dependency.

## Non-blocking note

A same-named `formatKg` exists in `src/lib/logging.ts` (returns the bare number for the
steppers) distinct from `src/lib/utils.ts#formatKg` (returns "N kg"). Both are intentional
per the approved design; a future unification is optional and not required here.

**Verdict: APPROVE** — feature `06_history` may be marked `done`.
