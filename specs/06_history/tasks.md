# Tasks — 06_history

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [x] Extend `services/logs.ts` with `getExerciseHistory` (R1)
- [x] Extend `services/exercises.ts` with `getExercise` (R3, R8)
- [x] Implement `groupByDate` and `formatKg` pure helpers in `lib/utils.ts`
      (R1, R2, R7)
- [x] Build `SessionCard` (Spanish date header + "Serie N — X kg × Y" rows)
      (R2)
- [x] Build `HistoryScreen` with loading/empty/error/not-found states (R1,
      R3, R4, R6, R8)
- [x] Add "Ver historial" link (≥44px) to `ExerciseScreen` (R5, R7)
- [x] Unit tests: groupByDate, formatKg, history service (R1, R2, R6, R7)
- [x] Component tests: session ordering, set lines, title, empty, retry,
      not-found (R1–R4, R6, R8)
- [x] E2E: exercise → "Ver historial" → logged sets visible (R1, R5)
      — `e2e/history.spec.ts`: happy path RUNS (login → Hoy → ejercicio '0002'
      → log serie → "Ver historial" → assert "X kg × Y") and cleans up its own
      rows; R8 not-found test passes. Uses fixture exercise '0002' to avoid the
      parallel data collision with 05's '0001'.
- [x] Run `./init.sh` + `./init.sh e2e`; all green — both exit 0. Full: 252
      unit/component tests + coverage + build. E2E: 8/8 specs pass (auth, today,
      exercise, logging, history). Required re-anchoring the shared fixture on
      the Mexico-City-local date (was UTC `current_date`) and isolating this
      spec on exercise '0002'.

## Verification

- Mapping: R1 → groupByDate + screen ordering tests; R2 → SessionCard test;
  R3 → title test; R4 → empty test; R5 → e2e navigation; R6 → retry test;
  R7 → formatKg tests + grep services-only; R8 → not-found test.
- Coverage ≥ 80% lines on the new service functions and helpers.
- Manual: history for an exercise with 2+ logged days reads correctly on the
  phone.
