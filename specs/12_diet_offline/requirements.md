# Requirements — 12_diet_offline

**Feature:** Disponibilidad offline de la sección Dieta (snapshot a nivel app, stale-while-revalidate)
**Source:** client_requirement_dieta RF-D6 (súper sin señal), RF-D10 (offline), §8 criterio 7; docs/architecture.md ("Never cache Supabase API responses in the SW"); docs/conventions.md §PWA; specs/07_pwa_install_and_cache (precache del shell, R3/R5); specs/10_diet_screen (`getActiveDietPlan`, `useDietPlan`, `DietPlanFull`, estados de `DietScreen`); specs/11_diet_checklists (estado de tachado en `localStorage`); `src/lib/units.ts` (modelo de persistencia local robusta); `src/hooks/useSession.tsx`, `src/components/ProtectedRoute.tsx`; `@supabase/auth-js` 2.110.7 `GoTrueClient.js` (comportamiento del refresh sin red)
**Depends on:** 11_diet_checklists, 07_pwa_install_and_cache

## Purpose

Que la sección Dieta siga siendo consultable en la cocina y en el pasillo del
súper sin señal: **tras haber abierto Dieta una vez con red**, en modo avión se
ve el plan completo (macros, ventana, comidas, meal prep, súper, suplementos,
secciones) y las listas se siguen tachando. Se logra con un **snapshot del
último plan cargado guardado en `localStorage` por el hook** (stale-while-
revalidate a nivel app), **no** cacheando la API de Supabase en el service
worker: el shell y el chunk de `/dieta` ya se precachean desde 07, y las
listas de 11 ya viven en `localStorage`. Incluye un indicador discreto de
"datos guardados sin conexión" y define qué pasa cuando la **sesión no puede
refrescarse sin red** (hoy expulsa a `/login`; se propone el cambio mínimo en
02_auth como open item). No incluye cola offline de escrituras ni cambios de
esquema, SW, env o dependencias.

## In scope

- Módulo puro `src/lib/dietCache.ts`: `DIET_SNAPSHOT_KEY = "gym:diet:snapshot"`,
  `DIET_SNAPSHOT_VERSION = 1`, tipo `DietSnapshot`, `readDietSnapshot()`,
  `writeDietSnapshot(plan)`, `formatSavedAt(iso)`.
- Hook `src/hooks/useDietPlan.ts` (de 10) reescrito a stale-while-revalidate:
  snapshot inmediato → `getActiveDietPlan()` → reemplazo/persistencia o
  `isStale` → reintento al evento `online`.
- Componente presentacional `src/components/OfflineBanner.tsx` y su montaje en
  `src/screens/DietScreen.tsx` bajo el `<h1>`.
- Sesión sin red (open item A, toca 02_auth): `src/hooks/useSession.tsx`
  expone `offlineSession`; `src/components/ProtectedRoute.tsx` no redirige a
  `/login` mientras `offlineSession` sea `true`.
- Limpieza del snapshot al cerrar sesión (open item B, toca
  `src/services/auth.ts#signOut`).
- Verificación (sin cambios de config) de que `vite.config.ts` no cachea
  `/rest/` ni `/auth/` y de que el chunk lazy de `/dieta` está en el precache.
- Tests: unit `lib/dietCache`, hook `useDietPlan` (5 caminos SWR + `online`),
  componente `OfflineBanner` y `DietScreen` con/sin `isStale`, `useSession` y
  `ProtectedRoute` con `offlineSession`, `services/auth` (signOut limpia),
  E2E `e2e/diet-offline.spec.ts` (criterio 7 completo con
  `context.setOffline(true)` contra la build de producción).

## Out of scope

- Cualquier regla de `runtimeCaching` para `/rest/` o `/auth/` en el service
  worker (prohibido por docs/architecture.md; 07 R5 lo afirma con test).
- Cola offline de escrituras a `workout_logs` (docs/architecture.md, 07).
- Snapshot offline de Hoy / Ejercicio / Historial (otra feature si se pide).
- Cambios en `src/services/diet.ts`, en el esquema (09), en RLS, en el
  manifest, en `.env.example` o en `package.json`.
- Botón "Sincronizar" en el banner: al volver la red basta con reabrir la
  pestaña o con el evento `online` (R11).
- Refresco de la sesión por parte de la app: sigue siendo responsabilidad de
  supabase-js (`autoRefreshToken`); 12 solo evita el redirect indebido.
