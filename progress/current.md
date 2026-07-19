# Current session

## Feature in progress
(none — 00_project_setup is done; next up: 01_supabase_schema_and_rls)

## State
2026-07-19: `00_project_setup` closed (implemented + reviewer APPROVE, see
`progress/history.md`). Next feature is **01_supabase_schema_and_rls** at
`spec_ready`.

## Notes / blockers
- **⏸ Human approval gate:** 01's spec needs human approval before setting it
  `in_progress` and launching the implementer.
- **Blocked on Supabase project credentials:** no Supabase project exists yet.
  Once created, put the real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  in `.env.local` (currently holds placeholder values; gitignored). Only the
  anon key — the service key stays in the Gym repo.
