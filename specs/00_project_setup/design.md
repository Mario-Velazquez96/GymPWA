# Design — 00_project_setup

**Source:** solution_design §2, §4.3; docs/architecture.md, docs/conventions.md

## Approach

Foundation layer. Scaffold with `pnpm create vite` (react-ts template), then add
Tailwind, React Router, supabase-js, vite-plugin-pwa, and the test/lint
toolchain. Everything after this feature only adds screens, services, and SQL.

## File layout

```
index.html                  lang="es", <title>Rutinas Gym</title>
vite.config.ts              react(), tailwindcss(), VitePWA() plugins; alias @ → src
tsconfig.json               strict, paths { "@/*": ["./src/*"] }
src/
  main.tsx                  React root + <BrowserRouter>
  App.tsx                   <Routes> for the 4 routes
  index.css                 Tailwind entry (@import "tailwindcss")
  screens/
    LoginScreen.tsx         placeholder: "Iniciar sesión"
    TodayScreen.tsx         placeholder: "Hoy"
    ExerciseScreen.tsx      placeholder: "Ejercicio"
    HistoryScreen.tsx       placeholder: "Historial"
  lib/
    supabase.ts             singleton (R4) + env guard helper (R5)
  components/ConfigError.tsx  Spanish config-error screen (R5)
e2e/smoke.spec.ts           loads /login, asserts "Iniciar sesión"
vercel.json                 Vercel SPA rewrite
.env.example                the two VITE_ vars
```

## Key decisions

- **Tailwind v4 via `@tailwindcss/vite`** plugin — no PostCSS config needed.
- **`lib/supabase.ts`:** reads `import.meta.env.VITE_SUPABASE_URL/ANON_KEY`;
  exports `supabase` singleton and `isConfigured` flag. `App.tsx` renders
  `<ConfigError />` when not configured (R5) — no throw at module scope so the
  error screen can render.
- **vite-plugin-pwa:** `registerType: "autoUpdate"`, minimal manifest stub
  (name "Rutinas Gym", `display: "standalone"`, placeholder icons). Runtime
  caching rules deliberately deferred to `07`.
- **Vitest:** `environment: "jsdom"`, `@testing-library/react` +
  `@testing-library/jest-dom`; coverage via `vitest run --coverage`.
- **Playwright:** `webServer` runs `pnpm preview` (production build) so the SW
  path is realistic; one smoke spec.
- **ESLint flat config** (typescript-eslint + react-hooks) + Prettier.

## Auth & security

No auth logic yet. Only the anon key exists, in `.env.local` (gitignored) and
documented in `.env.example`. No service key anywhere (AGENTS.md §3).

## Validation

None beyond the env guard (R5).

## Test approach

- RTL: `App` renders the Spanish placeholder for `/` (R3, R10); `ConfigError`
  renders when env is missing (R5, mocking `import.meta.env`).
- Playwright: smoke test loads `/login` and asserts the Spanish title (R10).
- `./init.sh` as the umbrella gate (R1, R7). Target: ≥ 80% lines on `src/lib/`.

## Open items / discrepancias

(none — resolved 2026-07-18: hosting is **Vercel**.)
