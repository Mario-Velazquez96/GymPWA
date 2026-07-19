# Requirements — 07_pwa_install_and_cache

**Feature:** PWA completa: instalación en iPhone + caché de shell y GIFs
**Source:** client_requirement §5 (plataforma, rendimiento); solution_design §4.2–4.3
**Depends on:** 05_workout_logging

## Purpose

Turn the working app into a proper installable PWA: complete manifest and iOS
install support ("Agregar a pantalla de inicio"), service-worker precache of
the app shell, and runtime caching of viewed exercise media so the day's
routine loads fast on gym mobile data. Data (plans/logs) stays online-only.

## In scope

- Full manifest: Spanish name, `display: "standalone"`, theme/background,
  192/512 (+maskable) icons.
- iOS specifics: `apple-touch-icon`, status-bar/meta tags.
- Workbox config via `vite-plugin-pwa`: shell precache + CacheFirst runtime
  rule for Supabase Storage media with expiration.
- Explicit exclusion of Supabase API endpoints from any SW caching.
- README section (Spanish) with iPhone install steps.

## Out of scope

- Offline queue for `workout_logs` (future work per solution_design §4.2).
- Push notifications, background sync, App Store anything.

## Requirements (EARS)

**R1 (Ubiquitous):** The manifest shall define Spanish `name` and
`short_name`, `display: "standalone"`, `start_url: "/"`, `lang: "es"`,
`theme_color`/`background_color`, and 192px + 512px icons including a
maskable 512px.

**R2 (Ubiquitous):** `index.html` shall include `apple-touch-icon` (180px)
and the iOS meta tags so the installed app opens standalone with a correct
icon on iPhone (iOS ignores manifest icons).

**R3 (Ubiquitous):** The production build shall precache the app shell (built
JS/CSS/HTML and core assets) so a repeat visit renders the shell without
re-downloading it.

**R4 (Event-driven):** When an exercise GIF or image from the Supabase Storage
host is fetched, the service worker shall serve/cache it with a CacheFirst
strategy limited by max entries (~100) and max age (~30 days).

**R5 (Ubiquitous):** The service worker shall never cache Supabase **API**
responses (`/rest/`, `/auth/` paths): plan data and logs are always fresh from
the network.

**R6 (Event-driven):** When a new app version is deployed, the service worker
shall auto-update on next load (`registerType: "autoUpdate"`) without
requiring manual cache clearing.

**R7 (Event-driven):** When a previously viewed GIF is requested again (e.g.
revisiting an exercise), it shall be served from cache without a network
round-trip.

**R8 (Ubiquitous):** The README shall document, in Spanish, how to install the
app on iPhone (Safari → Compartir → "Agregar a pantalla de inicio") and the
HTTPS deploy requirement.

## Acceptance

Deployed build: Lighthouse (or manual audit) confirms installable manifest +
active SW; on iPhone the installed app opens standalone with correct icon;
after viewing an exercise once, airplane-mode revisit still shows its GIF
(shell + media from cache) while data screens show their Spanish error states.

## Open items

(none — resolved 2026-07-18 by the human: app name **"Rutinas Gym"**
(short_name "Rutinas"); icon = **white dumbbell glyph on a dark
blue/near-black background**, generated from one source SVG.)
