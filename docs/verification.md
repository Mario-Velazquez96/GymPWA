# docs/verification.md — How to verify your work

Read before declaring any task `done`. The fastest path is `./init.sh`, which
runs the code-quality gates in order and stops at the first failure.

## Steps

1. **Type-check.**
   ```
   pnpm typecheck      # tsc --noEmit
   ```
   Zero errors. No new `any` / `@ts-ignore` without justification.

2. **Lint.**
   ```
   pnpm lint           # eslint
   ```
   Zero errors. No leftover `console.log`/debug code.

3. **Unit / component tests + coverage.**
   ```
   pnpm test           # vitest run --coverage
   ```
   All pass. Coverage meets the target in `tasks.md` (default ≥ 80% lines on
   changed modules). Tests must assert behaviour, not just execute lines —
   cover positive, negative, and edge paths (rest day, no active plan, failed
   insert, empty history). Mock the supabase client at the `services/` boundary.

4. **E2E tests** (for any feature with user-facing flows).
   ```
   pnpm test:e2e       # playwright test
   ```
   Skip only if the feature has no UI behaviour — and say so explicitly in the
   progress file. Run against the production build (`pnpm preview`) when the
   feature touches PWA/service-worker behavior.

5. **Production build.**
   ```
   pnpm build          # vite build (emits manifest + service worker)
   ```
   Must succeed. For PWA features, confirm the built `dist/` contains the
   manifest and service worker, and smoke-test with `pnpm preview`.

6. **Migrations** (only if the data model changed).
   The new `supabase/migrations/NNN_*.sql` applies cleanly to the Supabase
   project (SQL editor or `supabase db push`), including its RLS policies, and
   does not break the contract with the `Gym` repo (exercise IDs, table shapes
   in `solution_design.md` §3).

7. **RLS sanity** (only if policies changed). Verify with the anon key that:
   an unauthenticated client reads no plan/log rows; an authenticated user
   reads only their own; writes outside `workout_logs` are rejected.

8. **Requirement traceability.** For each `R<n>` in `requirements.md`, confirm at
   least one test exercises it. Record the mapping in your progress file, e.g.
   `R3 → logs.test.ts > "inserta una fila por serie guardada"`.

9. **Clean up.** No dead code, no debug logging, no TODOs without context, no new
   undocumented env var (add it to `.env.example`), no committed secrets.

## Definition of done

A task is `done` only when steps 1–9 pass (i.e. `./init.sh` exits 0, plus the
manual traceability/migration/RLS checks) **and** the reviewer has written
APPROVE in `progress/review_<feature>.md`. See `CHECKPOINTS.md` for the full
objective list.
