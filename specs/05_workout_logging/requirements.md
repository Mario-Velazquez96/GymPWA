# Requirements — 05_workout_logging

**Feature:** Registro de series + comparación con la sesión anterior
**Source:** client_requirement RF-4, RF-5 (comparación); solution_design §3.5, §4.1–4.2
**Depends on:** 04_exercise_detail

## Purpose

The core value of the app: on the exercise screen, log each performed set
(reps + weight in kg) with one-hand steppers and an immediate insert per set,
while seeing — and starting from — what was lifted in the previous session of
that exercise. This is the **only** write path in the whole app
(`workout_logs`).

## In scope

- `services/logs.ts`: `getPreviousSession(exerciseId, beforeDate)`,
  `getSessionSets(exerciseId, date)`, `logSet(input)`.
- Logging section on `ExerciseScreen`: one `SetRow` per target set (+ "Agregar
  serie"), weight/reps `Stepper` components, per-row "Guardar serie", the
  "Anterior" comparison column, prefill.
- Client-side validation of the three numeric fields.

## Out of scope

- Editing/deleting already-saved sets (MVP cut — see open items).
- Offline queue for logs (explicitly future work, solution_design §4.2).
- History screen (→ `06_history`).

## Requirements (EARS)

**R1 (Event-driven):** When the exercise detail loads, the system shall render
`target_sets` set rows (numbered from 1), plus an "Agregar serie" control that
appends an additional row.

**R2 (Event-driven):** When the set rows render, the system shall load the
previous session (most recent `performed_at` strictly before today for that
`exercise_id`) and show each row's "Anterior" value as "peso × reps" for the
matching `set_number`, or "—" when none exists.

**R3 (Event-driven):** When a set row initializes, its weight and reps shall be
prefilled from the previous session's matching `set_number`; if absent, from
the nearest previous row of the current session; if none, weight 0 kg and reps
= the first number parsed from `target_reps` (fallback 10).

**R4 (Ubiquitous):** Weight shall adjust via stepper buttons of ±2.5 kg
(min 0, in kg) and reps via ±1 (min 1); both values shall also accept direct
numeric entry; all stepper/save targets shall be ≥ 44px.

**R5 (Event-driven):** When "Guardar serie" is tapped on a row, the system
shall insert exactly one `workout_logs` row with `exercise_id`,
`plan_exercise_id`, `set_number`, `reps`, `weight_kg`, and `performed_at` set
to the **device-local date**, then mark the row as saved (✓) and disable its
save control.

**R6 (Unwanted behavior):** If the insert fails, then the row shall remain
editable with its values intact and show "No se pudo guardar la serie,
reintenta"; no partial or duplicate write shall result from retrying.

**R7 (Unwanted behavior):** If weight < 0, reps < 1, or weight is not a
multiple of 0.5, then the save shall be blocked client-side with a Spanish
message (DB checks from `01` are the backstop).

**R8 (Event-driven):** When the screen re-opens on the same local date, sets
already saved today for that exercise shall render as saved rows (values +
✓), not as empty rows.

**R9 (Ubiquitous):** All log queries/mutations shall live in
`services/logs.ts`; `workout_logs` shall remain the only table the app writes
to.

**R10 (State-driven):** While a save request is in flight, the row's save
control shall be disabled (no double-tap duplicates).

## Acceptance

Gym scenario on the phone: open today's bench press, see "Anterior 22.5 × 10"
per set, adjust with thumbs, save each set with one tap, each save survives a
reload (R8). Kill the network mid-save → Spanish error, values intact, retry
succeeds once. Rows never double-insert.

## Open items

(none — all three resolved 2026-07-18 by the human: prefill fallback "first
number of `target_reps`, else 10" **confirmed**; editing/deleting saved sets
**out of scope for MVP**; `performed_at` = **device-local date** confirmed.)
