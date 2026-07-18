# Stack conventions — React + Vite + supabase-js + Tailwind + vite-plugin-pwa

Bake these into each `design.md` and `tasks.md` so the implementer doesn't
re-derive them. If the source design states its own standards, those win — carry
them through and cite the section. These reflect current (2026) practice; verify
against live docs when a detail is load-bearing.

## Supabase in a SPA (the part people get wrong)

- This is a **pure client-side SPA** — there is no server of our own, no SSR,
  no middleware. Use plain **`@supabase/supabase-js`** (`createClient`), NOT
  `@supabase/ssr` — that package solves a server/cookie problem this app
  doesn't have.
- Create the client **once** in `lib/supabase.ts` from `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY`. A module-scope singleton is correct here (one user,
  one browser); import it only from services/hooks.
- supabase-js persists the session in localStorage and auto-refreshes tokens.
  Subscribe to `onAuthStateChange` in one place (a `useSession` hook/context)
  and drive route guards from it.
- **Every `VITE_*` var ships to the browser.** The anon/publishable key is
  designed to be public; the **service key must never appear in this repo** —
  it belongs to the sibling `Gym` repo's upload scripts only.
- Prefer the new **publishable** key naming (`sb_publishable_…`) if the
  Supabase project provides it; legacy `anon` keys work the same way.

## Row Level Security (RLS) — the ONLY enforcement

- With a public anon key, **RLS is the entire authorization boundary**. Route
  guards and hidden buttons are UX, not security.
- Every table holding user data has RLS **enabled** with explicit policies. A
  spec that adds a table must specify its policies as requirements, and state
  the expected denial behavior (an unauthorized read returns *no rows*, not an
  error).
- This app's posture (solution_design §3.6): `exercises` readable by
  authenticated users; `plans`/`plan_days`/`plan_exercises` select-only where
  the owning plan's `user_id = auth.uid()` (child tables check via join/`in`
  subquery to `plans`); `workout_logs` full CRUD for the owner only.
- **The app writes only to `workout_logs`.** All other tables are written by
  the `Gym` repo with the service key.
- Storage: the `exercise-media` bucket is public-read (media has no user data);
  writes only via service key.
- Schema + RLS live as **versioned SQL in `supabase/migrations/`** (applied via
  SQL editor or `supabase db push`) — never dashboard-only changes.

## React + Vite

- Function components + hooks; **React Router** for the 4 routes
  (`/login`, `/` Hoy, `/ejercicio/:planExerciseId`, `/historial/:exerciseId`).
- Screens are thin: load via services/hooks, render loading/empty/error states,
  compose components. **No `supabase.from(...)` outside `services/`.**
- Services return typed results and handle `{ data, error }` explicitly —
  never ignore `error`.
- Types for rows live in `lib/types.ts`, matching the SQL schema (generated via
  `supabase gen types typescript` or hand-written; commit them either way).
- Path alias `@/` → `src/`. `strict` TypeScript, no `any`.

## UX rules (from the brief — treat as requirements)

- **Spanish UI, kg units**, dates in Spanish format.
- **One-hand gym use:** touch targets ≥ 44px, steppers (weight ±2.5 kg, reps
  ±1) instead of keyboards, primary actions thumb-reachable.
- **Immediate save:** one set = one insert; no long forms; each row shows
  saved/failed state.
- **Prefill + comparison:** each set row starts with the previous session's
  weight/reps and shows them alongside ("anterior").
- Every async screen has explicit loading / empty (rest day, no plan) / error
  states in Spanish.

## PWA (vite-plugin-pwa)

- Manifest: Spanish `name`/`short_name`, `display: "standalone"`,
  `theme_color`/`background_color`, 192+512 icons, plus `apple-touch-icon` —
  iOS ignores manifest icons and needs the link tag.
- **Precache** the app shell (build assets). **Runtime-cache** Supabase Storage
  media (GIFs/images) with CacheFirst + expiration limits.
- **Never cache Supabase API (data) responses in the SW** — plans and logs must
  be fresh; logging requires a connection (offline queue is out of scope).
- The service worker only runs on the production build — verify with
  `pnpm build && pnpm preview`, not `pnpm dev`.
- HTTPS is required for SW/install; Vercel/Netlify provide it.
- iOS/Safari specifics: install is manual (Compartir → "Agregar a pantalla de
  inicio"); no install prompt event; test standalone display on the phone.

## Validation & types

- Log inputs are 3 numeric fields: validate `set_number ≥ 1`, `reps ≥ 1`,
  `weight_kg ≥ 0` in 0.5 steps client-side; DB `check` constraints are the
  backstop. Zod only if a schema genuinely earns its keep — don't over-engineer.
- User-facing error messages in Spanish; details to console only in dev.

## Deployment (Vercel/Netlify free tier)

- Static build output (`dist/`); SPA fallback rewrite (all routes → 
  `index.html`).
- Env vars set in the hosting dashboard per environment; only `VITE_*` values,
  never secrets.
- Free-tier Supabase pauses after ~1 week idle — reactivate from the dashboard;
  don't engineer around it.

## Testing

- Unit-test services with the supabase client mocked (Vitest); assert queries,
  error paths, and mapping.
- Component tests (React Testing Library) for screens/steppers: prefill,
  save-per-set, failure message, rest-day/empty states.
- E2E (Playwright) for critical flows: login, view today's routine, log a set,
  see the previous-session comparison.
- RLS deserves an explicit check per schema feature: anon reads nothing; a user
  reads only their own rows.
- State a coverage or "what proves done" target per feature in `tasks.md`
  (default ≥ 80% lines on changed modules).
