# Current session

## Feature in progress
(none — 06_history is done)

## State
2026-07-20: `06_history` closed (per-exercise history screen: sessions
newest-first as `SessionCard`s with "Serie N — X kg × Y", empty / not-found /
error+retry states, "Ver historial" link using `exercise.id`; extended
`services/logs.ts#getExerciseHistory` + `services/exercises.ts#getExercise` and
`lib/utils.ts` helpers `groupByDate`/`formatKg`; 252 tests + 8/8 e2e green,
100% lines on the new service functions + helpers + screen, reviewer APPROVE —
see `progress/history.md`).
Next feature is **07_pwa_install_and_cache** at `spec_ready` — the **last**
feature.

## Notes / blockers
- **⏸ Human approval gate:** 07_pwa_install_and_cache's spec needs human
  approval before setting it `in_progress` and launching the implementer.
- **Cross-repo pending:** re-run `node scripts/check-rls.mjs` after the `Gym`
  repo seeds `exercises` — the own-`user_id` insert check (c) is currently SKIP
  by design (FK on `exercise_id` against an empty catalog).
- **Live test data / fixture:** `e2e/fixtures/test-plan.sql` is now
  **America/Mexico_City-anchored** (`v_today := (now() at time zone
  'America/Mexico_City')::date`) so it matches the app's device-local
  `todayLocalISO()`, and remains idempotent (delete-then-insert 'Plan de prueba
  E2E' by name; `ON CONFLICT DO NOTHING` for exercises '0001'–'0003'). If the
  e2e suite drifts across a day boundary, re-apply it. The '05' logging e2e owns
  exercise '0001' rows; the '06' history e2e is isolated on '0002'. Both delete
  their own `workout_logs` rows via authenticated REST (the app services have no
  delete, by design).
