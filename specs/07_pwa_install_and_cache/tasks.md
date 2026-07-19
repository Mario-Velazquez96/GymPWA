# Tasks — 07_pwa_install_and_cache

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [x] Resolve open items with the human: app name + icon artwork — resolved
      2026-07-18 ("Rutinas Gym"; white dumbbell on dark background)
- [ ] Generate icon set (180 apple-touch, 192, 512, 512-maskable) into
      `public/` (R1, R2)
- [ ] Complete the manifest in `VitePWA()` (name, short_name, lang, standalone,
      colors, icons) (R1)
- [ ] Add `apple-touch-icon` link + iOS meta tags to `index.html` (R2)
- [ ] Configure Workbox: shell precache globs + `navigateFallback` (R3)
- [ ] Add the CacheFirst runtime rule for `*.supabase.co/storage/*` with
      expiration (maxEntries 100, 30 days) (R4, R7)
- [ ] Verify no runtime rule matches `/rest/` or `/auth/` (R5)
- [ ] Keep `registerType: 'autoUpdate'`; verify update-on-reload behavior (R6)
- [ ] Write the Spanish iPhone install section in README (R8)
- [ ] E2E (preview build): SW active + manifest fields (R1, R3); second
      Storage fetch served from `exercise-media` cache (R4, R7); no API
      response in caches (R5)
- [ ] Manual iPhone checklist in `progress/impl_07_pwa_install_and_cache.md`:
      install, standalone, icon, airplane-mode shell + cached GIF (R2)
- [ ] Run `./init.sh` + `./init.sh e2e`; all green

## Verification

- Mapping: R1 → manifest e2e/build assertion; R2 → index.html check + iPhone
  checklist; R3 → SW precache e2e; R4/R7 → cache-hit e2e; R5 → cache-absence
  e2e; R6 → config + manual reload check; R8 → README review.
- `pnpm build` emits `dist/sw.js` + `dist/manifest.webmanifest` with all R1
  fields.
- Manual: Lighthouse PWA audit passes "installable" on the deployed URL.
