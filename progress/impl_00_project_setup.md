# Progress — impl 00_project_setup

**Status:** IMPLEMENTATION COMPLETE — ready for review
**Fecha:** 2026-07-19

## What was built

Bootstrap of the app at the repo root (no subfolder), per the approved spec:

- **Scaffold:** `package.json` (pnpm), scripts `dev/build/preview/typecheck/
  lint/format/test/test:e2e`. Deps: react 19.2, react-router-dom 7.18,
  @supabase/supabase-js 2.110; dev: vite 8.1, typescript 5.9 (pinned down from
  the auto-resolved 7.0.2 — typescript-eslint 8.64 peers require `<6.1.0`;
  `pnpm peers check` is clean), tailwindcss 4.3 + @tailwindcss/vite,
  vite-plugin-pwa 1.3, vitest 4.1 + coverage-v8 + jsdom + RTL/jest-dom,
  @playwright/test 1.61, eslint 10 (flat) + typescript-eslint + react-hooks +
  react-refresh + eslint-config-prettier, prettier 3.9.
- **TS:** `tsconfig.json` strict, `@/*` → `./src/*`; alias mirrored in
  `vite.config.ts`.
- **Tailwind v4** via `@tailwindcss/vite`; `src/index.css` =
  `@import "tailwindcss"`; all placeholder screens are Tailwind-styled
  (verified in built CSS output).
- **Routing:** `src/App.tsx` defines `/login`, `/`,
  `/ejercicio/:planExerciseId`, `/historial/:exerciseId` → 4 Spanish
  placeholder screens (`src/screens/*.tsx`). `index.html` has `lang="es"`,
  title "Rutinas Gym". `BrowserRouter` lives in `src/main.tsx`.
- **Supabase singleton:** `src/lib/supabase.ts` — the ONLY `createClient` call
  in the repo (grep-verified). Exports `supabase: SupabaseClient | null` and
  `isConfigured`; returns `null` instead of throwing at module scope when env
  is missing, so the error screen can render.
- **ConfigError (R5):** `src/components/ConfigError.tsx`, Spanish, names both
  missing vars and the `.env.example` → `.env.local` fix.
  - **Design note:** `/login` renders unguarded — it is the entry point and
    needs no Supabase to paint (this also keeps the e2e smoke green with no
    credentials, which don't exist yet). The three data routes render
    `<ConfigError />` when `!isConfigured`.
- **PWA:** VitePWA `registerType: "autoUpdate"`, manifest stub name/short_name
  "Rutinas Gym", `display: "standalone"`, `lang: "es"`, placeholder SVG icon
  (`public/icon.svg`; real 192/512 PNG + apple-touch-icon deferred to 07, as
  is the runtime caching strategy). Build emits `dist/manifest.webmanifest`,
  `dist/sw.js`, `dist/registerSW.js` (auto-injected registration), 6 precache
  entries.
- **Env:** `.env.example` documents only `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY`. `.env.local` gitignored (`git check-ignore`
  verified) and locally holds clearly-fake placeholder values — no Supabase
  project exists until feature 01; no secrets anywhere (grep audit for
  service_role/JWT prefixes: clean).
- **Hosting:** `vercel.json` with the SPA rewrite (`/(.*)` → `/index.html`).
  Vercel-only per the resolved open item; no `public/_redirects` created.
- **Lint/format:** flat `eslint.config.js` (js + typescript-eslint recommended,
  react-hooks, react-refresh, `no-console` error, prettier-compat) +
  `.prettierrc.json`/`.prettierignore` (markdown of the SDD harness excluded).
  `prettier --check .` passes.
- **Tests:** Vitest (jsdom, jest-dom, explicit RTL cleanup in
  `vitest.setup.ts`, coverage v8 with 80% thresholds); Playwright
  (`webServer: pnpm preview` on :4173, chromium).

## Verification results

| Gate | Result |
| --- | --- |
| `./init.sh` (install → typecheck → lint → test → build) | exit 0 |
| `./init.sh e2e` (Playwright vs `pnpm preview`) | exit 0, 1/1 passed |
| Unit tests | 14/14 passed (3 files) |
| Coverage | 100% lines/stmts/funcs, 80% branches (thresholds met); `src/lib/` 100% |
| `dist/` after build | `manifest.webmanifest` + `sw.js` + `registerSW.js` present; manifest name "Rutinas Gym", standalone, lang es |
| Single `createClient` | grep: only `src/lib/supabase.ts` |
| `.env.local` gitignored | `git check-ignore` confirms |
| Secrets audit | clean (only anon-key placeholders, gitignored) |

Note: all gates pass **without** real Supabase credentials (none exist yet).
Unit tests stub `import.meta.env` per case; the smoke test only needs `/login`.

## Requirement traceability

| Req | Evidence / test |
| --- | --- |
| R1 | `pnpm typecheck`, `pnpm lint`, `pnpm build` all exit 0 inside `./init.sh`; strict + `@/` alias in `tsconfig.json`/`vite.config.ts` (alias exercised by every test import `@/...`) |
| R2 | Tailwind classes on all screens; built CSS contains the utilities; visual check via `pnpm preview` |
| R3 | `src/App.test.tsx` → "renderiza 'Iniciar sesión' en /login", "'Hoy' en /", "'Ejercicio' en /ejercicio/:planExerciseId", "'Historial' en /historial/:exerciseId" |
| R4 | `src/lib/supabase.test.ts` → "crea el cliente y marca isConfigured=true…"; grep: single `createClient` in `src/lib/supabase.ts` |
| R5 | `src/lib/supabase.test.ts` (3 missing-env cases → `null`/`false`); `src/components/ConfigError.test.tsx` (3 tests, Spanish text + both var names); `src/App.test.tsx` → "muestra el error de configuración en / …", "…en /historial/… sin variables" |
| R6 | Build output check: `dist/manifest.webmanifest`, `dist/sw.js`, `dist/registerSW.js` exist; registration script referenced from `dist/index.html` |
| R7 | `package.json` defines the 7 required scripts; `./init.sh` exits 0 |
| R8 | `.env.example` with exactly the two `VITE_` vars; `git check-ignore .env.local`; secrets grep clean |
| R9 | `vercel.json` present with `rewrites` → `/index.html` |
| R10 | `pnpm test`: 14 Vitest+RTL tests pass; `pnpm test:e2e`: `e2e/smoke.spec.ts` loads `/login` against `pnpm preview` and asserts "Iniciar sesión" — passed |

## Environment notes

- Installed on this machine as part of the task: pnpm 11.15.0 (global via npm),
  Playwright chromium browser (`pnpm exec playwright install chromium`).
- iOS/Safari-specific PWA behavior not testable here (Windows); deferred to 07.

## Out of scope (untouched, as specified)

No `supabase/` migrations, no auth logic, no real screen content, no runtime
caching strategy, no `public/_redirects`, no extra env vars or tables.

All `tasks.md` items checked. Awaiting reviewer approval — feature NOT marked
done in `feature_list.json`.
