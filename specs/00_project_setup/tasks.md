# Tasks — 00_project_setup

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [x] Scaffold Vite react-ts app with pnpm; enable strict TS and `@/` alias in
      `tsconfig.json` + `vite.config.ts` (R1)
- [x] Add Tailwind v4 via `@tailwindcss/vite`; import in `src/index.css`; style
      one placeholder element to prove it renders (R2)
- [x] Add React Router; create the 4 placeholder screens with Spanish titles and
      wire routes in `App.tsx`; set `index.html` to `lang="es"` (R3)
- [x] Create `src/lib/supabase.ts` singleton reading the two `VITE_` vars; add
      `ConfigError` screen for the missing-env case (R4, R5)
- [x] Add `vite-plugin-pwa` with `registerType: "autoUpdate"` and manifest stub;
      confirm `pnpm build` emits manifest + SW in `dist/` (R6)
- [x] Add ESLint (flat config) + Prettier; add scripts `dev/build/preview/
      typecheck/lint/test/test:e2e` (R7)
- [x] Create `.env.example`; ensure `.env.local` is gitignored; audit repo for
      secrets (R8)
- [x] Commit `vercel.json` with the SPA fallback rewrite (R9)
- [x] Configure Vitest + RTL (jsdom, jest-dom, coverage) and write the two
      component tests (R3, R5, R10)
- [x] Configure Playwright (`webServer: pnpm preview`) and write the `/login`
      smoke spec (R10)
- [x] Run `./init.sh` and `./init.sh e2e`; all green (R1, R7, R10)

## Verification

- `./init.sh` exits 0 (typecheck, lint, unit, build) and `./init.sh e2e` exits 0.
- `dist/manifest.webmanifest` + `dist/sw.js` exist after build (R6).
- Manual: `pnpm preview`, visit the 4 routes, Spanish titles visible (R3).
- Mapping: R1/R7 → init.sh; R2/R3 → App.test.tsx + manual; R4 → grep single
  `createClient`; R5 → ConfigError.test.tsx; R6 → build output check; R8/R9 →
  file presence; R10 → smoke.spec.ts.
- Coverage: ≥ 80% lines on `src/lib/`.
