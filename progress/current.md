# Current session

## Feature in progress
(none — 02_auth is done; next up: 03_today_view)

## State
2026-07-19: `02_auth` closed (real login + session + guards + sign-out,
gates green including the real-credential E2E round trip, coverage 100% on
auth service + session hook, reviewer APPROVE — see `progress/history.md`).
Next feature is **03_today_view** at `spec_ready`.

## Notes / blockers
- **⏸ Human approval gate:** 03_today_view's spec needs human approval before
  setting it `in_progress` and launching the implementer.
- **Cross-repo pending:** re-run `node scripts/check-rls.mjs` after the `Gym`
  repo seeds `exercises` — the own-`user_id` insert check (c) is currently
  SKIP by design (FK on `exercise_id` against an empty catalog).
- **03 data dependency:** 03_today_view can only be verified end-to-end with a
  seeded test plan (plans/plan_days/plan_exercises for the test user) — the
  e2e fixture SQL is planned in its spec.
