# Design — 06_history

**Source:** solution_design §4.1 (Historial), §3.5; client_requirement RF-5

## Approach

Small read-only slice reusing existing patterns: one new service function, one
screen, one entry point added to `ExerciseScreen`.

## Services

```
services/logs.ts  (extend)
  getExerciseHistory(exerciseId): Promise<Result<WorkoutLog[]>>
      workout_logs.select().eq('exercise_id', exerciseId)
        .order('performed_at', {ascending:false}).order('set_number')
      // RLS scopes to the signed-in user

services/exercises.ts  (extend)
  getExercise(exerciseId): Promise<Result<Exercise | null>>
      exercises.select().eq('id', exerciseId).maybeSingle()   (R3, R8)
```

Grouping into sessions is a pure helper: `groupByDate(logs) →
{ date, sets[] }[]` (unit-tested; preserves newest-first order, R1).

## Screens / components

```
HistoryScreen (/historial/:exerciseId)
  ← back
  title: exercise.name                       (R3)
  <SessionCard> per date                     (R1)
     header: formatDateEs(date, {year:true}) (R2)
     rows: "Serie N — 22.5 kg × 10"          (R2, R7 formatting via formatKg())
  states: loading / error+Reintentar (R6) / empty (R4) / not-found (R8)

ExerciseScreen  + link "Ver historial" → /historial/{exercise_id}  (R5, ≥44px)
```

`formatKg(n)`: integer → "22 kg", fractional → "22.5 kg" (R7), in `lib/utils.ts`.

## Auth & security

Behind `ProtectedRoute`; RLS returns only own logs (the empty state doubles as
denial rendering). Read-only — no writes.

## Validation

None (read-only).

## Test approach

- Unit: `groupByDate` (ordering, multi-set days) (R1); `formatKg` (R7);
  `getExerciseHistory` query shape + error (mocked client) (R1, R6).
- Component (RTL, mocked services): sessions render newest-first with set
  lines (R1, R2); title (R3); empty (R4); retry (R6); not-found (R8).
- E2E: from exercise screen, "Ver historial" shows the sets logged in the `05`
  E2E flow (R1, R5).
- Coverage ≥ 80% lines on new service functions + `groupByDate`/`formatKg`.

## Open items / discrepancias

(none — resolved 2026-07-18: no pagination for MVP.)
