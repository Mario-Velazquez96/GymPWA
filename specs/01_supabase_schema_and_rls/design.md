# Design — 01_supabase_schema_and_rls

**Source:** solution_design §3.1–3.6; docs/architecture.md "Data access & security"

## Approach

Schema + RLS layer, shipped together as two numbered SQL files. The SQL in
solution_design §3 is copied **verbatim** for tables (contract with the `Gym`
repo), then extended with the check constraints and the RLS policy set.

## Schema (`001_schema.sql`)

The five `create table` statements + index exactly as §3.1–3.5, with the three
check constraints added to `workout_logs`:

```sql
alter table workout_logs
  add constraint workout_logs_set_number_check check (set_number >= 1),
  add constraint workout_logs_reps_check       check (reps >= 1),
  add constraint workout_logs_weight_check     check (weight_kg >= 0);
```

## RLS (`002_rls.sql`)

```sql
alter table exercises      enable row level security;
alter table plans          enable row level security;
alter table plan_days      enable row level security;
alter table plan_exercises enable row level security;
alter table workout_logs   enable row level security;

create policy exercises_select on exercises
  for select to authenticated using (true);

create policy plans_select on plans
  for select to authenticated using (user_id = auth.uid());

create policy plan_days_select on plan_days
  for select to authenticated using (
    exists (select 1 from plans p
            where p.id = plan_days.plan_id and p.user_id = auth.uid()));

create policy plan_exercises_select on plan_exercises
  for select to authenticated using (
    exists (select 1 from plan_days d join plans p on p.id = d.plan_id
            where d.id = plan_exercises.plan_day_id and p.user_id = auth.uid()));

create policy workout_logs_select on workout_logs
  for select to authenticated using (user_id = auth.uid());
create policy workout_logs_insert on workout_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy workout_logs_update on workout_logs
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy workout_logs_delete on workout_logs
  for delete to authenticated using (user_id = auth.uid());
```

No write policies on the four read-only tables: the app cannot write them, and
the `Gym` repo's service key bypasses RLS (RF-6 intact).

## Auth & security

RLS is the entire enforcement (anon key is public). Denial semantics: RLS
filters rows, so unauthorized selects return **empty**, not errors (R7); the
`with check` insert policy rejects spoofed `user_id` (R8). Mario's auth user is
created manually in the dashboard (documented in `supabase/README.md`).

## Validation

DB-level only (R2 checks). Client-side validation arrives with `05`.

## Test approach

No app unit tests (no TS code). Verification is operational, scripted in
`supabase/README.md`:

1. Apply both files in order on the Supabase project (SQL editor or
   `npx supabase db push`) — no errors (R1–R6).
2. **Denial checks (R7, R8):** a small Node script (or manual REST calls) using
   the **anon key without session** selects each table → expects `[]`; signs in
   as Mario and inserts a `workout_logs` row with a foreign `user_id` → expects
   a policy violation error; inserts with own `user_id` → succeeds, then
   deletes it.
3. Contract check: `select column_name, data_type from information_schema.columns`
   for the five tables matches §3.

## Open items / discrepancias

(none — all three resolved 2026-07-18: authenticated-only reads, check
constraints kept, bucket SQL owned by the `Gym` repo.)