- Cifrado del snapshot: el plan se guarda en claro en `localStorage`, igual que
  la sesión de supabase-js (dispositivo personal de un solo usuario).

## Requirements (EARS)

### Snapshot local (`src/lib/dietCache.ts`)

**R1 (Ubiquitous):** `lib/dietCache.ts` deberá persistir el snapshot en
`localStorage` bajo la clave `gym:diet:snapshot` como JSON con la forma
`{ v: 1, plan: DietPlanFull, savedAt: string }` (`savedAt` en ISO 8601 UTC), y
`readDietSnapshot()` deberá devolver `null` cuando la clave no exista.

**R2 (Unwanted behavior):** Si el valor guardado no es JSON válido, tiene
`v !== 1`, no tiene la forma esperada (`plan.id` string y los cuatro arrays
`diet_meals`, `diet_checklist_items`, `diet_supplements`, `diet_sections`), o
el acceso a `localStorage` lanza (Safari con almacenamiento bloqueado),
entonces `readDietSnapshot()` deberá devolver `null` sin lanzar, registrando
el detalle solo con `console.debug` en DEV.

**R3 (Event-driven):** Cuando se llame `writeDietSnapshot(plan)` con un
`DietPlanFull`, el sistema deberá escribir `{ v: 1, plan, savedAt: <ahora ISO> }`
de modo que `readDietSnapshot()` devuelva un objeto **igual** (`toEqual`) —
incluidos los `id` de `diet_checklist_items` y el orden por `position` de las
cuatro hijas.

**R4 (Event-driven):** Cuando se llame `writeDietSnapshot(null)` (la red
respondió "sin plan activo"), el sistema deberá **eliminar** la clave
`gym:diet:snapshot`, de modo que `readDietSnapshot()` devuelva `null`.

**R5 (Unwanted behavior):** Si `localStorage.setItem`/`removeItem` lanza
(cuota, modo privado) o `localStorage` no es accesible, entonces
`writeDietSnapshot` deberá tragarse el fallo (best-effort) y la app deberá
seguir mostrando el plan en memoria.

### Hook stale-while-revalidate (`src/hooks/useDietPlan.ts`)

**R6 (Event-driven):** Cuando `useDietPlan` se monte y exista un snapshot, el
hook deberá devolver de inmediato `plan = snapshot.plan`, `loading: false`,
`error: null`, `isStale: false` (sin pasar por "Cargando dieta…") y lanzar
**exactamente una** llamada a `getActiveDietPlan()`.

**R7 (State-driven):** Mientras no exista snapshot y `getActiveDietPlan()` esté
en vuelo, el hook deberá devolver `loading: true` y `plan: null` (10 R16 sin
cambios).

**R8 (Event-driven):** Cuando `getActiveDietPlan()` responda sin error, el hook
deberá reemplazar `plan` por `data` (aunque `data` sea `null` → estado vacío),
poner `isStale: false`, `savedAt: null`, y llamar `writeDietSnapshot(data)`
(con `null` borra el snapshot, R4).

**R9 (Unwanted behavior):** Si `getActiveDietPlan()` devuelve error y hay
snapshot (leído de nuevo en ese momento), entonces el hook deberá conservar
`plan = snapshot.plan`, exponer `isStale: true`, `savedAt = snapshot.savedAt`
y `error: null` (no se muestra el estado de error).

**R10 (Unwanted behavior):** Si `getActiveDietPlan()` devuelve error y **no**
hay snapshot, entonces el hook deberá exponer `error: "No se pudo cargar la
dieta"`, `plan: null`, `isStale: false`, y `retry()` deberá pasar a
`loading: true` y volver a llamar al service (10 R18 sin cambios).

**R11 (Event-driven):** Cuando el `window` emita `online` mientras
`isStale === true`, el hook deberá relanzar `getActiveDietPlan()` una vez: si
responde OK aplica R8 (el banner desaparece); si vuelve a fallar conserva R9.
El listener solo deberá registrarse mientras `isStale` sea `true` y deberá
retirarse al desmontar o al dejar de estar stale.

### Pantalla (`src/screens/DietScreen.tsx`, `src/components/OfflineBanner.tsx`)

**R12 (State-driven):** Mientras `isStale === true`, `DietScreen` deberá
renderizar `OfflineBanner` (un `<p role="status">`) con el texto
"Sin conexión · plan guardado el <fecha>" inmediatamente **debajo del
`<h1>Dieta</h1>` y encima de `MacroSummary`**, y deberá renderizar el plan
completo exactamente igual que con datos frescos (macros, ventana, comidas,
meal prep y súper de 11, suplementos, secciones). Mientras `isStale === false`
no deberá existir ningún elemento con ese texto.

