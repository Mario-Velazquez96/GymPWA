# Requirements — 06_history

**Feature:** Historial por ejercicio (evolución de peso/reps)
**Source:** client_requirement RF-5 (historial); solution_design §4.1 (pantalla Historial)
**Depends on:** 05_workout_logging

## Purpose

Let Mario review, per exercise, everything he has logged over time — sessions
ordered newest-first, each with its sets (weight × reps) — so he can see his
progression across weeks. Read-only over `workout_logs` + `exercises`.

## In scope

- `services/logs.ts#getExerciseHistory(exerciseId)` (extends the `05` service).
- `HistoryScreen` at `/historial/:exerciseId`.
- "Ver historial" entry point on the exercise screen.
- Loading / empty / error states in Spanish.

## Out of scope

- Charts/graphs (list-first MVP; a chart is a possible future polish).
- Cross-exercise summaries or filtering by date range.
- Editing logs from the history view.

## Requirements (EARS)

**R1 (Event-driven):** When `HistoryScreen` mounts with a valid `exerciseId`,
the system shall load that exercise's `workout_logs` for the current user and
group them into sessions by `performed_at`, ordered newest-first.

**R2 (Ubiquitous):** Each session shall show its date in Spanish (e.g.
"lun 3 ago 2026") and its sets ordered by `set_number` as
"Serie N — 22.5 kg × 10".

**R3 (Ubiquitous):** The screen title shall show the exercise `name` (loaded
via the existing exercises service).

**R4 (Unwanted behavior):** If the exercise has no logs, then the screen shall
show "Aún no hay registros de este ejercicio" (and the header still renders).

**R5 (Event-driven):** When "Ver historial" is activated on the exercise
screen, the system shall navigate to `/historial/<exercise_id>`.

**R6 (State-driven / Unwanted):** While loading, a loading state shall show;
if a query fails, "No se pudo cargar el historial" with retry shall show.

**R7 (Ubiquitous):** Queries live in `services/` only; weights render in kg
with one decimal when fractional (e.g. "22.5 kg"); touch targets ≥ 44px.

**R8 (Unwanted behavior):** If the `exerciseId` does not exist in `exercises`,
then the screen shall show "Ejercicio no encontrado" with a control back to
"Hoy".

## Acceptance

After logging sessions on two different days: opening history from the bench
press screen shows both sessions newest-first with correct per-set lines; an
exercise never logged shows the empty state; a bogus id shows not-found. RLS
proof: the query path returns only the signed-in user's logs.

## Open items

(none — resolved 2026-07-18: no pagination for MVP, full history in one
query.)
