# Tasks — 06_history

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [ ] Extend `services/logs.ts` with `getExerciseHistory` (R1)
- [ ] Extend `services/exercises.ts` with `getExercise` (R3, R8)
- [ ] Implement `groupByDate` and `formatKg` pure helpers in `lib/utils.ts`
      (R1, R2, R7)
- [ ] Build `SessionCard` (Spanish date header + "Serie N — X kg × Y" rows)
      (R2)
- [ ] Build `HistoryScreen` with loading/empty/error/not-found states (R1,
      R3, R4, R6, R8)
- [ ] Add "Ver historial" link (≥44px) to `ExerciseScreen` (R5, R7)
- [ ] Unit tests: groupByDate, formatKg, history service (R1, R2, R6, R7)
- [ ] Component tests: session ordering, set lines, title, empty, retry,
      not-found (R1–R4, R6, R8)
- [ ] E2E: exercise → "Ver historial" → logged sets visible (R1, R5)
- [ ] Run `./init.sh` + `./init.sh e2e`; all green

## Verification

- Mapping: R1 → groupByDate + screen ordering tests; R2 → SessionCard test;
  R3 → title test; R4 → empty test; R5 → e2e navigation; R6 → retry test;
  R7 → formatKg tests + grep services-only; R8 → not-found test.
- Coverage ≥ 80% lines on the new service functions and helpers.
- Manual: history for an exercise with 2+ logged days reads correctly on the
  phone.
