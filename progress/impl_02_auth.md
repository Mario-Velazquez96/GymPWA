# Implementación — 02_auth

**Estado:** completa, pendiente de revisión (no marcada `done`).
**Fecha:** 2026-07-19

## Qué cambió

### Nuevo

- `src/services/auth.ts` — `signIn(email, password) → { error: string | null }`
  y `signOut()`. Mapeo de errores a español (R3): `invalid_credentials` →
  "Correo o contraseña incorrectos"; cualquier otro error/excepción →
  "Error de conexión, reintenta". Detalles solo por `console.debug` gated con
  `import.meta.env.DEV`. Maneja el caso `supabase === null` (env sin
  configurar) sin tocar la red.
- `src/hooks/useSession.tsx` — `<SessionProvider>` (resuelve `getSession()` +
  se suscribe a `onAuthStateChange`, con cleanup de la suscripción) y
  `useSession()` que expone `{ session, loading }` y lanza un error claro fuera
  del provider.
- `src/components/ProtectedRoute.tsx` — guard: sin env → `<ConfigError />`
  (preserva el contrato de 00); `loading` → spinner sin parpadeo de redirección
  (R6); sin sesión → `<Navigate to="/login" replace>` (R1); con sesión →
  `<AppHeader /> + children`.
- `src/components/PublicOnly.tsx` — guard inverso de `/login`: con sesión →
  `<Navigate to="/" replace>` (R8); `loading` → spinner; sin env renderiza el
  formulario igual.
- `src/components/AppHeader.tsx` — app shell con "Cerrar sesión" (`min-h-11`)
  en todas las pantallas protegidas (R5). La redirección post-signOut sale del
  cambio de sesión, no de navegación manual.
- `src/components/LoadingScreen.tsx` — indicador "Cargando…" (`role="status"`).
- `e2e/auth.spec.ts` — round trip completo contra el proyecto Supabase real +
  caso negativo de contraseña incorrecta; se salta con mensaje claro si
  `E2E_EMAIL`/`E2E_PASSWORD` no están definidos (verificado: 2 skipped).

### Modificado

- `src/screens/LoginScreen.tsx` — formulario real: labels "Correo"/"Contraseña",
  inputs `type=email`/`password` + `required`, targets `min-h-11`, botón
  deshabilitado con "Entrando…" en vuelo, error inline `role="alert"` (R2, R3,
  R7). En éxito no navega manualmente: `<PublicOnly>` redirige al cambiar la
  sesión.
- `src/App.tsx` — `<SessionProvider>` + guards en todas las rutas; `/login`
  envuelto en `<PublicOnly>`, el resto en `<ProtectedRoute>`.
- `src/App.test.tsx` — actualizado al nuevo comportamiento (rutas protegidas
  redirigen a /login sin sesión; ConfigError sin env se conserva).
- `playwright.config.ts` — carga `.env.local` con `process.loadEnvFile`
  (Node ≥ 20.12, sin dependencia nueva) para exponer `E2E_*` a los specs.
- `eslint.config.js` — `no-console` ahora permite `debug` (el design de
  02_auth manda detalles de error a `console.debug` solo en dev).
- `.env.example` — ya documentaba `E2E_EMAIL`/`E2E_PASSWORD` como opcionales
  (placeholders); verificado, sin cambios necesarios.

Sin dependencias nuevas, sin cambios de esquema/SQL, sin tocar el contenido de
las demás pantallas (solo se envuelven en guards). Solo escritura vía
Supabase Auth — ninguna tabla nueva ni writes fuera de `workout_logs`.

## Trazabilidad R<n> → prueba

| Req | Prueba |
| --- | --- |
| R1 | `ProtectedRoute.test.tsx > "sin sesión redirige a /login"`; `App.test.tsx > "sin sesión, / redirige a /login"` y deep-links `/historial/0001`, `/ejercicio/abc-123`; e2e `auth.spec.ts` steps R1 |
| R2 | `auth.test.ts > "con credenciales válidas devuelve { error: null }…"`; `LoginScreen.test.tsx > "envía las credenciales a signIn"`; e2e step R2 |
| R3 | `auth.test.ts` (invalid_credentials, error genérico nunca crudo, excepción de red); `LoginScreen.test.tsx > "muestra el error en español inline…"`; e2e `"R3: contraseña incorrecta…"` |
| R4 | `useSession.test.tsx > "…expone la sesión persistida que devuelve getSession"`; e2e step R4 (reload mantiene sesión) |
| R5 | `AppHeader.test.tsx > "al pulsar 'Cerrar sesión' llama a signOut"`; `auth.test.ts` describe `signOut`; `useSession.test.tsx` (SIGNED_OUT → null); e2e step R5 |
| R6 | `ProtectedRoute.test.tsx > "mientras carga muestra el indicador y no redirige…"`; `PublicOnly.test.tsx > "mientras carga muestra el indicador…"` |
| R7 | `LoginScreen.test.tsx > "renderiza inputs con label y targets ≥ 44px"` y `"deshabilita el botón y muestra 'Entrando…'"`; `App.test.tsx > "/login muestra el formulario con inputs etiquetados"` |
| R8 | `PublicOnly.test.tsx > "con sesión redirige de /login a /"`; e2e step R8 |

Casos borde cubiertos: cliente supabase `null` (env sin configurar) en
`signIn`/`signOut`/`SessionProvider`/guards; excepción de red; error de
Supabase distinto a credenciales; `useSession` fuera del provider; unsubscribe
al desmontar.

## Verificación

- `./init.sh` (full: install → typecheck → lint → test → build): **verde**.
- Cobertura: `services/auth.ts` 100% líneas, `hooks/useSession.tsx` 100%
  líneas (umbral ≥ 80% cumplido); global 94.73% líneas.
- `./init.sh e2e`: **3 passed** (smoke + round trip real contra Supabase +
  contraseña incorrecta). Credenciales leídas de `.env.local`, nunca impresas.
- Skip limpio verificado: con `E2E_EMAIL`/`E2E_PASSWORD` vacíos → `2 skipped`
  con mensaje "E2E_EMAIL / E2E_PASSWORD no definidos en .env.local…".
- Sin `any`, sin `console.log`; `console.debug` solo gated por
  `import.meta.env.DEV` (permitido por design y por la regla de lint).

## Notas para el reviewer

- `eslint.config.js` ganó `"debug"` en el allow-list de `no-console` — exigido
  por el design de 02_auth (detalles de error solo en dev vía `console.debug`).
- `ProtectedRoute` muestra `<ConfigError />` cuando faltan las `VITE_*` en vez
  de rebotar a un login que no podría funcionar; esto preserva el contrato R5
  de 00_project_setup (los tests de App lo cubren).
- Ítem abierto del spec resuelto: el usuario de pruebas existe en el proyecto
  real y el e2e corre contra él.
