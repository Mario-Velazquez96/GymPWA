# Impl — 07_pwa_install_and_cache

**Estado:** implementado, listo para revisión (NO marcado `done`).
**Fecha:** 2026-07-20

Última feature. Capa de pulido PWA sobre el scaffold de `vite-plugin-pwa` de la
feature `00`: manifest completo, íconos, meta tags de iOS y config de Workbox
(precache del shell + una regla runtime CacheFirst para el media de Storage). Sin
cambios de lógica de app, servicios, SQL ni auth.

## Qué cambió

- **`public/icon.svg`** — fuente vectorial actualizada al artefacto resuelto por
  el humano: mancuerna **blanca** sobre fondo azul muy oscuro (`#0f172a`).
- **`scripts/generate-icons.mjs`** (nuevo) — rasterizador PNG **sin dependencias
  nuevas** (solo módulos internos `zlib`/`fs` de Node). Genera el set de íconos
  desde `icon.svg` con supersampling 4x4 (anti-aliasing). Se ejecutó una vez;
  los PNG quedan versionados en `public/`. No forma parte del build.
- **`public/apple-touch-icon.png`** (180), **`pwa-192x192.png`**,
  **`pwa-512x512.png`**, **`pwa-maskable-512x512.png`** (nuevos, generados). El
  maskable lleva fondo a sangre completa y la mancuerna al 72% para caber en la
  zona segura de las máscaras adaptativas.
- **`vite.config.ts`** — `VitePWA()`:
  - Manifest: `name` "Rutinas Gym", `short_name` "Rutinas", `lang` "es",
    `display` "standalone", `start_url` "/", `theme_color`/`background_color`
    `#0f172a`, `icons` 192/512/512-maskable (R1). `registerType: 'autoUpdate'`
    conservado (R6).
  - Workbox: `globPatterns` para precachear el shell (js/css/html/svg/png/woff2)
    + `navigateFallback: '/index.html'` (R3); **una** regla `runtimeCaching`
    CacheFirst (`cacheName: 'exercise-media'`, `maxEntries: 100`,
    `maxAgeSeconds: 30 días`) cuyo `urlPattern` solo coincide con
    `*.supabase.co` + path que empieza en `/storage/` (R4, R7). Ninguna regla
    coincide con `/rest/` ni `/auth/` → siempre red (R5).
