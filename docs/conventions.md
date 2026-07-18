# docs/conventions.md — Style, naming, structure

Read before writing any code.

## Project structure

```
src/
  main.tsx             Entry: React root, router, providers
  App.tsx              Route definitions (React Router) + auth guard
  screens/             One screen per route: LoginScreen.tsx, TodayScreen.tsx,
                       ExerciseScreen.tsx, HistoryScreen.tsx
  components/          Reusable components (ExerciseCard, SetRow, Stepper, ...)
  lib/
    supabase.ts        supabase-js client singleton — the only createClient call
    types.ts           Row/domain types matching solution_design.md §3
    utils.ts           Small helpers (dates, formatting kg)
  services/            Data access functions (plans.ts, exercises.ts, logs.ts)
  hooks/               useSession, useActivePlan, and other shared hooks
supabase/migrations/   Versioned SQL (tables + RLS)
e2e/                   Playwright specs
public/                Static assets, PWA icons
```

`package.json`, `tsconfig.json`, and `vite.config.ts` are authoritative — never
bypass them.

## TypeScript

- **`strict` is on.** No `any`; prefer `unknown` + narrowing. No non-null `!`
  unless provably safe with a comment.
- Use **path alias** `@/` → `src/` per `tsconfig.json`/`vite.config.ts`.
- DB row types live in `lib/types.ts` and mirror the SQL schema exactly
  (`Exercise`, `Plan`, `PlanDay`, `PlanExercise`, `WorkoutLog`). If generated
  with `supabase gen types typescript`, commit the generated file.
- Co-locate component prop types with the component.

## React

- **Function components + hooks only.** No classes.
- **Naming:** component files `PascalCase.tsx` (`SetRow.tsx`); non-component
  modules `kebab-case.ts` or short lowercase (`logs.ts`); hooks `useThing.ts`.
- **Screens are thin:** load data via services/hooks, handle loading/empty/error
  states, compose components. Business logic goes in `services/` or `lib/`.
- **No data fetching in presentational components.** Data flows down as props.
- Every async screen shows an explicit **loading**, **empty** (e.g. "Día de
  descanso 💤", "Sin plan activo"), and **error** state — gym connectivity is
  flaky, silent failure is not acceptable.

## Styling — Tailwind CSS

- **Utility-first Tailwind, mobile-first.** Base styles target the iPhone
  viewport; desktop is an afterthought.
- No inline `style={}` except truly dynamic values. No magic colors/spacing —
  use the Tailwind theme.
- **Gym UX rules:** touch targets ≥ 44px (`min-h-11`), big readable numbers for
  weight/reps, steppers (±2.5 kg / ±1 rep) instead of free-text inputs wherever
  possible, primary actions reachable with the thumb (bottom of the screen).
- Dark-friendly palette is nice-to-have, not required.

## UI text — Spanish

- **All user-facing text is Spanish** (es-MX tone, informal "tú"). Weights in
  **kg**. Dates in Spanish format ("lun 3 ago").
- Keep strings inline (no i18n layer); reuse shared labels from a constants
  module if repeated.

## Supabase & data

- Create the client **once** in `lib/supabase.ts` from `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY`; import it only from services/hooks.
- **All queries live in `services/`** as typed async functions. Components never
  call `supabase.from(...)` directly.
- Every service function handles the `{ data, error }` result explicitly —
  never ignore `error`.
- **Writes only to `workout_logs`.** One saved set = one row insert with
  `user_id`, `exercise_id`, `performed_at`, `set_number`, `reps`, `weight_kg`.
- **Every schema change = a new SQL file** in `supabase/migrations/`
  (`NNN_description.sql`), including its RLS policies. Never edit the DB only
  via dashboard. Schema must stay compatible with the `Gym` repo (see
  AGENTS.md §3).

## PWA (vite-plugin-pwa)

- Manifest: Spanish `name`/`short_name`, `display: "standalone"`, theme/bg
  colors, 192/512 icons + `apple-touch-icon`.
- Precache the app shell; runtime-cache Supabase Storage media with CacheFirst
  + a size/age limit. Never cache Supabase **API** (data) responses in the SW —
  logs and plans must be fresh.
- Test the SW against `pnpm build && pnpm preview` (it's disabled in dev).

## Validation, errors, security

- Validate log input before insert: `set_number ≥ 1`, `reps ≥ 1`,
  `weight_kg ≥ 0` in 0.5 steps. Zod is available if a schema is warranted;
  don't over-engineer 3 numeric fields.
- Show user-safe Spanish error messages ("No se pudo guardar la serie,
  reintenta"); log details to the console only in dev.
- Only the anon key ever appears in this repo. `VITE_*` vars are public by
  definition — never put a secret in one.

## Hygiene

- No leftover `console.log`/debug code in committed work.
- Run Prettier/ESLint; `pnpm lint` and `pnpm typecheck` clean before handoff.
- Never introduce a table, env var, or dependency not described in an approved
  spec.
