# Tasks — 03_today_view

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [x] Write `lib/types.ts` row types mirroring the `01` schema (R9)
- [x] Write `lib/utils.ts`: `todayLocalISO()` + `formatDateEs()` with unit
      tests (R2)
- [x] Implement `services/plans.ts` (`getActivePlan`, `getPlanDay`,
      `getDayExercises`) with the `Result<T>` error pattern (R9)
- [x] Implement `usePlanDay(selectedDate)` hook composing the three calls (R1,
      R8)
- [x] Build `ExerciseCard` (thumbnail, name, sets × reps, link, ≥44px) (R7,
      R10)
- [x] Build `TodayScreen`: date header + prev/next with edge clamping, and the
      four body states + loading/error/retry (R1, R3, R4, R5, R6, R8)
- [x] Add `e2e/fixtures/test-plan.sql` seed snippet (plan + 3 days: normal,
      rest, gap) for manual/E2E verification (acceptance)
- [x] Unit tests for services + utils (mocked client) (R2, R9)
- [x] Component tests for the four states, arrows, retry, link (R1, R3–R8)
- [x] E2E: login → today renders seeded routine → navigate to rest day (R1,
      R3, R6)
- [x] Run `./init.sh` + `./init.sh e2e`; all green

## Verification

- Mapping: R1 → TodayScreen.test "renders exercises in position order" + e2e;
  R2 → utils.test timezone cases; R3/R4/R5 → state tests; R6 → arrow tests +
  e2e; R7 → card link test; R8 → retry test; R9 → services tests + grep (no
  `supabase.from` outside `services/`); R10 → class assertions.
- Coverage ≥ 80% lines on `services/plans.ts`, `lib/utils.ts`,
  `hooks/usePlanDay`.
- Manual: seeded plan on the phone shows today; arrows clamp at plan edges.
