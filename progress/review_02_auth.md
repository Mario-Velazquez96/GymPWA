# Review — 02_auth

**Verdicto: APPROVE**
**Fecha:** 2026-07-19
**Revisor:** reviewer subagent (read-only)

## Qué se verificó

### 1. Trazabilidad R1–R8 → pruebas (spot-check real, no solo el mapping)

| Req | Prueba verificada | Aserción real |
| --- | --- | --- |
| R1 | `ProtectedRoute.test.tsx` "sin sesión redirige a /login"; `App.test.tsx` (/, /historial/0001, /ejercicio/abc-123); e2e steps R1 (inicial + post-signout deep-link) | Asserta que aparece la pantalla de login y que el contenido protegido NO se renderiza |
| R2 | `auth.test.ts` (credenciales → `{ error: null }` y payload exacto a `signInWithPassword`); `LoginScreen.test.tsx` "envía las credenciales a signIn"; e2e step R2 (URL `/` + heading "Hoy") | Sí |
| R3 | `auth.test.ts` (invalid_credentials → mensaje ES; error genérico → "Error de conexión, reintenta" y `not.toContain("raw supabase error")`; excepción de red; cliente null); `LoginScreen.test.tsx` (`role="alert"` con texto ES, sigue en el form); e2e negativo (permanece en /login) | Sí |
| R4 | `useSession.test.tsx` (getSession persistida → session expuesta); e2e step R4 (`page.reload()` mantiene "Hoy", no /login) | Sí |
| R5 | `AppHeader.test.tsx` (click → `signOut` llamado); `auth.test.ts` describe signOut (error/excepción/null no lanzan); `useSession.test.tsx` SIGNED_OUT → null; e2e step R5 (vuelve a /login) | Sí |
| R6 | `ProtectedRoute.test.tsx` y `PublicOnly.test.tsx` "mientras carga": `role="status"` "Cargando…" y ni redirección ni children | Sí — sin flash de redirect |
| R7 | `LoginScreen.test.tsx` (labels "Correo"/"Contraseña", `type=email/password`, `required`, `min-h-11` en inputs+botón, disabled + "Entrando…" en vuelo); `App.test.tsx` inputs etiquetados | Sí |
| R8 | `PublicOnly.test.tsx` "con sesión redirige de /login a /"; e2e step R8 | Sí |

### 2. Tareas (tasks.md) — todas `[x]` y verificadas en código

- `services/auth.ts`: mapeo `invalid_credentials` → ES, resto → conexión; `console.debug` gated `import.meta.env.DEV`; caso `supabase === null`. ✔
- `hooks/useSession.tsx`: `getSession` + `onAuthStateChange`, cleanup con `subscription.unsubscribe()` y flag `active`. ✔
- Guards `ProtectedRoute`/`PublicOnly` cableados en `App.tsx` con `<SessionProvider>`; loading → `LoadingScreen`; sin env → `ConfigError` (contrato de 00 preservado). ✔
- `LoginScreen`: labels, `min-h-11`, pending/disabled, error inline `role="alert"`. ✔
- `AppHeader` con "Cerrar sesión" (`min-h-11`) en todas las rutas protegidas. ✔
- `.env.example` documenta `E2E_EMAIL`/`E2E_PASSWORD` como placeholders opcionales. ✔

### 3. Checks en verde (ejecutados por el revisor)

- `./init.sh` (full): install → typecheck → lint → test → build, **verde**. 45 tests, 9 archivos.
- Cobertura: `services/auth.ts` **100%** líneas, `hooks/useSession.tsx` **100%** líneas (objetivo ≥ 80% cumplido); global 94.73% líneas.
- `./init.sh e2e`: **3 passed, 0 skipped** — el round trip corrió de verdad contra el proyecto Supabase real (`.env.local` tiene `E2E_*` no vacíos; valores nunca impresos).
- Build PWA emite `manifest.webmanifest` + `sw.js` (sin cambios de SW en esta feature).

### 4. Convenciones

- Texto UI 100% español; sin `any`; sin `console.log` (grep limpio); `console.debug` permitido por lint y gated a dev, conforme al design.
- `supabase.auth`/`createClient` solo en `lib/supabase.ts`, `services/auth.ts`, `hooks/useSession.tsx` — componentes/pantallas no tocan el cliente (grep verificado).
- Targets ≥ 44px (`min-h-11`) en inputs, botón de login y "Cerrar sesión".

### 5. Datos y seguridad

- Sin cambios en `supabase/` (SQL intacto); ninguna tabla nueva; sin writes fuera de Supabase Auth.
- Solo variables `VITE_*` (públicas) y `E2E_*` (solo `.env.local`, gitignored). Grep de patrones de credenciales (`sb_publishable_`, `@gmail`, `TestUser`) excluyendo `.env.local`: solo placeholders en `.env.example` y el correo público del cliente ya presente en `project-documents/` desde antes. Sin service key en el repo.
- Guards documentados como UX; la autorización real es RLS (comentario explícito en `ProtectedRoute`).

### 6. Alcance

- `package.json`/`pnpm-lock.yaml` sin cambios — **cero dependencias nuevas** (`process.loadEnvFile` es Node built-in).
- Sin rutas nuevas más allá de las 4 existentes; sin env vars nuevas obligatorias.
- Cambios auxiliares justificados por el design: `eslint.config.js` permite `console.debug`; `playwright.config.ts` carga `.env.local`.
- `feature_list.json`: 02_auth quedó en `in_progress` (el implementer no lo marcó done — correcto).

## Conclusión

Todos los requisitos trazados, todas las tareas verificadas, pipelines verdes,
sin hallazgos de seguridad ni de alcance. **El leader puede marcar `02_auth`
como `done`.** (Nota operativa, no bloqueante: el trabajo está en el working
tree sin commitear; commitear al cerrar la feature.)
