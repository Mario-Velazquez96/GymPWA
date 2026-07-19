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

## 2026-07-19 — 02_auth: implemented, reviewed, DONE

Real email/password login against the live Supabase project: `services/auth.ts`
(`signIn`/`signOut` with Spanish error mapping — `invalid_credentials` →
"Correo o contraseña incorrectos", anything else → "Error de conexión,
reintenta"; details via dev-gated `console.debug` only), `hooks/useSession.tsx`
(`SessionProvider` over `getSession` + `onAuthStateChange`, persistent session
across reloads), `ProtectedRoute`/`PublicOnly` guards wired for all routes in
`App.tsx` (loading spinner, no redirect flash; missing-env `ConfigError`
contract from 00 preserved), real `LoginScreen` (labeled inputs, `min-h-11`
targets, disabled + "Entrando…" while pending, inline Spanish error), and an
app-shell header with "Cerrar sesión" on every protected screen.
`playwright.config.ts` loads `E2E_*` from `.env.local` via
`process.loadEnvFile` (no new deps). Gates: `./init.sh` and `./init.sh e2e`
both green — E2E includes the **real-credential round trip** (redirect to
/login, sign-in, reload keeps session, authenticated /login → /, sign-out,
wrong-password error) plus a verified clean skip when `E2E_*` are unset.
Coverage: **100% lines on `services/auth.ts` and `hooks/useSession.tsx`**
(45 Vitest tests, global 94.7% lines). Reviewer: **APPROVE**
(`progress/review_02_auth.md`). Details: `progress/impl_02_auth.md`.

## 2026-07-19 — 03_today_view: implemented, reviewed, DONE

Real "Hoy" screen replacing the placeholder: loads the active plan and shows
the `plan_day` matching the **device-local** date (`todayLocalISO()`, never
UTC; header "lun 3 ago" via es-MX `Intl.formatToParts`), with ‹ › day
navigation clamped to the plan's `start_date`–`end_date` (arrows disabled at
the edges) and the four Spanish body states — ordered exercise list (thumbnail
56px, name, "4 × 8-12", card → `/ejercicio/{plan_exercise.id}`), "Día de
descanso 💤", "Sin rutina asignada para este día", "Sin plan activo" — plus
loading and error + "Reintentar". New layer: `lib/types.ts` (row types
mirroring `001_schema.sql`), `lib/utils.ts` (date helpers incl. timezone-edge
tests), `services/plans.ts` (`getActivePlan`/`getPlanDay`/`getDayExercises`
with the `Result<T>` Spanish-error pattern; the only `supabase.from` in the
app), `hooks/usePlanDay.ts` (composes the 3 calls per date, early-exits,
`retry`), `components/ExerciseCard.tsx`. Read-only — zero writes, zero
migrations, zero new deps/env vars. The **human applied
`e2e/fixtures/test-plan.sql` live** (idempotent, `current_date`-relative plan
±3, placeholder exercises '0001'–'0003' with `ON CONFLICT DO NOTHING`).
Gates: `./init.sh` and `./init.sh e2e` green — **98 tests / 14 files**;
coverage 100% lines on `services/plans.ts` + `lib/utils.ts`, 88.4% on
`hooks/usePlanDay.ts` (global 95.3%); dual-path E2E `today.spec.ts` verified
on the **seeded path** against the live DB (day title, 3 ordered exercises,
tomorrow rest day, +2/+3 unassigned, › pinned at `end_date`). Reviewer:
**APPROVE** (`progress/review_03_today_view.md`). Details:
`progress/impl_03_today_view.md`.
