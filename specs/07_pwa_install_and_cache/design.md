# Design — 07_pwa_install_and_cache

**Source:** solution_design §4.2 (SW/caché), §4.3 (iPhone), §7 (riesgo GIFs); client_requirement §5

## Approach

Polish layer over the existing `vite-plugin-pwa` scaffold from `00`: complete
the manifest, add iOS tags/icons, and configure Workbox (`generateSW`)
precache + one runtime rule. No app-logic changes.

## PWA config (`vite.config.ts` → `VitePWA({...})`)

```ts
registerType: 'autoUpdate',                                   // R6
includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
manifest: {
  name: 'Rutinas Gym', short_name: 'Rutinas', lang: 'es',
  display: 'standalone', start_url: '/',
  theme_color: <color>, background_color: <color>,
  icons: [192, 512, 512-maskable]                             // R1
},
workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],         // R3
  navigateFallback: '/index.html',
  runtimeCaching: [{
    urlPattern: ({url}) => url.hostname.endsWith('.supabase.co')
                        && url.pathname.startsWith('/storage/'),   // R4
    handler: 'CacheFirst',
    options: { cacheName: 'exercise-media',
               expiration: { maxEntries: 100, maxAgeSeconds: 60*60*24*30 } }
  }]
  // no rule matches /rest/ or /auth/ → network only              (R5)
}
```

`index.html`: `<link rel="apple-touch-icon" ...>` 180px + iOS meta
(`apple-mobile-web-app-capable`, status-bar-style) (R2).

Icons: generate 180/192/512(+maskable) PNGs from one source SVG into `public/`
(open item: artwork).

## Auth & security

The Storage bucket is public-read media — caching it leaks nothing. API paths
are deliberately unmatched by any runtime rule (R5); auth tokens live in
localStorage, untouched by the SW.

## Validation

None (config feature).

## Test approach

SW behavior only exists in the production build:

- E2E (Playwright against `pnpm preview`): SW registers and activates;
  manifest link present with required fields (R1, R3); request a Storage URL
  twice and assert the second is served from the `exercise-media` cache
  (inspect `caches` via `page.evaluate`) (R4, R7); assert a `/rest/` response
  is not present in any cache (R5).
- Build assertion: `dist/manifest.webmanifest` contains the R1 fields
  (small Vitest node test reading the file after build, or e2e check).
- Manual on iPhone: install, standalone open, correct icon, airplane-mode
  shell + cached GIF (documented as a checklist in the progress file) (R2,
  acceptance).
- README install section reviewed (R8).
- Coverage target: n/a for config; the e2e specs above are the gate.

## Open items / discrepancias

(none — resolved 2026-07-18: name "Rutinas Gym" / "Rutinas"; white dumbbell
glyph on dark background.)
