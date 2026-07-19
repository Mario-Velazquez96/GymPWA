# Requirements — 01_supabase_schema_and_rls

**Feature:** Versioned SQL schema + RLS policies (the cross-repo contract)
**Source:** solution_design §3 (data model), §3.6 (RLS); client_requirement RF-6
**Depends on:** 00_project_setup

## Purpose

Create the entire database contract as versioned SQL in `supabase/migrations/`:
the five tables from solution_design §3, their index, and the RLS policies that
make the public anon key safe. This SQL is shared with the `Gym` repo (which
seeds `exercises` and uploads plans with the service key) — it must match §3
exactly. No app code in this feature beyond documentation.

## In scope

- `supabase/migrations/001_schema.sql`: tables `exercises`, `plans`,
  `plan_days`, `plan_exercises`, `workout_logs` + the `workout_logs` index,
  exactly as solution_design §3.1–3.5.
- `supabase/migrations/002_rls.sql`: enable RLS on all five tables + policies
  per §3.6.
- Check constraints on `workout_logs` (`set_number >= 1`, `reps >= 1`,
  `weight_kg >= 0`).
- `supabase/README.md`: how to apply the SQL (dashboard SQL editor or
  `npx supabase db push`) and how to run the RLS denial checks.

## Out of scope

- Seeding `exercises` and uploading media/plans (owned by the `Gym` repo,
  RF-6).
- Creating Mario's auth user (manual, dashboard — noted in README).
- Any TypeScript (row types land with `02`/`03` services).

## Requirements (EARS)

**R1 (Ubiquitous):** `supabase/migrations/` shall define the tables
`exercises`, `plans`, `plan_days`, `plan_exercises`, and `workout_logs` with
exactly the columns, types, defaults, and constraints of solution_design
§3.1–3.5, plus the index
`workout_logs (user_id, exercise_id, performed_at desc)`.

**R2 (Ubiquitous):** `workout_logs` shall enforce `set_number >= 1`,
`reps >= 1`, and `weight_kg >= 0` via check constraints.

**R3 (Ubiquitous):** All five tables shall have RLS **enabled**.

**R4 (Ubiquitous):** `exercises` shall have a select policy for the
`authenticated` role only, and no insert/update/delete policies.

**R5 (Ubiquitous):** `plans` shall have a select policy
`user_id = auth.uid()`; `plan_days` and `plan_exercises` shall have select
policies that check ownership via their parent chain up to `plans.user_id`;
none of the three shall have insert/update/delete policies.

**R6 (Ubiquitous):** `workout_logs` shall have select/insert/update/delete
policies restricted to `user_id = auth.uid()` (insert/update also via
`with check`).

**R7 (Unwanted behavior):** If an unauthenticated (anon) client selects from
any of the five tables, then the query shall return zero rows and no error.

**R8 (Unwanted behavior):** If an authenticated user inserts into `workout_logs`
with a `user_id` different from `auth.uid()`, then the insert shall be
rejected.

**R9 (Ubiquitous):** `supabase/README.md` shall document how to apply the
migrations in order and how to execute the denial checks (R7, R8).

## Acceptance

The two SQL files apply cleanly (in order) to the Supabase project with no
errors. The RLS denial checks pass. The `Gym` repo's scripts can later seed
`exercises` and insert plans with the service key (which bypasses RLS) without
any schema mismatch — column names/types identical to §3.

## Open items

(none — resolved 2026-07-18 by the human: `exercises` read is
**authenticated-only**; the `workout_logs` **check constraints stay**; the
`exercise-media` bucket SQL **lives in the `Gym` repo** and is only documented
here as a dependency.)
