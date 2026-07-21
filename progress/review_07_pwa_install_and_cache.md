# Review — 07_pwa_install_and_cache

**Verdict: APPROVE**
**Reviewer:** reviewer subagent · **Fecha:** 2026-07-20

Última feature. Capa de pulido PWA sobre el scaffold de `vite-plugin-pwa`.
Verificación completa ejecutada por el revisor (no confiada al reporte del
implementador). Los ítems del checklist manual en iPhone quedan como
verificación humana pendiente — NO se marcan como hechos aquí.

## Trazabilidad R1–R8 (cada uno con prueba/aserción genuina)

- **R1** — `dist/manifest.webmanifest` contiene `name:"Rutinas Gym"`,
  `short_name:"Rutinas"`, `lang:"es"`, `display:"standalone"`, `start_url:"/"`,
  `theme_color`/`background_color` `#0f172a`, íconos 192 + 512 + 512-maskable
  (`purpose:"maskable"`). Afirmado además por `e2e/pwa.spec.ts › R1/R3`
  (fetch de `/manifest.webmanifest` + aserción de campos). ✓
- **R2** — `index.html` y `dist/index.html` incluyen `apple-touch-icon`
  (180) + `apple-mobile-web-app-capable` / `-status-bar-style` /
  `-title`. `public/apple-touch-icon.png` verificado 180x180 RGBA. ✓
- **R3** — Workbox `globPatterns` + `navigateFallback:'/index.html'`; build
  reporta `precache 15 entries`; `dist/sw.js` generado; e2e afirma SW en estado
  `activated`. ✓
- **R4** — Regla runtime en `dist/sw.js`: `hostname.endsWith(".supabase.co")
  && pathname.startsWith("/storage/")` → `CacheFirst`, `cacheName:"exercise-media"`,
  `maxEntries:100`, `maxAgeSeconds:2592000` (30 días). e2e `R4/R7` afirma
  cache-hit real inspeccionando la Cache API. ✓
- **R5** — `dist/sw.js` NO contiene `/rest/` ni `/auth/`; ninguna regla
  runtime los intercepta (grep independiente: 0 coincidencias). e2e `R5`
  confirma que una respuesta `/rest/` no queda en ninguna caché. Requisito de
  privacidad verificado sobre el SW **construido**, no solo la config. ✓
- **R6** — `registerType:"autoUpdate"` en `vite.config.ts`; `dist/registerSW.js`
  emitido; SW activa en la primera carga. Actualización-al-recargar queda como
  verificación manual (checklist). ✓
- **R7** — Cubierto por el mismo e2e que R4 (segunda petición servida desde
  `exercise-media`). ✓
- **R8** — `README.md` (raíz, nuevo) con sección "Instalar en el iPhone"
  (Safari → Compartir → "Agregar a pantalla de inicio") + nota HTTPS obligatoria
  y deploy Vercel/Netlify. ✓

## Build y checks ejecutados por el revisor

- `./init.sh` → **verde**: typecheck, lint, unit+coverage (97.79% líneas,
  muy por encima del 80%), build. Build emite `dist/sw.js`,
  `dist/workbox-*.js`, `dist/registerSW.js`, `dist/manifest.webmanifest` y los
  4 PNG (`apple-touch-icon` 180, `pwa-192x192`, `pwa-512x512`,
  `pwa-maskable-512x512`) presentes en `public/` y en `dist/`.
- `./init.sh e2e` → **verde, 11/11**, incluidos los 3 specs de
  `pwa.spec.ts` contra el preview de producción (SW activo, cache-hit de media,
  ninguna respuesta de API cacheada) y todas las suites previas
  (auth/today/exercise/logging/history).

## Disciplina de dependencias, convenciones y seguridad

- **Sin dependencias runtime nuevas** (diff de `package.json` sin cambios;
  `vite-plugin-pwa` ya existía). El rasterizador de íconos
  `scripts/generate-icons.mjs` usa solo built-ins de Node (`zlib`/`fs`), no es
  parte del build y está documentado en el README — helper dev tolerable.
- Sin `any`, sin `console.log`, sin secretos en los archivos nuevos/tocados.
- No se tocó `src/`, `src/services/`, `supabase/` ni auth (diff limitado a
  `vite.config.ts`, `index.html`, `public/` íconos, `README.md`, `e2e/`,
  `scripts/`, `progress/`, `specs/`, `feature_list.json`).
- `.env.example` sin variables nuevas; solo la clave anon pública. Sin service
  key. Sin migraciones ni cambios de esquema/RLS (contrato `Gym` intacto).
- Alcance respetado: sin offline queue, sin push, sin background sync.

## Notas project-level (CHECKPOINTS.md — no bloquean la feature 07)

- `feature_list.json`: 7 features en `done`; la 07 en `in_progress` (correcto
  para una feature en revisión). Al aprobar y marcar 07 como `done`, las 8
  features quedan completas.
- `init.sh` verde end-to-end; build emite manifest + SW; UI en español;
  atribución `© Gym visual` presente en `ExerciseScreen.tsx`.
- Los `console.debug` en `src/services/*` están gateados por
  `import.meta.env.DEV` (se eliminan en producción) — no es ruido de debug.
- **Pendiente humano (no automatizable, no bloquea el cierre de código):** el
  checklist en `progress/impl_07_pwa_install_and_cache.md` (instalación en
  iPhone real, ícono, apertura standalone, shell + GIF en modo avión,
  auto-update tras deploy, Lighthouse "installable"). El líder debería
  registrar estos ítems como verificación humana post-deploy.

## Recomendación al líder

La feature `07_pwa_install_and_cache` puede marcarse **`done`**. Con ello el
harness SDD queda completo (features 00–07). Recomiendo, tras marcarla `done`,
commitear el trabajo (actualmente sin commit) y ejecutar el checklist manual en
iPhone contra el deploy HTTPS como cierre project-level.
