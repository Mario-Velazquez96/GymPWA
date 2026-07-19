# Requirements — 00_project_setup

**Feature:** Bootstrap of the Vite + React + TypeScript PWA app
**Source:** solution_design §2 (stack), §4.3 (PWA), client_requirement §5 (non-functionals)
**Depends on:** none (foundation layer)

## Purpose

Create the application skeleton every other feature builds on: Vite + React +
TypeScript (strict), Tailwind, React Router with the four app routes as Spanish
placeholders, the supabase-js client singleton, vite-plugin-pwa scaffold, test
tooling (Vitest + RTL, Playwright), lint/format, env handling, and deploy
config. No real screens, no schema, no auth logic yet.

## In scope

- Vite + React + TS app (strict mode), `@/` → `src/` path alias.
- Tailwind CSS wired in (mobile-first defaults).
- React Router with routes `/login`, `/`, `/ejercicio/:planExerciseId`,
  `/historial/:exerciseId` rendering placeholder screens with Spanish titles.
- `src/lib/supabase.ts` client singleton + `.env.example`.
- `vite-plugin-pwa` scaffold (manifest stub + default precache; real caching
  strategy comes in `07_pwa_install_and_cache`).
- Vitest + React Testing Library, Playwright, ESLint + Prettier.
- `package.json` scripts: `typecheck`, `lint`, `test`, `test:e2e`, `build`,
  `preview`, `dev`. `./init.sh` green.
- SPA fallback rewrite config for Vercel/Netlify.

## Out of scope

- Any Supabase table/RLS (→ `01_supabase_schema_and_rls`).
- Real login/session logic (→ `02_auth`).
- Real screen content (→ `03`–`06`).
- Caching strategy, icons, install polish (→ `07_pwa_install_and_cache`).

## Requirements (EARS)

**R1 (Ubiquitous):** The repo shall contain a Vite + React + TypeScript app with
`strict: true` and a `@/` alias resolving to `src/`, where `pnpm typecheck`,
`pnpm lint`, and `pnpm build` all exit 0.

**R2 (Ubiquitous):** Tailwind CSS shall be integrated so utility classes render
in the built app (verified by a styled placeholder element).

**R3 (Ubiquitous):** React Router shall define the routes `/login`, `/`,
`/ejercicio/:planExerciseId`, and `/historial/:exerciseId`, each rendering a
placeholder screen whose visible title is in Spanish.

**R4 (Ubiquitous):** `src/lib/supabase.ts` shall export a supabase-js client
singleton created from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and
shall be the only `createClient` call in the codebase.

**R5 (Unwanted behavior):** If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`
is missing at startup, then the app shall render a clear Spanish configuration
error instead of a blank screen or undefined network calls.

**R6 (Ubiquitous):** `pnpm build` shall emit `dist/` containing a web manifest
and a registered service worker (vite-plugin-pwa default precache).

**R7 (Ubiquitous):** `package.json` shall define the scripts `dev`, `build`,
`preview`, `typecheck`, `lint`, `test`, and `test:e2e`, and `./init.sh` shall
exit 0.

**R8 (Ubiquitous):** `.env.example` shall document `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`; `.env.local` shall be gitignored; no other env vars
and no secrets shall exist in the repo.

**R9 (Ubiquitous):** A committed `vercel.json` shall define the SPA fallback
rewrite (all paths → `/index.html`) for Vercel hosting.

**R10 (Event-driven):** When `pnpm test` runs, at least one Vitest + RTL
component test shall pass; when `pnpm test:e2e` runs, at least one Playwright
smoke test shall load `/login` against the preview build and pass.

## Acceptance

From a clean checkout with a populated `.env.local`: `./init.sh` exits 0;
`pnpm preview` serves the app; navigating to the four routes shows Spanish
placeholder titles; `dist/` contains manifest + SW. No secrets in the repo.

## Open items

(none — resolved 2026-07-18: hosting is **Vercel**.)
