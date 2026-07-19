# Tasks — 05_workout_logging

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [x] Resolve open items with the human: prefill default, edit-after-save cut,
      local-date `performed_at` — all confirmed 2026-07-18
- [ ] Implement `services/logs.ts`: `getPreviousSession` (max-date filter),
      `getSessionSets`, `logSet` with session `user_id` (R2, R5, R8, R9)
- [ ] Implement `validateSet` + prefill helper (`resolvePrefill`) as pure
      functions (R3, R7)
- [ ] Build `Stepper` (±step buttons, min clamp, tap-to-type numeric input,
      ≥44px) (R4)
- [ ] Build `SetRow` with the `editable → saving → saved/error` state machine
      and the "Anterior" column (R2, R5, R6, R10)
- [ ] Build `LoggingSection` + `useWorkoutLog` hook: rows from target_sets +
      today's saved sets + "Agregar serie" (R1, R8)
- [ ] Mount `LoggingSection` in `ExerciseScreen` under the detail info (R1)
- [ ] Unit tests: logs service, validateSet matrix, prefill chain (R2, R3, R5,
      R7, R9)
- [ ] Component tests: rows/add-row, Anterior states, stepper behavior, save
      success, save failure + retry, double-tap guard, reopen-with-saved-sets
      (R1, R2, R4, R5, R6, R8, R10)
- [ ] E2E: log two sets → reload → saved rows persist (R5, R8)
- [ ] Grep audit: `insert`/`update`/`delete` only in `services/logs.ts`, only
      `workout_logs` (R9)
- [ ] Run `./init.sh` + `./init.sh e2e`; all green

## Verification

- Mapping: R1 → LoggingSection tests; R2 → service + Anterior tests; R3 →
  prefill unit tests; R4 → Stepper tests; R5 → save test + e2e; R6 → failure
  test; R7 → validateSet tests; R8 → reopen test + e2e reload; R9 → grep
  audit; R10 → in-flight test.
- Coverage ≥ 85% lines on `services/logs.ts`, `validateSet`, `resolvePrefill`.
- Manual (phone, network throttled): save under flaky data → Spanish error,
  values intact, retry works, no duplicate rows in the table.
