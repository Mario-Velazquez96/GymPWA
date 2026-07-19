# Tasks — 01_supabase_schema_and_rls

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [x] Resolve open items with the human: exercises read access,
      check-constraint addition, bucket SQL ownership — resolved 2026-07-18
      (authenticated-only / keep constraints / bucket SQL in Gym repo)
- [ ] Write `supabase/migrations/001_schema.sql` — five tables + index verbatim
      from solution_design §3.1–3.5 (R1)
- [ ] Add the three `workout_logs` check constraints to `001_schema.sql` (R2)
- [ ] Write `supabase/migrations/002_rls.sql` — enable RLS + the nine policies
      from design.md (R3, R4, R5, R6)
- [ ] Write `supabase/README.md`: apply order, dashboard/CLI instructions,
      manual user creation note, bucket dependency note, denial-check script
      usage (R9)
- [ ] Apply both migrations to the Supabase project; capture success in
      `progress/impl_01_supabase_schema_and_rls.md` (R1–R6)
- [ ] Run the denial checks: anon selects return `[]` on all five tables (R7)
- [ ] Run the spoofed-`user_id` insert check (rejected) and the own-`user_id`
      insert/delete check (succeeds) (R6, R8)
- [ ] Run the information_schema contract check against §3 column list (R1)

## Verification

- Both SQL files apply with zero errors on a fresh run (idempotence not
  required — they are one-time migrations; document that).
- R1 → contract check output; R2 → constraint present + a `weight_kg = -1`
  insert fails; R3–R6 → `pg_policies` listing matches design; R7/R8 → denial
  script output pasted in the progress file; R9 → README review.
- No TS code changed → `./init.sh quick` still green (no regressions).
