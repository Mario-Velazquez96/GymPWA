# Design — 05_workout_logging

**Source:** solution_design §3.5 (workout_logs + query "anterior"), §4.1–4.2 (UX); client_requirement RF-4/RF-5

## Approach

The write slice. `services/logs.ts` owns the three queries; `ExerciseScreen`
(from `04`) gains a logging section whose state machine per row is:
`editable → saving → saved | error(editable)`.

## Services

```
services/logs.ts
  getPreviousSession(exerciseId, beforeISO): Promise<Result<WorkoutLog[]>>
      workout_logs.select().eq('exercise_id',exerciseId).lt('performed_at',beforeISO)
        .order('performed_at',{ascending:false}).order('set_number').limit(10)
      → filter client-side to only the rows of the max performed_at returned
        (the "última sesión", §3.5)
  getSessionSets(exerciseId, isoDate): Promise<Result<WorkoutLog[]>>
      .eq('performed_at', isoDate).order('set_number')                (R8)
  logSet(input: NewLog): Promise<Result<WorkoutLog>>
      insert({...input, user_id: session.user.id}).select().single() (R5)
```

`NewLog` = `{ exercise_id, plan_exercise_id, performed_at, set_number, reps,
weight_kg }`. `user_id` comes from the live session; RLS `with check` rejects
anything else. No other service writes anywhere (R9).

## Components / state

```
ExerciseScreen  + <LoggingSection planExercise={...}>
LoggingSection
  loads previous session (R2) + today's sets (R8) via useWorkoutLog hook
  rows: SetRowState[] = saved rows (from today) ++ editable rows up to
        target_sets ++ user-added rows ("Agregar serie", R1)
SetRow
  [Serie N]  [Anterior: 22.5 × 10 | —]        (R2)
  <Stepper value=weight step=2.5 min=0 unit="kg">   (R4)
  <Stepper value=reps   step=1   min=1>
  [Guardar serie]  → saving(disabled, R10) → ✓ saved(disabled, R5)
                   → error: inline "No se pudo guardar la serie, reintenta" (R6)
Stepper  — buttons min-h-11 min-w-11, center value tappable → numeric
           <input inputmode="decimal">, blur/enter commits (R4)
```

**Prefill (R3):** for row *n*: previous-session set *n* → else values of row
*n−1* (current UI state) → else `{ weight: 0, reps: parseInt(target_reps) || 10 }`.
Computed once when rows initialize; user edits win afterwards.

**Dates:** `performed_at = todayLocalISO()` (util from `03`) — explicit, never
the DB default (see requirements open item).

## Auth & security

Insert path relies on session + RLS `with check (user_id = auth.uid())`. The
app still writes only `workout_logs` (AGENTS.md hard rule). Double-submit
guarded client-side (R10); retry after failure re-runs the same single insert
(R6) — no optimistic insert, the row is only "saved" on confirmed response.

## Validation

`validateSet({weight_kg, reps})`: weight ≥ 0 ∧ (weight*2 is integer) ∧
reps ≥ 1 → Spanish message per violation (R7). Pure function, unit-tested.
DB check constraints from `01` are the backstop.

## Test approach

- Unit: `logs.ts` (previous-session max-date filtering, insert payload incl.
  `user_id` and local `performed_at`, error paths) (R2, R5, R9);
  `validateSet` matrix (R7); prefill chain (R3).
- Component (RTL, mocked services): row rendering from target_sets +
  add-row (R1); Anterior column with/without data (R2); stepper min/step and
  direct entry (R4); save flow → saved state (R5); failure keeps values +
  message + retry (R6); in-flight disabled (R10); reopen renders today's saved
  sets (R8).
- E2E: log two sets, reload, both show as saved (R5, R8).
- Coverage ≥ 85% lines on `services/logs.ts` + prefill/validation utils (this
  is the app's core).

## Open items / discrepancias

(none — the three items were confirmed by the human on 2026-07-18.)