**R13 (Ubiquitous):** `formatSavedAt(iso)` deberá formatear la fecha del
snapshot en es-MX y zona `America/Mexico_City` como
`"<día> <mes abreviado sin punto> <HH:MM>"` (`"2026-09-10T15:15:00Z"` →
`"10 sep 09:15"`), y deberá devolver `null` ante un ISO inválido; en ese caso
el banner deberá decir "Sin conexión · plan guardado en este dispositivo".

### Listas tachables sin red (contrato con 11)

**R14 (State-driven):** Mientras se muestre el snapshot, los `id` de
`plan.diet_checklist_items` deberán ser los mismos que devolvió la red para
ese plan (R3), de modo que el estado de tachado de 11 en
`gym:diet:check:<planId>:<kind>` aplique igual: un renglón tachado sin red
deberá seguir tachado tras recargar sin red, y "Desmarcar todo" deberá
funcionar sin red.

### Service worker y capas intactas

**R15 (Ubiquitous):** La feature no deberá añadir ninguna regla de
`runtimeCaching` ni de precache para rutas `/rest/` o `/auth/` de Supabase:
`vite.config.ts` (bloque `workbox`) deberá quedar **sin cambios** y el test
07 R5 ("las respuestas de /rest/ nunca se cachean") deberá seguir en verde.

**R16 (Ubiquitous):** Donde el service worker esté activo (build de
producción), el chunk lazy de `DietScreen` (`/assets/DietScreen-<hash>.js`,
generado por `React.lazy` en 10) deberá formar parte del precache de Workbox
(entra por `globPatterns: ["**/*.{js,…}"]`), de modo que `/dieta` se sirva
sin red vía `navigateFallback: "/index.html"` + precache.

**R17 (Ubiquitous):** `src/services/diet.ts` deberá quedar sin cambios; la
feature no deberá escribir en ninguna tabla de Supabase, ni añadir migración,
env var, dependencia ni cambio de manifest.

### Sesión sin red (open item A — toca 02_auth)

**R18 (Unwanted behavior):** Si `supabase.auth.getSession()` resuelve
`{ data: { session: null }, error }` con `isAuthRetryableFetchError(error)`
(existe una sesión persistida cuyo access token caducó y el refresh falló por
red), entonces `SessionProvider` deberá exponer `session: null`,
`offlineSession: true`, `loading: false` y **no** tratarlo como cierre de
sesión; el evento `INITIAL_SESSION` de `onAuthStateChange` deberá ignorarse
(la sesión inicial la fija `getSession()`), porque en ese caso auth-js lo
emite con `null`.

**R19 (State-driven):** Mientras `offlineSession === true`, `ProtectedRoute`
deberá renderizar `AppHeader` + hijos + `BottomNav` en lugar de
`<Navigate to="/login">`; mientras `offlineSession === false` y
`session === null`, deberá seguir redirigiendo a `/login` (02 R1 intacto).

**R20 (Event-driven):** Cuando `onAuthStateChange` emita `TOKEN_REFRESHED` o
`SIGNED_IN` con sesión, el sistema deberá fijar `session` y poner
`offlineSession: false`; cuando emita `SIGNED_OUT` (refresh token
genuinamente inválido al volver la red, o logout), deberá fijar
`session: null` y `offlineSession: false`, con lo que `ProtectedRoute`
redirige a `/login`.

### Limpieza y convenciones

**R21 (Event-driven):** Cuando el usuario cierre sesión (`services/auth.ts#signOut`),
el sistema deberá llamar `writeDietSnapshot(null)` para que el siguiente
usuario del dispositivo no vea el plan del anterior (open item B).

**R22 (Ubiquitous):** Todo texto nuevo deberá estar en español; `OfflineBanner`
no deberá hacer fetching (datos por props); no deberá haber `supabase.from`
fuera de `src/services/`; las suites de 02–11 deberán seguir en verde (los
únicos cambios permitidos fuera de los archivos nuevos son: `useDietPlan.ts`,
`DietScreen.tsx` (montaje del banner), `useSession.tsx`, `ProtectedRoute.tsx`
y `services/auth.ts#signOut`).

## Acceptance

