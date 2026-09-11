# Tasks — 12_diet_offline

> Orden de implementación. Cada tarea cita el/los requisito(s) que satisface.
> Marca `[x]` al completarla. No empieces hasta que el humano apruebe el spec
> y 10 y 11 estén `done` (el hook y la pantalla que aquí se modifican son los
> suyos). ⚠️ Datos reales en vivo: nada de esta feature escribe en Supabase;
> los E2E son de solo lectura y usan un contexto de navegador efímero.

## 1. Decisiones previas

- [x] Resolver con el humano los open items **A** (sesión sin red: cambio en
      `useSession`/`ProtectedRoute`, toca 02_auth), **B** (`signOut` borra el
      snapshot), **C** (firma de `readDietSnapshot`) y **D** (reintento al
      evento `online`) antes de tocar código (R11, R18, R19, R20, R21)
- [x] Confirmar leyendo `src/hooks/useDietPlan.ts` y `src/screens/DietScreen.tsx`
      tal como los dejaron 10 y 11 (nombres de estado, localizadores de las
      listas tachables y clave `gym:diet:check:<planId>:<kind>`) y anotar en
      `progress/impl_12_diet_offline.md` cualquier diferencia con el design
      (R12, R14)

## 2. Persistencia local pura

- [x] Crear `src/lib/dietCache.ts`: `DIET_SNAPSHOT_KEY`, `DIET_SNAPSHOT_VERSION`,
      tipo `DietSnapshot`, `storage()` con try/catch, `isDietSnapshot`,
      `readDietSnapshot()`, `writeDietSnapshot(plan, now?)` (null → `removeItem`),
      `formatSavedAt(iso)`; `debugCache` solo en DEV (R1, R2, R3, R4, R5, R13)
- [x] **Tests unitarios** `src/lib/dietCache.test.ts`: vacío; JSON inválido;
      `v: 2`; forma inválida (×3); getter de `localStorage` que lanza (read y
      write); `setItem` que lanza; round-trip con `now` inyectado e ids de
      `diet_checklist_items` intactos; `write(null)` borra; `formatSavedAt`
      (fecha válida con regex `/^10 sept? 09:15$/`, 23:59 sin cambio de día,
      inválida → `null`) (R1, R2, R3, R4, R5, R13, R14)

## 3. Hook stale-while-revalidate

- [x] Reescribir `src/hooks/useDietPlan.ts` con la máquina de fases
      `loading | snapshot | fresh | stale | error` del design: lectura única
      del snapshot al montar, una llamada a `getActiveDietPlan()` por
      `attempt`, `writeDietSnapshot(result.data)` en OK, relectura del snapshot
      en fallo, `retry()` que pasa `error → loading`, y campos nuevos
      `isStale` / `savedAt` en `DietPlanState` (R6, R7, R8, R9, R10)
- [x] Añadir el efecto del evento `online` (registrado solo en `stale`,
      `removeEventListener` en cleanup) (R11)
- [x] **Tests de hook** `src/hooks/useDietPlan.test.tsx` (reemplaza/amplía el
      de 10): los 7 escenarios del design — sin snapshot+OK, sin snapshot+OK
      null, con snapshot+OK distinto (primer render sin loading, una sola
      llamada, clave reescrita), con snapshot+OK null (clave borrada), con
      snapshot+error (stale + savedAt), sin snapshot+error+retry, `online`
      (relanza en stale → OK; relanza → falla sigue stale; no relanza en
      fresh; cleanup del listener) (R6, R7, R8, R9, R10, R11)

## 4. Banner y pantalla

- [x] Crear `src/components/OfflineBanner.tsx` (`<p role="status">`, texto
      "Sin conexión · plan guardado el <fecha>" o "…en este dispositivo",
      sin fetching) (R12, R13, R22)
- [x] Montar `<OfflineBanner savedAt={savedAt} />` en `src/screens/DietScreen.tsx`
      inmediatamente bajo el `<h1>` cuando `isStale && savedAt !== null`;
      ningún otro cambio en la pantalla (R12, R22)