- **`index.html`** — `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
  (180) + meta iOS `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style` (`black-translucent`) y
  `apple-mobile-web-app-title` "Rutinas" (R2).
- **`README.md`** (nuevo, raíz) — sección en español para instalar en iPhone
  (Safari → Compartir → "Agregar a pantalla de inicio") + nota HTTPS/Vercel,
  más cómo correr localmente y las variables de entorno requeridas (R8).
- **`e2e/pwa.spec.ts`** (nuevo) — 3 specs contra `pnpm preview`.

Sin variables de entorno nuevas (`.env.example` sin cambios). Sin migraciones,
sin cambios de esquema/RLS.

## Trazabilidad requisito → prueba

| Req | Cubre | Verificado por |
| --- | --- | --- |
| R1 | Manifest español, standalone, colores, íconos 192/512/maskable | `e2e/pwa.spec.ts › "R1/R3: SW activo, link de manifest presente y campos requeridos"` (fetch de `/manifest.webmanifest` y aserción de campos); build emite `dist/manifest.webmanifest` con todos los campos |
| R2 | apple-touch-icon 180 + meta iOS | Verificación del `dist/index.html` construido (tags `apple-touch-icon`, `apple-mobile-web-app-capable/-status-bar-style/-title` presentes); + checklist manual iPhone abajo |
| R3 | Precache del shell + navigateFallback | `e2e/pwa.spec.ts › "R1/R3…"` (SW en estado `activated`); build reporta `precache 15 entries`, `dist/sw.js` generado |
| R4 | CacheFirst para media de Storage con expiración | `e2e/pwa.spec.ts › "R4/R7: el media de Storage se sirve desde la caché 'exercise-media'"` |
| R5 | API (`/rest/`, `/auth/`) nunca en caché | `e2e/pwa.spec.ts › "R5: las respuestas de /rest/ nunca se cachean"`; grep de `dist/sw.js` no contiene `/rest/` ni `/auth/` |
| R6 | autoUpdate en nuevo deploy | `registerType: 'autoUpdate'` en `vite.config.ts`; `dist/registerSW.js` generado; SW activa en la primera carga (mismo spec R1/R3). Actualización-al-recargar es verificación manual (checklist) |
| R7 | GIF ya visto servido desde caché | Mismo spec que R4 (segunda petición resuelta desde `exercise-media`) |
| R8 | README instalación iPhone + HTTPS | `README.md` sección "Instalar en el iPhone" (revisión) |

## Decisiones de prueba (deterministas)

- **Assertion de build del manifest:** se hizo dentro del e2e (fetch de
  `/manifest.webmanifest` en el preview) en vez de un test Vitest de nodo,
  porque en `init.sh full` los unit tests corren **antes** del build; leer
  `dist/` desde Vitest sería no-determinista. El e2e corre tras el build.
- **Cache-hit real vs. URL de Storage real:** en vez de depender de una URL real
  de Supabase Storage (que podría 404 e impedir el cacheo, o cambiar), los specs
  interceptan las peticiones cross-origin con `context.route` y sirven un 200
  sintético (GIF 1x1 con `Access-Control-Allow-Origin: *`). Playwright enruta
  también las peticiones del service worker, así que la regla CacheFirst se
  ejerce de verdad; el resultado se afirma inspeccionando la Cache API real
  (`caches.open('exercise-media').match(url)`). Es un cache-hit real y
  determinista, no un mock del predicado.

## Verificación ejecutada

- `./init.sh` → verde (typecheck, lint, unit+coverage, build). Build emite
  `dist/sw.js`, `dist/workbox-*.js`, `dist/manifest.webmanifest` con todos los
  campos R1 y los 4 PNG en `dist/`.
- `./init.sh e2e` → verde (11/11, incluidos los 3 de `pwa.spec.ts`).
- Comprobado en `dist/sw.js`: contiene `storage/` y `exercise-media`; **no**
  contiene `/rest/` ni `/auth/`. En `dist/index.html`: tags de iOS presentes.

## Checklist manual en iPhone (verificación humana — NO automatizable)

Estos ítems requieren un iPhone real con Safari y la app servida por HTTPS
(deploy en Vercel/Netlify). Marcar tras probar:

- [ ] **Instalación:** Safari → Compartir → "Agregar a pantalla de inicio"
      ofrece agregar la app con el nombre **"Rutinas"**.
- [ ] **Ícono correcto:** en la pantalla de inicio aparece la mancuerna blanca
      sobre fondo azul oscuro (no un ícono genérico ni recortado raro).
- [ ] **Apertura standalone:** al abrir desde el ícono, la app se ve a pantalla
      completa, sin la barra de direcciones de Safari.
- [ ] **Shell en modo avión:** con la app ya abierta una vez, activar modo avión
      y reabrir → la interfaz (shell) carga; las pantallas de datos muestran su
      estado de error en español.
- [ ] **GIF cacheado en modo avión:** tras ver un ejercicio con conexión, en
      modo avión reabrir ese ejercicio → su GIF sigue mostrándose (desde
      `exercise-media`).
- [ ] **Auto-update (R6):** tras un nuevo deploy, al reabrir/recargar la app se
      actualiza sola sin borrar caché manualmente.
- [ ] **(Opcional) Lighthouse:** auditoría PWA sobre la URL desplegada marca
      "installable" con SW activo.

## Notas para el revisor

- Íconos generados con un helper de nodo **sin dependencias nuevas** (solo
  built-ins); si se quisiera re-generar: `node scripts/generate-icons.mjs`.
- Ninguna regla de SW toca la API de Supabase (datos siempre frescos, R5).
- No se tocó `src/`, `services/`, `supabase/` ni auth.
