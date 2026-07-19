# Requirements — 03_today_view

**Feature:** Pantalla "Hoy" — routine of the day + day navigation
**Source:** client_requirement RF-2; solution_design §4.1 (pantalla Hoy), §3
**Depends on:** 02_auth

## Purpose

The main screen: on open, show the day of the **active plan** matching the
device's current date — day title and the ordered exercise list (thumbnail,
name, target sets × reps) — with navigation to other days of the plan and clear
states for rest days, unassigned days, and no active plan. Read-only; tapping
an exercise navigates to its detail (placeholder until `04`).

## In scope

- `lib/types.ts`: row types for `Plan`, `PlanDay`, `PlanExercise`, `Exercise`
  (matching `01` schema).
- `services/plans.ts`: `getActivePlan()`, `getPlanDay(planId, date)`,
  `getDayExercises(planDayId)` (join to `exercises` for name/thumbnail).
- `TodayScreen` with day header, prev/next day navigation, exercise list.
- `ExerciseCard` component (thumbnail `image_url`, name, `target_sets` ×
  `target_reps`).
- Loading / empty / error states in Spanish.

## Out of scope

- Exercise detail content (→ `04_exercise_detail`).
- Logging and comparison (→ `05_workout_logging`).
- Caching of thumbnails (→ `07_pwa_install_and_cache`).

## Requirements (EARS)

**R1 (Event-driven):** When `TodayScreen` mounts with an active plan and the
current date has a non-rest `plan_day`, the system shall show the day's `title`
and its exercises ordered by `position`, each with thumbnail, name, and
`target_sets` × `target_reps`.

**R2 (Ubiquitous):** "Today" shall be computed from the device's local date
(not UTC), formatted in Spanish (e.g. "lun 3 ago").

**R3 (State-driven):** While the selected `plan_day` has `is_rest = true`, the
screen shall show a rest-day state ("Día de descanso") and no exercise list.

**R4 (Unwanted behavior):** If the selected date has no `plan_day` row, then
the screen shall show "Sin rutina asignada para este día".

**R5 (Unwanted behavior):** If the user has no plan with `status = 'active'`,
then the screen shall show "Sin plan activo" and no day navigation.

**R6 (Event-driven):** When the previous/next day control is activated, the
system shall load and show that date's day, staying within the plan's
`start_date`–`end_date` range (controls disabled at the edges).

**R7 (Event-driven):** When an exercise card is tapped, the system shall
navigate to `/ejercicio/<plan_exercise.id>`.

**R8 (State-driven):** While day data is loading, the screen shall show a
loading state; **(Unwanted)** if a query fails, it shall show "No se pudo
cargar la rutina" with a retry control.

**R9 (Ubiquitous):** All queries shall go through `services/plans.ts` (no
`supabase.from` in components), returning typed rows and explicit errors.

**R10 (Ubiquitous):** Cards and navigation controls shall have touch targets
≥ 44px and Spanish labels.

## Acceptance

With a hand-inserted test plan in Supabase (SQL snippet provided in the spec's
verification): opening the app shows today's routine; navigating days shows
rest/unassigned states correctly; pulling the plan's edges disables navigation;
all states render in Spanish. RLS proof: a second user (or anon) sees "Sin plan
activo".

## Open items

(none — resolved 2026-07-18: **prev/next arrows + date header** confirmed.)