- [x] **Tests de componente**: `OfflineBanner.test.tsx` (role, texto con fecha,
      texto de fallback); ampliar `DietScreen.test.tsx`: con `isStale` el
      banner está entre `<h1>` y el `<dl>` de macros y el plan completo se
      renderiza (macros, comidas, suplementos, secciones, listas de 11); sin
      `isStale` no existe texto "Sin conexión" (R12, R13)

## 5. Sesión sin red (condicionado a A y B)

- [x] `src/hooks/useSession.tsx`: importar `isAuthRetryableFetchError` de
      `@supabase/supabase-js`; añadir `offlineSession` al contexto; en
      `getSession()` detectar `session === null && error retryable` →
      `offlineSession: true`; en `onAuthStateChange` ignorar `INITIAL_SESSION`
      y en el resto fijar `session` + `offlineSession: false` (R18, R20)
- [x] `src/components/ProtectedRoute.tsx`: redirigir a `/login` solo cuando
      `session === null && !offlineSession` (R19)
- [x] `src/services/auth.ts#signOut`: llamar `writeDietSnapshot(null)` tras
      cerrar sesión (R21)
- [x] **Tests**: ampliar `useSession.test.tsx` (error retryable → offline;
      `INITIAL_SESSION` null ignorado; `TOKEN_REFRESHED` limpia; `SIGNED_OUT`
      limpia; error no retryable → no offline; suites existentes verdes);
      ampliar `ProtectedRoute.test.tsx` (offline → renderiza hijos/header/nav;
      no offline → redirige); ampliar `services/auth.test.ts` (`signOut` llama
      `writeDietSnapshot(null)`) (R18, R19, R20, R21)

## 6. Service worker: verificar, no cambiar

