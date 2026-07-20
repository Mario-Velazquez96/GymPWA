# Current session

## Feature in progress
(none — 05_workout_logging is done; next up: 06_history)

## State
2026-07-19: `05_workout_logging` closed (set logging on the exercise screen:
`services/logs.ts` as the app's only writer to `workout_logs`, Stepper/SetRow
state machine, "Anterior" comparison + prefill chain, immediate per-set
inserts with device-local `performed_at`, client validation; 218 tests + 6
e2e specs incl. real writes with cleanup, coverage 100% lines on the logs
service + helpers, reviewer APPROVE — see `progress/history.md`).
Next feature is **06_history** at `spec_ready`.

## Notes / blockers
- **⏸ Human approval gate:** 06_history's spec needs human approval before
  setting it `in_progress` and launching the implementer.
- **Cross-repo pending:** re-run `node scripts/check-rls.mjs` after the `Gym`
  repo seeds `exercises` — the own-`user_id` insert check (c) is currently
  SKIP by design (FK on `exercise_id` against an empty catalog).
- **Live test data:** the fixture plan **'Plan de prueba E2E'** and the
  placeholder exercises `'0001'`–`'0003'` (inserted with `ON CONFLICT DO
  NOTHING`) exist in the live DB via `e2e/fixtures/test-plan.sql`. The script
  is idempotent and safe to re-run (e.g. to re-center the plan on
  `current_date`); the Gym repo's real seed can coexist/overwrite the
  placeholder catalog rows. `e2e/logging.spec.ts` writes real `workout_logs`
  rows for exercise '0001' and deletes today's rows for it at start and end
  (authenticated REST inside the spec — the app services have no delete).
