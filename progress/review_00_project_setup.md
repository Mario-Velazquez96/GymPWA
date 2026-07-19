# Review — 00_project_setup

**Verdict: APPROVE**
**Reviewer:** reviewer agent
**Fecha:** 2026-07-19

## Checks executed (all re-run by the reviewer, not taken from the impl report)

### 1. Gates green
- `./init.sh` (install → typecheck → lint → test+coverage → build): **exit 0**.
- `./init.sh e2e` (Playwright vs `pnpm preview` production build): **exit 0**, 1/1 passed.
- Unit tests: 14/14 passed across 3 files (`App.test.tsx`, `supabase.test.ts`, `ConfigError.test.tsx`).
- Coverage: 100% lines/stmts/funcs, 80% branches — meets the configured 80% thresholds; `src/lib/` at 100% lines (target in tasks.md: ≥ 80%).
- `dist/` after build contains `manifest.webmanifest`, `sw.js`, `workbox-*.js`, `registerSW.js`; `dist/index.html` references both manifest and registerSW. Manifest: name "Rutinas Gym", `display: standalone`, `lang: es`. `sw.js` contains zero references to Supabase (default precache only — correct for this feature; runtime strategy deferred to 07).

### 2. Traceability (R1–R10)
- **R1** — `tsconfig.json` has `"strict": true` + `paths { "@/*": ["./src/*"] }`; alias mirrored in `vite.config.ts`; every test imports via `@/`; typecheck/lint/build exit 0 inside init.sh. Verified.
- **R2** — Tailwind v4 via `@tailwindcss/vite`; `src/index.css` = `@import "tailwindcss"`; all four screens use utility classes; built CSS emitted (`dist/assets/index-*.css`, 7.7 kB). Verified.
- **R3** — `App.tsx` defines exactly the 4 routes; 4 RTL tests assert the Spanish headings ("Iniciar sesión", "Hoy", "Ejercicio", "Historial"); `index.html` is `lang="es"`. Verified.
- **R4** — grep across the repo: `createClient` is called only in `src/lib/supabase.ts` (all other hits are docs/spec prose). Positive-path test asserts client + `isConfigured=true`. Verified.
- **R5** — `supabase.ts` returns `null` (no module-scope throw); 4 unit tests cover missing-env permutations; 3 ConfigError tests assert Spanish text + both var names + the fix; 2 App tests assert ConfigError renders on data routes without env. Design note that `/login` renders unguarded is acceptable: the placeholder makes no network calls, so no blank screen / undefined calls occur — R5's intent holds. Verified.
- **R6** — build output check above. Verified.
- **R7** — `package.json` defines all 7 required scripts (`dev/build/preview/typecheck/lint/test/test:e2e`, plus a harmless `format`); `./init.sh` exit 0. Verified.
- **R8** — `.env.example` documents exactly the two `VITE_` vars; `git check-ignore .env.local` confirms it is ignored (local file holds only placeholder values); secrets grep (`service_role`, `SERVICE_KEY`, JWT prefix, `sb_secret`) clean — the only hit is prose in `project-documents/solution_design.md` describing the *Gym* repo's env, not a secret. Verified.
- **R9** — `vercel.json` committed with `rewrites: /(.*) → /index.html`. Verified.
- **R10** — 14 Vitest+RTL tests pass; `e2e/smoke.spec.ts` loads `/login` against `pnpm preview` (webServer on :4173) and passed. Verified.

### 3. Task completeness
All 11 items in `specs/00_project_setup/tasks.md` are `[x]` and each was spot-checked against real code/config as listed above. No checkbox is falsely checked.

### 4. Conventions
- Structure matches `docs/conventions.md` (screens/, components/, lib/); component files PascalCase; function components only.
- All user-facing text Spanish; no `any` / `as any`; no `console.log` (eslint `no-console` is an error rule); Prettier + flat ESLint in place.
- `src/main.tsx` uses a guarded null check (no non-null `!`).

### 5. Security & scope
- Only the two documented `VITE_` env vars anywhere in src; no service key, no other secrets.
- No `supabase/migrations/`, no tables, no auth logic — correctly out of scope.
- Vercel-only: `public/_redirects` does **not** exist; `public/` contains only `icon.svg`.
- Dependencies match the spec toolchain (RTL's `user-event` companion is within the RTL line item); no undeclared routes or env vars.
- `feature_list.json` still shows `00_project_setup: in_progress` — implementer correctly did not self-mark done.

## Notes for later features (non-blocking)
- Real 192/512 PNG icons + apple-touch-icon and the runtime caching strategy are explicitly deferred to `07_pwa_install_and_cache` — carry them there.
- Branch coverage sits exactly at the 80% threshold (uncovered: the falsy side of the param interpolation in the two placeholder screens); will churn away when real screens land.

## Decision
**APPROVE.** Leader may mark `00_project_setup` as `done` in `feature_list.json`.