- [x] Verificar por `git diff` que `vite.config.ts`, `public/`, el manifest,
      `.env.example`, `package.json`, `supabase/` y `src/services/diet.ts`
      quedan **sin cambios**; confirmar que `e2e/pwa.spec.ts` (07 R5, "/rest/
      nunca se cachea") sigue verde (R15, R17)
- [x] Tras `pnpm build`, comprobar en `dist/sw.js` (o en el manifest de
      precache que genera Workbox) que aparece `assets/DietScreen-<hash>.js`;
      si el chunk lleva otro nombre, ajustar el patrón del E2E test 1 y
      anotarlo en el progress file (R16)

## 7. E2E (solo lectura, build de producción)

- [x] Crear `e2e/diet-offline.spec.ts` con los tres tests del design: (1)
      precache del chunk de Dieta sin credenciales; (2) criterio 7 completo —
      login → Dieta → capturar contenido → `setOffline(true)` + `route` abort
      de `*.supabase.co` → `reload` → banner + plan completo + listas → tachar
      un renglón → `reload` sin red → sigue tachado → "Desmarcar todo" →
      volver online → Hoy → Dieta → sin banner; `test.skip` explícito si no
      hay plan activo; `pageerror` vacío; (3) token caducado
      (`expires_at` en el pasado en `sb-*-auth-token`) + sin red → sigue en
      `/dieta`, no `/login`, tolerando los errores de consola de auth-js
      (R8, R9, R12, R14, R16, R18, R19)

## 8. Cierre

- [x] Correr `./init.sh` (typecheck + lint + test con coverage + build) y
      `./init.sh e2e`; verde; confirmar cobertura ≥ 90 % en `lib/dietCache.ts`
      y ≥ 80 % en `hooks/useDietPlan.ts`, `components/OfflineBanner.tsx`,
      `screens/DietScreen.tsx`, `hooks/useSession.tsx`,
      `components/ProtectedRoute.tsx`, `services/auth.ts` (todos)
      > **Resultado real (2026-09-11):** `./init.sh` full **verde 3 veces
      > seguidas** (48 archivos / 725 tests; `dietCache.ts`, `useDietPlan.ts`,
      > `OfflineBanner.tsx`, `DietScreen.tsx`, `useSession.tsx`,
      > `ProtectedRoute.tsx` y `auth.ts` al **100 % de líneas**). En
      > `./init.sh e2e` (suite completa) siguen en rojo los **tres fallos
      > ajenos** ya documentados: `logging`/`history` por
      > `13_fix_lb_prefill_validation` y `today` por el timeout de 30 s. De los
      > tres tests de 12: el 1 y el 3 **pasan de verdad**; el 2 (criterio 7)
      > **se salta** porque `/dieta` sigue en estado de error hasta que el
      > humano aplique 003/004.
      >
      > **Tras el APPROVE del review** se aplicaron sus menores 1 y 3 (cierre de
      > sesión honesto sin red en `services/auth.ts#signOut` y precisión del
      > JSDoc de `offlineSession`); `./init.sh` full volvió a quedar **verde**
      > (48 archivos / **732 tests**, `services/auth.ts` al 100 % de líneas) y
      > `e2e/auth.spec.ts` sigue 2/2. Detalle en §9 de
      > `progress/impl_12_diet_offline.md`.
- [x] Registrar en `progress/impl_12_diet_offline.md`: decisiones A–D, tamaño
      del snapshot real en bytes, nombre real del chunk precacheado,
      resultados de las corridas y la checklist manual de iPhone: abrir Dieta
      con red → modo avión → cerrar y reabrir la app instalada → plan completo
      con banner → tachar en el súper → salir del modo avión → banner
      desaparece al reabrir Dieta; repetir con la app cerrada más de 1 h para
      ejercitar el camino de token caducado (open item A)

## Verification

- **Comandos:** `./init.sh` (instala, typecheck, lint, unit + coverage,
  build); `./init.sh e2e` o `pnpm test:e2e` (Playwright contra `pnpm preview`
  en `:4173`, requiere la build previa y `E2E_EMAIL`/`E2E_PASSWORD` +
  `VITE_SUPABASE_*` en `.env.local` para los tests 2 y 3); `git diff --stat`
  para R15/R17.
- **Trazabilidad R → test:**
  R1 → `dietCache.test.ts` (vacío, forma); R2 → `dietCache.test.ts` (corrupto,
  versión, forma inválida, storage que lanza); R3 → `dietCache.test.ts`
  (round-trip) ; R4 → `dietCache.test.ts` (write null) + `useDietPlan.test.tsx`
  (2, 4); R5 → `dietCache.test.ts` (setItem/getter lanzan);
  R6 → `useDietPlan.test.tsx` (3); R7 → `useDietPlan.test.tsx` (1);
  R8 → `useDietPlan.test.tsx` (1–4) + E2E test 2 paso 7; R9 →
  `useDietPlan.test.tsx` (5) + E2E test 2 paso 5; R10 → `useDietPlan.test.tsx`
  (6); R11 → `useDietPlan.test.tsx` (7); R12 → `OfflineBanner.test.tsx` +
  `DietScreen.test.tsx` + E2E test 2 paso 5; R13 → `dietCache.test.ts`
  (`formatSavedAt`) + `OfflineBanner.test.tsx`; R14 → `dietCache.test.ts`
  (ids intactos) + E2E test 2 paso 6; R15 → `git diff` de `vite.config.ts` +
  `e2e/pwa.spec.ts` R5 verde; R16 → E2E test 1 + inspección de `dist/sw.js`;
  R17 → `git diff` (`services/diet.ts`, `supabase/`, `.env.example`,
  `package.json`); R18 → `useSession.test.tsx` + E2E test 3; R19 →
  `ProtectedRoute.test.tsx` + E2E test 3; R20 → `useSession.test.tsx`
  (`TOKEN_REFRESHED`, `SIGNED_OUT`); R21 → `services/auth.test.ts`; R22 →
  suites 02–11 verdes + `grep` de `supabase.from` fuera de `services/` +
  `git diff --stat` limitado a los archivos permitidos.
- **Coverage:** ≥ 90 % líneas en `src/lib/dietCache.ts`; ≥ 80 % en el resto
  de módulos tocados; umbral global (80 %) intacto.
- **Manual en el iPhone (registrar en el progress file):** con el plan real,
  criterio 7 de client_requirement_dieta §8 en modo avión tras abrir Dieta una
  vez, incluida la reapertura tras más de 1 h (token caducado) sin rebotar a
  `/login`.
