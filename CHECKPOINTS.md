# CHECKPOINTS.md — Objective criteria for "correct final state"

Use this to self-evaluate. A checkpoint is **objective**: either the command
exits 0 / the file exists / the field is set, or it doesn't. No judgement calls.

## Per-feature checkpoints (run before marking a feature `done`)

A feature is correct only when **all** of the following hold:

- [ ] `specs/<feature>/{requirements,design,tasks}.md` all exist and `tasks.md`
      has every item checked `- [x]`.
- [ ] Every requirement `R<n>` in `requirements.md` maps to at least one test
      (the reviewer enforces this — see `docs/specs.md` "Traceability contract").
- [ ] `pnpm typecheck` exits 0 (no TypeScript errors).
- [ ] `pnpm lint` exits 0 (no ESLint errors).
- [ ] `pnpm test` exits 0 and coverage meets the target in `tasks.md` (default
      ≥ 80% lines on changed modules).
- [ ] `pnpm test:e2e` exits 0 for any feature with user-facing flows (skip only
      if the spec has no UI behaviour — state that explicitly).
- [ ] `pnpm build` exits 0, and for PWA-affecting features the built `dist/`
      contains the web manifest and service worker.
- [ ] Any data-model change ships as a numbered SQL file in
      `supabase/migrations/` (tables **and** RLS policies) that applies cleanly
      to the Supabase project and keeps the `Gym`-repo contract intact
      (`solution_design.md` §3).
- [ ] The feature writes to no table other than `workout_logs`, and no service
      key or non-`VITE_` secret appears anywhere in the repo.
- [ ] No secrets committed; any new env var is documented in `.env.example`.
- [ ] `progress/review_<feature>.md` contains **APPROVE** from the reviewer.
- [ ] `feature_list.json` status is set to `done`; summary moved to
      `progress/history.md`.

## Project-level checkpoints (the whole app is "correct")

- [ ] Every feature in `feature_list.json` is `done` (or explicitly `blocked`
      with a documented reason in `progress/current.md`).
- [ ] `init.sh` runs end-to-end and exits 0 from a clean checkout
      (after `pnpm install` and a populated `.env.local`).
- [ ] The app deploys to Vercel/Netlify without build errors and is served over
      HTTPS.
- [ ] The deployed app is installable from Safari on iPhone ("Agregar a
      pantalla de inicio") and opens standalone (no browser chrome).
- [ ] All user-facing text is Spanish and weights are shown in kg.
- [ ] Exercise media shows the `© Gym visual` attribution.
- [ ] No `console.log`/`console.error` debug noise, no `TODO` without an owner
      and context, no dead code or unused exports.
- [ ] `README` / `.env.example` document how to run the app locally and which
      Supabase project + env vars are required.

## Quick self-check command

```
./init.sh           # install (if needed) → typecheck → lint → test → build
```

If `init.sh` exits 0, the per-feature code-quality checkpoints (typecheck, lint,
test, build) are satisfied. Traceability, migrations/RLS, and the review verdict
still require the manual checks above.
