# docs/architecture.md — What "a good job" means here

Read before implementing. This is the project's definition of quality.

## Stack & source of truth

- **React + Vite + TypeScript** is the application — a pure client-side SPA
  packaged as a **PWA** (`vite-plugin-pwa`). There is **no server of our own**.
- **Supabase (hosted)** is the entire backend: **Postgres + Auth + Storage**.
  The app talks to it only through `@supabase/supabase-js` with the anon/
  publishable key.
- **The Git repository is the single source of truth.** Schema and RLS policies
  live as versioned SQL in `supabase/migrations/` — never make changes only in
  the Supabase dashboard that aren't reflected in the repo.
- **Vercel/Netlify (free tier)** hosts the static build with HTTPS (a PWA
  requirement).
- **Sibling repo `Gym`:** generates monthly plans and seeds the exercise catalog
  using the service key. The two repos share only (a) the exercise IDs
  `"0001"`–`"1324"` and (b) the table schema in
  `project-documents/solution_design.md` §3. Never break that contract silently.

## Layering (separation of concerns)

```
src/
  main.tsx, App.tsx     Bootstrap: router, providers, auth session context.
  screens/              One folder/file per route (Login, Hoy, Ejercicio, Historial).
                        Screens compose components and call services. Thin.
  components/           Presentational + interactive components. No data fetching.
  lib/
    supabase.ts         The supabase-js client singleton (createClient). The ONLY
                        place the client is created.
    types.ts            Row/domain types (generated via `supabase gen types` or
                        hand-written to match solution_design.md §3).
  services/             Data access: typed functions over supabase-js
                        (getActivePlan, getDay, listPreviousSets, logSet, ...).
                        All queries/mutations live here — testable with a mocked client.
supabase/migrations/    Versioned SQL: tables, indexes, RLS policies.
e2e/                    Playwright specs.
```

- **No queries inside components or screens.** Screens call `services/`;
  services call the singleton client. This keeps data access testable and in
  one place.
- **State:** local component state + small context/hooks (auth session, active
  plan). No heavy state library — this app is 4 screens for one user.

## Data access & security (read this twice)

- **RLS is the authorization boundary.** The anon key ships to the browser by
  design; every table is protected by Row Level Security policies
  (solution_design.md §3.6):
  - `exercises`: readable by authenticated users; writes only via service key
    (Gym repo).
  - `plans` / `plan_days` / `plan_exercises`: `select` only where the plan's
    `user_id = auth.uid()`; writes only via service key (Gym repo).
  - `workout_logs`: full CRUD only where `user_id = auth.uid()`.
- **This app writes only to `workout_logs`.** Everything else is read-only. Any
  code that inserts/updates another table is a bug by definition.
- **Never use the service key here** — not in code, not in env, not in CI.
- **Auth:** supabase-js manages the session (persistence + auto-refresh) in the
  browser. Route guards redirect unauthenticated users to `/login`; guards are
  UX, RLS is enforcement.
- **Validate before writing:** set number ≥ 1, reps ≥ 1, weight ≥ 0 (kg,
  increments of 0.5). Client validation is for usability; DB constraints and
  RLS are the backstop.

## PWA & performance (gym conditions)

- **Mobile data in a gym is the target environment.** The day's routine
  (~6–8 exercises + GIFs, ~500 KB) must load fast; avoid heavy dependencies.
- **Service worker:** precache the app shell; runtime-cache exercise GIFs/images
  from the Supabase Storage CDN (CacheFirst) once viewed.
- **Logs require a connection** (one insert per saved set). An offline queue is
  explicitly out of scope for now.
- **iPhone/Safari is the target browser:** `display: "standalone"` manifest,
  icons, install via "Agregar a pantalla de inicio". Test what you can in
  desktop Safari/simulator; note iOS-only behaviors in the progress file.

## Non-functionals

- **Type safety first.** No `any`. No `// @ts-ignore` without a one-line reason.
  `pnpm typecheck` must be clean.
- **UI in Spanish, weights in kg.** No i18n framework — the app is monolingual.
- **One-hand gym UX:** touch targets ≥ 44px, steppers instead of keyboards,
  immediate saves (one set = one insert), no long forms.
- **Accessibility:** semantic HTML, labels on inputs, visible focus, GIFs with
  `alt` text. Steppers operable by keyboard and screen reader.
- **Idempotent-friendly data ops:** re-saving a set must not silently duplicate
  it; be deliberate about insert vs upsert per the feature spec.
- **Attribution:** exercise media is © Gym Visual — keep the attribution string
  visible where media is shown.

## What "done" looks like

- All `tasks.md` items complete and checked.
- All requirements `R<n>` traced to passing tests.
- `typecheck`, `lint`, `test`, and `build` all green; coverage target met.
- Data-model changes shipped as SQL in `supabase/migrations/` that applies
  cleanly to the Supabase project (and keeps the Gym-repo contract intact).
- The production build (`pnpm build`) emits a valid manifest + service worker.
- Reviewer has approved (`progress/review_<feature>.md` = APPROVE).
