# Requirements — 04_exercise_detail

**Feature:** Pantalla de ejercicio (read-only): GIF, instrucciones, objetivos
**Source:** client_requirement RF-3, §6 (atribución); solution_design §4.1 (pantalla Ejercicio)
**Depends on:** 03_today_view

## Purpose

Show everything Mario needs to perform one exercise from the day's routine:
animated GIF, step-by-step instructions in Spanish, the plan's targets (sets,
reps, rest), equipment/target muscle, the agent's notes, and the Gym Visual
attribution. Read-only — the logging UI lands on this same screen in `05`.

## In scope

- `services/exercises.ts`: `getPlanExerciseDetail(planExerciseId)` — one query
  joining `plan_exercises` → `exercises` (full detail fields).
- `ExerciseScreen` at `/ejercicio/:planExerciseId`.
- GIF display with thumbnail placeholder while loading; instruction steps;
  targets; equipment/target; notes; attribution.
- Back navigation to "Hoy".

## Out of scope

- Set logging, comparison, prefill (→ `05_workout_logging`).
- "Ver historial" entry point (→ `06_history`).
- GIF caching (→ `07_pwa_install_and_cache`).

## Requirements (EARS)

**R1 (Event-driven):** When `ExerciseScreen` mounts with a valid
`planExerciseId`, the system shall load the joined detail via
`getPlanExerciseDetail` and show the exercise `name` as the screen title.

**R2 (Ubiquitous):** The screen shall show the animated `gif_url` with a
meaningful Spanish `alt`; while the GIF loads, the `image_url` thumbnail (or a
placeholder) shall occupy the same space (no layout jump).

**R3 (Ubiquitous):** The screen shall render `instruction_steps_es` as an
ordered, numbered list in Spanish.

**R4 (Ubiquitous):** The screen shall show the plan targets: `target_sets` ×
`target_reps`, and `rest_seconds` as "Descanso: N s" when present.

**R5 (Ubiquitous):** The screen shall show `equipment` and `target` (muscle) as
informative labels, and the plan `notes` when present.

**R6 (Ubiquitous):** The attribution "© Gym visual — https://gymvisual.com/"
shall be visible on the screen wherever exercise media is shown.

**R7 (Unwanted behavior):** If `planExerciseId` does not exist or the query
returns no row (including RLS-filtered rows of another user), then the screen
shall show "Ejercicio no encontrado" with a control back to "Hoy" — never a
crash or blank screen.

**R8 (Event-driven):** When the back control is activated, the system shall
return to the "Hoy" screen.

**R9 (State-driven / Unwanted):** While loading, a loading state shall show;
if the query fails, "No se pudo cargar el ejercicio" with retry shall show.

**R10 (Ubiquitous):** The query shall live in `services/exercises.ts` (no
`supabase.from` in components); controls ≥ 44px; all text Spanish.

## Acceptance

From today's routine, tapping an exercise opens its detail: GIF plays,
numbered Spanish steps, "4 × 8-12 · Descanso: 120 s", equipment/muscle chips,
attribution visible. A bogus URL id shows the not-found state. Back returns to
Hoy.

## Open items

(none)
