# Current session

## Feature in progress
(none — 04_exercise_detail is done; next up: 05_workout_logging)

## State
2026-07-19: `04_exercise_detail` closed (exercise detail screen: GIF over the
thumbnail placeholder in a fixed box, ordered Spanish instruction steps,
targets + rest, equipment/target chips, notes callout, "© Gym visual"
attribution, not-found/loading/error states, back to Hoy; 126 tests + the
e2e fixture path verified against the live DB, coverage 100% lines on
`services/exercises.ts` + `ExerciseScreen.tsx`, reviewer APPROVE — see
`progress/history.md`).
Next feature is **05_workout_logging** at `spec_ready`.

## Notes / blockers
- **⏸ Human approval gate:** 05_workout_logging's spec needs human approval
  before setting it `in_progress` and launching the implementer.
- **Cross-repo pending:** re-run `node scripts/check-rls.mjs` after the `Gym`
  repo seeds `exercises` — the own-`user_id` insert check (c) is currently
  SKIP by design (FK on `exercise_id` against an empty catalog).
- **Live test data:** the fixture plan **'Plan de prueba E2E'** and the
  placeholder exercises `'0001'`–`'0003'` (inserted with `ON CONFLICT DO
  NOTHING`) exist in the live DB via `e2e/fixtures/test-plan.sql`. The script
  is idempotent and safe to re-run (e.g. to re-center the plan on
  `current_date`); the Gym repo's real seed can coexist/overwrite the
  placeholder catalog rows. **Heads-up for 05:** its e2e will WRITE real
  `workout_logs` rows for the fixture exercises ('0001'–'0003') under the
  real user — plan for cleanup/idempotency in that spec's fixture strategy.
