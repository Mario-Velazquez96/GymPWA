# Current session

## Feature in progress
(none — 03_today_view is done; next up: 04_exercise_detail)

## State
2026-07-19: `03_today_view` closed (Hoy screen with active plan + device-local
date, day navigation clamped to the plan range, four Spanish states, new
services/types/hook layer, `test-plan.sql` fixture applied live by the human,
98 tests + dual-path E2E with the seeded path verified against the real DB,
reviewer APPROVE — see `progress/history.md`).
Next feature is **04_exercise_detail** at `spec_ready`.

## Notes / blockers
- **⏸ Human approval gate:** 04_exercise_detail's spec needs human approval
  before setting it `in_progress` and launching the implementer.
- **Cross-repo pending:** re-run `node scripts/check-rls.mjs` after the `Gym`
  repo seeds `exercises` — the own-`user_id` insert check (c) is currently
  SKIP by design (FK on `exercise_id` against an empty catalog).
- **Live test data:** the fixture plan **'Plan de prueba E2E'** and the
  placeholder exercises `'0001'`–`'0003'` (inserted with `ON CONFLICT DO
  NOTHING`) exist in the live DB via `e2e/fixtures/test-plan.sql`. The script
  is idempotent and safe to re-run (e.g. to re-center the plan on
  `current_date`); the Gym repo's real seed can coexist/overwrite the
  placeholder catalog rows.
