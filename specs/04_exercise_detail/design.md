# Design — 04_exercise_detail

**Source:** solution_design §4.1 (Ejercicio), §3.1/§3.4 (campos); client_requirement RF-3, §6

## Approach

Read-only UI slice over one new service function. The screen becomes the host
that `05` later extends with the logging section — keep its layout composable
(header / media / info / [future logging slot]).

## Services

```
services/exercises.ts
  getPlanExerciseDetail(planExerciseId: string): Promise<Result<PlanExerciseDetail | null>>
    plan_exercises
      .select('*, exercises(*)')
      .eq('id', planExerciseId)
      .maybeSingle()
```

`PlanExerciseDetail` = `PlanExercise & { exercises: Exercise }` (types from
`03`). `maybeSingle` → `null` covers both nonexistent ids and RLS-filtered
rows (R7) with the same rendering path.

## Screens / components

```
ExerciseScreen (/ejercicio/:planExerciseId)
  ← back to "/"                                   (R8)
  <ExerciseMedia>   gif_url with image_url as poster/placeholder,
                    fixed aspect box (180×180 source), alt="Demostración de {name}" (R2)
  title: name                                     (R1)
  <TargetBadge>     "4 × 8-12" + "Descanso: 120 s" when rest_seconds (R4)
  chips: equipment, target                        (R5)
  notes callout when notes ≠ null                 (R5)
  <InstructionSteps> <ol> from instruction_steps_es (R3)
  <Attribution>     "© Gym visual — gymvisual.com" link (R6)
  states: loading / error+Reintentar / "Ejercicio no encontrado"+volver (R7, R9)
```

GIF loading (R2): render `<img src={gif_url}>` over a container whose
background is the thumbnail; swap opacity on `onLoad`. Reserve the box with
`aspect-square max-w-[240px]` to avoid layout shift.

## Auth & security

Behind `ProtectedRoute`. RLS on `plan_exercises` (join chain to `plans`)
means foreign ids resolve to `null` → not-found state (R7). Read-only: no
writes anywhere in this feature.

## Validation

None (read-only; route param is passed opaquely to the query).

## Test approach

- Unit: `exercises.ts` query shape, `null` and error paths (mocked client)
  (R1, R7, R10).
- Component (RTL, mocked service): full render (title, steps order, targets,
  chips, notes, attribution) (R1, R3–R6); not-found (R7); loading/error/retry
  (R9); GIF placeholder swap (R2).
- E2E: from seeded routine, open an exercise → GIF request issued, steps
  visible, back returns to Hoy (R1, R8).
- Coverage ≥ 80% lines on `services/exercises.ts` + `ExerciseScreen`.

## Open items / discrepancias

(none)
