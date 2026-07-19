# Tasks — 04_exercise_detail

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [ ] Implement `services/exercises.ts#getPlanExerciseDetail` with `Result<T>`
      pattern and `maybeSingle` (R1, R7, R10)
- [ ] Add `PlanExerciseDetail` type composing `03` types (R10)
- [ ] Build `ExerciseMedia` (GIF over thumbnail placeholder, fixed aspect,
      Spanish alt) (R2)
- [ ] Build `InstructionSteps` (`<ol>` numbered Spanish steps) (R3)
- [ ] Build `ExerciseScreen`: title, targets + rest, chips, notes, attribution,
      back control, loading/error/not-found states (R1, R4–R9)
- [ ] Unit tests for the service (found / null / error) (R1, R7)
- [ ] Component tests: full render, step order, attribution, not-found,
      retry, placeholder swap (R2–R7, R9)
- [ ] E2E: routine → exercise detail → back (R1, R8)
- [ ] Run `./init.sh` + `./init.sh e2e`; all green

## Verification

- Mapping: R1 → service test + screen test; R2 → ExerciseMedia test; R3 →
  steps-order test; R4/R5 → render tests; R6 → attribution test; R7 →
  not-found test (mock null); R8 → e2e back step; R9 → retry test; R10 →
  grep `supabase.from` outside `services/` = 0.
- Coverage ≥ 80% lines on `services/exercises.ts` + `ExerciseScreen`.
- Manual (phone): GIF plays, no layout jump on slow network (throttle).
