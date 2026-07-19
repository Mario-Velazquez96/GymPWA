# Design — 03_today_view

**Source:** solution_design §4.1 (Hoy), §4.2 (UX), §3 (tablas); client_requirement RF-2

## Approach

First data-reading slice: row types + `services/plans.ts` + the Hoy screen.
Services are pure supabase-js query functions (unit-testable with a mocked
client); the screen owns selected-date state and renders the four states.

## Services

```
lib/types.ts        Plan, PlanDay, PlanExercise, Exercise (mirror 01 schema)
services/plans.ts
  getActivePlan(): Promise<Result<Plan | null>>
      plans.select().eq('status','active').limit(1)          // RLS scopes user
  getPlanDay(planId, isoDate): Promise<Result<PlanDay | null>>
      plan_days.select().eq('plan_id',planId).eq('day_date',isoDate).maybeSingle()
  getDayExercises(planDayId): Promise<Result<PlanExerciseWithExercise[]>>
      plan_exercises.select('*, exercises(id,name,image_url,equipment,target)')
        .eq('plan_day_id',planDayId).order('position')
```

`Result<T> = { data: T, error: null } | { data: null, error: string }` with
Spanish error strings — every screen consumes errors uniformly (R8, R9).

`lib/utils.ts`: `todayLocalISO()` (device-local date, R2) and
`formatDateEs(iso)` ("lun 3 ago") via `Intl.DateTimeFormat('es-MX')`.

## Screens / components

```
TodayScreen
  state: selectedDate (init todayLocalISO()), plan/day/exercises + loading/error
  header: ‹ [fecha en español] ›   (arrows disabled at start/end_date, R6)
  body:  list of <ExerciseCard>   (R1, R7)
       | RestDay ("Día de descanso")            (R3)
       | EmptyDay ("Sin rutina asignada…")      (R4)
       | NoPlan ("Sin plan activo")             (R5)
       | Loading spinner / Error + "Reintentar" (R8)
ExerciseCard  — <Link to={`/ejercicio/${pe.id}`}> thumbnail 56px, name,
                "4 × 8-12", min-h-11 (R7, R10)
```

Data flow: screen → `useEffect` per selectedDate → services. No fetching in
`ExerciseCard`. A `usePlanDay(selectedDate)` hook wraps the three calls to keep
the screen thin.

## Auth & security

Screen sits behind `ProtectedRoute` (feature `02`). RLS guarantees only Mario's
plan rows return; the "Sin plan activo" state doubles as the denial rendering.

## Validation

None (read-only). Date arithmetic uses ISO strings + `Date` at local midnight.

## Test approach

- Unit: `plans.ts` query shapes + error mapping (mocked client) (R9);
  `todayLocalISO`/`formatDateEs` incl. timezone edge (R2).
- Component (RTL, mocked services): the four body states (R1, R3, R4, R5),
  edge-disabled arrows (R6), retry on error (R8), card link target (R7).
- E2E: with the seeded test plan, today renders and day navigation works
  (R1, R6). Seed SQL lives in `e2e/fixtures/test-plan.sql`.
- Coverage ≥ 80% lines on `services/plans.ts` + `lib/utils.ts`.

## Open items / discrepancias

(none — resolved 2026-07-18: prev/next arrows confirmed.)
