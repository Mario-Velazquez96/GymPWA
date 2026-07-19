# Session history (append-only)

## 2026-07-19 — 00_project_setup: implemented, reviewed, DONE

Bootstrapped the app at the repo root: Vite 8 + React 19 + TS 5.9 strict with
`@/` alias; Tailwind v4 (`@tailwindcss/vite`); React Router 7 with the 4 routes
(`/login`, `/`, `/ejercicio/:planExerciseId`, `/historial/:exerciseId`) as
Spanish placeholder screens; `src/lib/supabase.ts` singleton (only
`createClient`, exports `supabase | null` + `isConfigured`) with the
`<ConfigError />` missing-env screen (`/login` renders unguarded); vite-plugin-pwa
autoUpdate with manifest stub "Rutinas Gym" (build emits
`dist/manifest.webmanifest` + `sw.js` + `registerSW.js`); ESLint 10 flat +
Prettier; `.env.example` (two `VITE_` vars) with `.env.local` gitignored;
`vercel.json` SPA rewrite (Vercel-only). Tests: 14 Vitest+RTL (coverage 100%
lines, `src/lib/` 100%) + 1 Playwright smoke on `/login` vs `pnpm preview`.
Gates: `./init.sh` and `./init.sh e2e` both exit 0 — no Supabase credentials
needed. Reviewer: **APPROVE** (`progress/review_00_project_setup.md`).
Details: `progress/impl_00_project_setup.md`.

## 2026-07-19 — 01_supabase_schema_and_rls: implemented, reviewed, DONE

Authored `supabase/migrations/001_schema.sql` (5 tables + `workout_logs` index
verbatim from solution_design §3.1–3.5, + the 3 check constraints) and
`002_rls.sql` (RLS enabled on all 5 tables + 8 policies: 4 read-only selects,
4 `workout_logs` CRUD scoped to `auth.uid()`), plus `supabase/README.md` and
`scripts/check-rls.mjs` (plain Node, no new deps, reads `.env.local`, never
prints values). The **human applied 001 then 002** to the live Supabase project
via the SQL Editor. Verification all green: `node scripts/check-rls.mjs` →
anon-without-session gets 0 rows on all 5 tables (R7) and a spoofed-`user_id`
insert into `workout_logs` is rejected by RLS (R8); contract check via REST
probes → 42/42 columns and all 24 non-text types match §3, and the 3 R2 check
constraints fire with `23514` (information_schema/OpenAPI need the secret key,
absent here by design). `./init.sh quick` green (no TS changes). Reviewer:
**APPROVE** after one trivial doc fix (policy count "nueve" → "ocho";
comment-only in `002_rls.sql`, nothing re-applied)
(`progress/review_01_supabase_schema_and_rls.md`).
**Cross-repo pending:** re-run `node scripts/check-rls.mjs` after the `Gym`
repo seeds `exercises` — the own-`user_id` insert check (c) is currently SKIP
by design (FK on `exercise_id` blocks inserts against an empty catalog).
Details: `progress/impl_01_supabase_schema_and_rls.md`.