Criterio 7 de client_requirement_dieta §8, ejecutable: Mario abre Dieta con
red (se ve el plan), activa el modo avión y vuelve a abrir la app: el shell y
el chunk de Dieta cargan desde el precache, la sesión persistida no rebota a
`/login` (aunque el token haya caducado), y `/dieta` muestra el banner
"Sin conexión · plan guardado el 10 sep 09:15" bajo el título, con macros,
ventana, comidas, meal prep, súper, suplementos y secciones idénticos a los de
la última carga con red; toca un renglón del súper y queda tachado; recarga sin
red y sigue tachado; "Desmarcar todo" limpia. Al volver la señal, al reabrir
Dieta (o al dispararse `online`) el banner desaparece y el plan se actualiza.
Sin plan activo con red, Dieta muestra el vacío y el snapshot queda borrado.
Nada de esto añade cachés de API en el SW ni escribe en Supabase.
Accesibilidad: el banner es `role="status"` (anunciado sin robar el foco) y no
altera el orden ni los tamaños táctiles del resto de la pantalla.

## Open items

- **A. Sesión sin red — hoy SÍ expulsa a `/login` (recomendación: aplicar
  R18–R20, cambio mínimo en 02_auth).** Evidencia en
  `node_modules/.pnpm/@supabase+auth-js@2.110.7/.../GoTrueClient.js`:
  `__loadSession()` devuelve la sesión persistida **sin red** mientras falten
  más de 90 s para caducar (`EXPIRY_MARGIN_MS = 3 × 30 000`, `constants.js:10`;
  líneas 2486–2512). Si el access token ya caducó (1 h por defecto) llama
  `_callRefreshToken` (2514); ante un fallo de red el error es
  `AuthRetryableFetchError` (`fetch.js:28,114`) y `_callRefreshToken` **conserva
  la sesión en storage y no emite `SIGNED_OUT`** (4190–4211: solo llama
  `_removeSession` en errores no-retryables con token caducado). Pero
  `__loadSession` devuelve `{ session: null, error }` (2525–2535: solo entrega
  la sesión si el access token sigue vigente), y `_emitInitialSession` emite
  `INITIAL_SESSION` con `null` + `console.error` (3593–3611). En
  `src/hooks/useSession.tsx:35-40` `getSession().then(({ data }) =>
  setSession(data.session))` fija `null` y `:44-49` `onAuthStateChange`
  vuelve a fijar `null`; `src/components/ProtectedRoute.tsx:31-33` hace
  `<Navigate to="/login">` con `session === null`. **Conclusión: con red
  ausente y token caducado, hoy la app expulsa a `/login`** aunque supabase-js
  conserve la sesión y la refresque sola al volver la red (ticker cada 30 s,
  cooldown de 60 s por fallo, `visibilitychange` → `_recoverAndRefresh`, y al
  lograrlo emite `TOKEN_REFRESHED`, 4180). Cambio propuesto: `offlineSession`
  en `SessionProvider` + guard en `ProtectedRoute` (design.md). Si el humano lo
  rechaza, R18–R20 y sus tests se retiran y el criterio 7 queda garantizado
  solo dentro de la primera hora tras el último refresh.
- **B. Borrar el snapshot al cerrar sesión (R21, toca
  `services/auth.ts#signOut`).** Recomendado (una línea + un test); si se
  rechaza, el snapshot del usuario anterior se mostraría un instante en el
  siguiente login del mismo dispositivo hasta que la red lo reemplace.
- **C. Precisión sobre la firma pedida por el leader:** `readDietSnapshot()`
  devuelve `DietSnapshot | null` con `plan: DietPlanFull` (nunca `null` dentro
  del snapshot), porque `writeDietSnapshot(null)` **borra** la clave (R4): un
  "snapshot de sin plan" y "sin snapshot" son lo mismo. Sin red y sin haber
  visto nunca un plan, Dieta muestra el error con "Reintentar" (R10), no el
  vacío — es lo honesto: no sabemos si hay plan.
- **D. Reintento al evento `online` (R11): se incluye.** Justificación: en
  iPhone la app instalada se reanuda sin recargar; sin el listener, el banner
  persistiría hasta cambiar de pestaña y volver. Coste: ~6 líneas y dos tests;
  riesgo nulo (un `online` sin Internet real solo produce otro fallo que
  conserva el snapshot). No se añade polling ni `visibilitychange`.
- **Sin cambios al contrato entre repos:** solo se lee lo que 09 define y se
  persiste localmente; no hay open item de esquema.
