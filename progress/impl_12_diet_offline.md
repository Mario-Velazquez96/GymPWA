# impl — 12_diet_offline

Feature implementada, verificada y **aprobada por el reviewer**
(`progress/review_12_diet_offline.md`: APPROVE, 0 bloqueantes, 4 menores).
Los menores se atendieron en §9.

## 1. Decisiones previas (open items A–D)

Resueltas por el humano con la opción recomendada de cada open item y
transmitidas por el leader:

| Open item | Decisión |
|---|---|
| **A** — sesión sin red | **Sí** al cambio mínimo en `useSession`/`ProtectedRoute` (toca 02_auth): un fallo de refresco por falta de red no expulsa a `/login` habiendo sesión persistida. Con tests de ambos lados. |
| **B** — `signOut` | **Sí**: `services/auth.ts#signOut` borra el snapshot (`writeDietSnapshot(null)`). |
| **C** — firma | `readDietSnapshot(): DietSnapshot \| null` con `plan: DietPlanFull` no nulo, tal como lo precisa el design. |
| **D** — reintento | **Sí** al listener del evento `online` mientras `isStale`; sin polling ni `visibilitychange`. |

## 2. Estado real de 10 y 11 (lo que encontré antes de escribir)

- `src/hooks/useDietPlan.ts` (10): devolvía `{ loading, error, plan, retry }`
  con el patrón "clave de intento" (`LoadedResult.key`), sin `isStale` ni
  `savedAt`. Reescrito a la máquina de fases del design.
- `src/screens/DietScreen.tsx` (10 + 11): `<h1>Dieta</h1>` seguido de
  `renderBody()`; dentro del plan, `<p>{plan.name}</p>` → `MacroSummary`
  (`<dl aria-label="Macros del día">`) → `EatingWindow` → Comidas →
  `SupplementList` → "Qué cocinar" → "Lista de súper" → "Más del plan".
  El banner entra entre el `<h1>` y `renderBody()` (ver desviación 1).
- `src/lib/checklist.ts` (11): clave `gym:diet:check:<planId>:<kind>`
  (`checklistStorageKey`), tal como asume R14. Localizadores de los renglones:
  `getByRole("checkbox")` con `aria-checked` y `line-through`; botón
  "Desmarcar todo" por sección.
- `src/services/diet.ts` (10): **no se toca** (R17).

## 3. Archivos creados / cambiados

**Nuevos (solo de 12):**

| Archivo | Qué es |
|---|---|
| `src/lib/dietCache.ts` | Módulo puro: `DIET_SNAPSHOT_KEY`, `DIET_SNAPSHOT_VERSION`, `DietSnapshot`, `readDietSnapshot`, `writeDietSnapshot(plan, now?)`, `formatSavedAt`. |
| `src/lib/dietCache.test.ts` | 24 casos: ausente, corrupto, versión, forma, storage hostil, round-trip, borrado, formato de fecha. |
| `src/components/OfflineBanner.tsx` | `<p role="status">` con "Sin conexión · plan guardado el …". Presentacional. |
| `src/components/OfflineBanner.test.tsx` | Rol, texto con fecha, texto de respaldo, ausencia de botón. |
| `e2e/diet-offline.spec.ts` | Tres tests Playwright contra la build de producción. |

**Modificados:**

| Archivo | Cambio |
|---|---|
| `src/hooks/useDietPlan.ts` | Reescrito a la máquina de fases `loading \| snapshot \| fresh \| stale \| error` + listener de `online`; la API pública añade `isStale` y `savedAt`. |
| `src/hooks/useDietPlan.test.tsx` | Reemplaza al de 10: 15 casos (SWR completo + `online` + cleanup). |
| `src/screens/DietScreen.tsx` | 3 líneas: import, destructuring de `isStale`/`savedAt`, montaje del banner bajo el `<h1>`; + 3 líneas de JSDoc. |
| `src/screens/DietScreen.test.tsx` | `mockState` incluye los campos nuevos; bloque "snapshot sin conexión" (4 casos). |
| `src/hooks/useSession.tsx` | **Open item A** (ver §4). |
| `src/hooks/useSession.test.tsx` | 8 casos nuevos de sesión sin red + aserción de `offlineSession` en el caso feliz. |
| `src/components/ProtectedRoute.tsx` | **Open item A**: `if (session === null && !offlineSession)`. |
| `src/components/ProtectedRoute.test.tsx` | Mock del hook con `offlineSession` + 4 casos nuevos. |
| `src/services/auth.ts` | **Open item B**: `signOut` borra el snapshot. |
| `src/services/auth.test.ts` | 4 casos nuevos (`writeDietSnapshot` mockeado). |

**Sin tocar, verificado por `git diff`:** `vite.config.ts`, `public/`, el
manifest, `.env.example`, `package.json`, `pnpm-lock.yaml`, `supabase/` y
`src/services/diet.ts` (R15, R17). Cero migraciones, cero dependencias, cero
env vars, cero escrituras a Supabase, cero reglas nuevas de `runtimeCaching`.

## 4. El cambio en auth, exacto (open items A y B — tocan 02_auth, que estaba `done`)

### `src/hooks/useSession.tsx`

1. Import: `import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";`
   (auth-js lo reexporta; comprobado en runtime antes de usarlo).
2. `SessionContextValue` gana `offlineSession: boolean`, documentado en el tipo.
3. Estado nuevo `const [offlineSession, setOfflineSession] = useState(false);`.
4. En `getSession()`, antes `.then(({ data }) => setSession(data.session))`; ahora:

   ```ts
   if (data.session === null && error !== null && isAuthRetryableFetchError(error)) {
     setOfflineSession(true);
   } else {
     setSession(data.session);
   }
   setLoading(false);
   ```

   Justificación (evidencia del design sobre `GoTrueClient.js` 2467–2535):
   `__loadSession` **solo** sale a la red si había una sesión persistida; por
   tanto "error retryable + `session: null`" ⇔ "sesión persistida que no se pudo
   refrescar por falta de red". Si el token sigue vigente, `data.session` viene
   poblada y se toma la rama de siempre (hay test para ese caso).
5. `onAuthStateChange` ignora `INITIAL_SESSION` (sin red auth-js lo emite con
   `null` y pisaría la bandera) y en el resto de eventos hace
   `setSession(nextSession); setOfflineSession(false);` → `TOKEN_REFRESHED` y
   `SIGNED_IN` reponen la sesión; `SIGNED_OUT` **sigue llevando a `/login`**.
6. **Añadido no previsto en el spec, y por qué:** un `.catch()` en `getSession()`
   que solo hace `setLoading(false)`. Antes, si la promesa se rechazaba (error
   no-`AuthError`), quien apagaba el spinner era el `INITIAL_SESSION` que ahora
   ignoramos; sin el `catch`, la app se habría quedado en "Cargando…" para
   siempre en ese camino. El `catch` **restaura exactamente** el comportamiento
   de 02 (sesión nula → `/login`) y está cubierto por un test.

### `src/components/ProtectedRoute.tsx`

Una condición: `if (session === null && !offlineSession)` → `<Navigate to="/login">`.
El orden de los guards no cambia: `ConfigError` → `LoadingScreen` → redirect →
app shell. `PublicOnly` **no se toca** (con `session === null` sigue pintando
`/login` si el usuario navega ahí a mano).

### `src/services/auth.ts`

`signOut()` llama `writeDietSnapshot(null)` **después** del intento de cierre y
**siempre** (también si la petición falla por red o si el cliente no está
configurado), porque supabase-js borra la sesión local igualmente. Para eso el
`if (supabase === null) return;` pasó a `if (supabase !== null) { … }`: la
lógica interna es idéntica, solo cambia la indentación.

### Cómo se verificó que no hay regresión de 02

- `useSession.test.tsx`: 14 tests (los 6 de 02 intactos + 8 nuevos), con los dos
  lados exigidos: error retryable → **no** expulsa; error **no** retryable,
  `SIGNED_OUT` y ausencia de sesión → `session: null`, `offlineSession: false`
  → `/login`.
- `ProtectedRoute.test.tsx`: 11 tests; "sin sesión y sin modo offline sigue
  redirigiendo a /login" es la aserción explícita del lado negativo.
- `e2e/auth.spec.ts`: **2/2 pasan** (round trip completo: redirección, login,
  recarga, `/login` autenticado y cierre de sesión). Sin regresión.
- `e2e/diet-offline.spec.ts` test 3: **pasa de verdad contra el proyecto real**;
  caduca el `expires_at` de `sb-*-auth-token`, corta la red y recarga: la app se
  queda en `/dieta` con su `<h1>`, sin rastro del formulario de login.

**Hallazgo (no es regresión; es de supabase-js):** con el token caducado y sin
red, `getSession()` tarda ~25–30 s en resolver porque auth-js reintenta el
refresh con backoff hasta `AUTO_REFRESH_TICK_DURATION_MS`. Durante ese rato la
app muestra `LoadingScreen` ("Cargando…") y **después** pinta Dieta con el
banner. El retardo ya existía antes de 12 (el spinner esperaba igual a
`getSession()`); lo que 12 cambia es el desenlace: antes terminaba en `/login`,
ahora en la pantalla con el plan guardado. Por eso el test 3 lleva
`test.setTimeout(120_000)` y espera el `<h1>` hasta 60 s. Queda anotado como
posible mejora futura, fuera del alcance de 12.

## 5. Trazabilidad R → test

| R | Test que lo cubre |
|---|---|
| R1 | `dietCache.test.ts` › "sin clave devuelve null" + round-trip (`{v, plan, savedAt}` ISO) |
| R2 | `dietCache.test.ts` › JSON inválido / `v: 2` / `savedAt` no string / `plan.id` no string / plan no objeto / hija no array / `getItem` que lanza / getter que lanza |
| R3 | `dietCache.test.ts` › "guarda { v, plan, savedAt } y lo devuelve igual…" (`toEqual`) |
| R4 | `dietCache.test.ts` › "writeDietSnapshot(null) borra la clave" + `useDietPlan.test.tsx` › "sin plan activo…" y "si la red dice que ya no hay plan…" |
| R5 | `dietCache.test.ts` › `setItem`/`removeItem` que lanzan, `localStorage` ausente, getter hostil |
| R6 | `useDietPlan.test.tsx` › "el primer render ya muestra el snapshot sin pasar por loading" (una sola llamada al service) |
| R7 | `useDietPlan.test.tsx` › "arranca en loading y entrega el plan al resolver…" |
| R8 | `useDietPlan.test.tsx` › "la respuesta OK reemplaza el snapshot mostrado y el persistido" + "si la red dice que ya no hay plan…" + E2E test 2 último paso (hoy skipped) |
| R9 | `useDietPlan.test.tsx` › "si la red falla, conserva el snapshot con isStale y savedAt, sin error" |
| R10 | `useDietPlan.test.tsx` › "error sin snapshot expone el mensaje…" y "retry() tras un error…" |
| R11 | `useDietPlan.test.tsx` › los 5 casos del bloque "reintento al volver la red" |
| R12 | `OfflineBanner.test.tsx` + `DietScreen.test.tsx` › "con isStale pinta el banner entre el `<h1>` y los macros…" / "sin isStale no existe…" |
| R13 | `dietCache.test.ts` › bloque `formatSavedAt` (5 casos) + `OfflineBanner.test.tsx` › ISO inválido |
| R14 | `dietCache.test.ts` › ids de `diet_checklist_items` intactos + `DietScreen.test.tsx` › "las listas siguen siendo tachables mostrando el snapshot" |
| R15 | `git diff` de `vite.config.ts` (sin cambios) + `e2e/pwa.spec.ts` R5 verde + `e2e/diet-offline.spec.ts` test 1 (ninguna entrada `/rest/` en el precache) |
| R16 | `e2e/diet-offline.spec.ts` test 1 (**pasa**) + inspección de `dist/sw.js` |
| R17 | `git diff --stat` (sin `services/diet.ts`, `supabase/`, `.env.example`, `package.json`) |
| R18 | `useSession.test.tsx` › bloque "sesión sin red" (6 casos) + E2E test 3 (**pasa**) |
| R19 | `ProtectedRoute.test.tsx` › bloque "sesión sin red" (offline renderiza / no offline redirige) + E2E test 3 |
| R20 | `useSession.test.tsx` › `TOKEN_REFRESHED` y `SIGNED_OUT` |
| R21 | `services/auth.test.ts` › bloque "limpieza del snapshot de dieta" (4 casos) |
| R22 | 725 tests de las suites 02–12 en verde; `grep` sin `supabase.from` fuera de `services/`; `git diff --stat` limitado a los archivos permitidos; textos nuevos en español |

## 6. Verificación

**`./init.sh` (full: install → typecheck → lint → test+coverage → build),
3 corridas completas seguidas, las 3 verdes:**

| Corrida | Resultado |
|---|---|
| 1 | 48 archivos / 723 tests · líneas 98.45 % · build OK (precache 16 entradas, 656.12 KiB) |
| 2 | 48 archivos / **725** tests · líneas 98.69 % · build OK |
| 3 | 48 archivos / **725** tests · líneas 98.69 % · build OK |

(La corrida 1 fue antes de añadir los dos tests de borde que subieron
`dietCache.ts` y `useSession.tsx` al 100 % de líneas; de ahí 723 → 725.)

**Cobertura de los módulos tocados (corridas 2 y 3):** `src/lib/dietCache.ts`
**100 %** líneas (objetivo ≥ 90 %); `src/hooks/useDietPlan.ts` **100 %**,
`src/components/OfflineBanner.tsx` **100 %**, `src/screens/DietScreen.tsx`
**100 %**, `src/hooks/useSession.tsx` **100 %**,
`src/components/ProtectedRoute.tsx` **100 %**, `src/services/auth.ts` **100 %**
(objetivo ≥ 80 %). Umbral global del repo intacto (80 %; real 98.69 %).

**E2E (Playwright contra `pnpm preview`, build de producción):**

| Spec | Resultado |
|---|---|
| `diet-offline.spec.ts` test 1 (precache del chunk) | **PASA** — entrada `/assets/DietScreen-NWF2QDOd.js` en `workbox-precache`; ninguna `/rest/` |
| `diet-offline.spec.ts` test 2 (criterio 7 completo) | **SE SALTA** con mensaje: *"/dieta resolvió en estado de error (las tablas diet_* de 09 aún no están aplicadas en el proyecto en vivo) — el criterio 7 necesita un plan de dieta activo"*. **Nunca se ha ejecutado de verdad.** |
| `diet-offline.spec.ts` test 3 (token caducado sin red) | **PASA** (28.8 s) contra el proyecto real |
| `auth.spec.ts` | 2/2 **PASAN** (sin regresión del cambio de auth) |
| `smoke.spec.ts` | **PASA** |
| `pwa.spec.ts` | 3/3 **PASAN**, incluido R5 "/rest/ nunca se cachea" |
| `diet.spec.ts` | 2/2 **PASAN** |
| `diet-checklists.spec.ts` | 2 **se saltan** (mismo motivo: 09 sin aplicar), igual que antes de 12 |
| `exercise.spec.ts`, `units.spec.ts` | **PASAN** |
| `logging.spec.ts`, `history.spec.ts` | **FALLAN igual que antes** — bug preexistente `13_fix_lb_prefill_validation` (peso en lb no múltiplo de 0.5 kg: "Guardar serie" no inserta). Ajeno a 12; no se tocó. |
| `today.spec.ts` | **FALLA igual que antes** — roza el timeout de 30 s. Ajeno a 12; no se tocó. |

**Otros datos pedidos por `tasks.md`:**

- **Nombre real del chunk precacheado:** `assets/DietScreen-NWF2QDOd.js`; encaja
  con el patrón `/\/assets\/DietScreen-[\w-]+\.js$/` del E2E, así que no hubo
  que ajustar nada ni tocar `vite.config.ts`.
- **Tamaño del snapshot:** con el fixture de test (1 comida, 2 renglones, 1
  suplemento, 1 sección) el JSON ocupa **1 154 bytes**. El del plan real no se
  puede medir hasta que 09 esté aplicado; como referencia, todo el texto del
  requirement de dieta son 12.7 kB, así que el orden esperado es ~10–30 kB, muy
  por debajo de cualquier cuota de `localStorage`.

## 7. Desviaciones del spec (menores, ninguna de alcance)

1. **Posición del banner.** El design dice "debajo del `<h1>` y encima de
   `MacroSummary`". Está debajo del `<h1>` y encima de **todo** `renderBody()`,
   así que entre el banner y `MacroSummary` queda el `<p>` con el nombre del
   plan (que vive dentro de `renderBody`). Cumple el texto literal de R12
   (`<h1>` → banner → macros, verificado con `compareDocumentPosition`) y
   además hace que el banner sirva también en los estados de carga/vacío/error.
2. **`.catch()` en `getSession()`** (§4.6): añadido no previsto por el spec para
   no introducir un "Cargando…" eterno al ignorar `INITIAL_SESSION`. Preserva el
   comportamiento de 02 y tiene test.
3. **`signOut` reordenado** para que el borrado del snapshot ocurra siempre
   (también con `supabase === null` o con la petición fallida). El spec solo
   pedía "tras `supabase.auth.signOut()`".
4. **Timeouts del E2E test 3:** `test.setTimeout(120_000)` y espera de 60 s por
   el `<h1>`, por el backoff de ~30 s de auth-js descrito en §4. Sin eso el test
   fallaba por el límite de 30 s de Playwright, no por la app.
5. **E2E test 2:** el design pedía `test.skip` si no hay plan; se implementó
   también para el estado de error (09 sin aplicar), con mensaje distinto, igual
   que hizo 11. El bloque de tachado se ejecuta solo si el plan trae lista de
   súper (se anota si no).

## 8. Pendientes cuando 09 esté aplicado en vivo

1. **Correr de verdad `e2e/diet-offline.spec.ts` test 2** (criterio 7 completo):
   hoy se salta y **nunca se ha ejecutado**. Requiere las migraciones
   `003_diet_schema.sql` / `004_diet_rls.sql` aplicadas y un plan de dieta
   `active` subido por el repo `Gym`. Con eso también vuelven a la vida los dos
   tests de `e2e/diet-checklists.spec.ts` y el camino "plan activo" de
   `e2e/diet.spec.ts`.
2. **Checklist manual en el iPhone (no automatizable; criterio 7 de
   client_requirement_dieta §8):**
   - Abrir Dieta con red → activar modo avión → cerrar y reabrir la app
     instalada → el plan completo aparece con el banner "Sin conexión · plan
     guardado el …".
   - Tachar renglones de la lista de súper sin red → salir y volver a entrar →
     siguen tachados; "Desmarcar todo" limpia.
   - Salir del modo avión → reabrir Dieta (o esperar al evento `online`) → el
     banner desaparece y el plan se actualiza.
   - Repetir **con la app cerrada más de 1 h** (token caducado) para ejercitar
     el camino del open item A: debe quedarse en Dieta, no rebotar a `/login`
     (tolerando hasta ~30 s de "Cargando…" mientras auth-js se rinde).
   - Medir el tamaño real del snapshot
     (`localStorage["gym:diet:snapshot"].length`).
3. **Ajeno a 12, pendiente del humano:** `13_fix_lb_prefill_validation` (bug
   kg/lb) y el timeout de `e2e/today.spec.ts`. No se tocó nada de ellos.

## 9. Menores del review (2026-09-11, tras el APPROVE)

| # | Menor | Acción |
|---|---|---|
| 1 | **"Cerrar sesión" sin red y con token caducado no cierra nada** (`GoTrueClient._signOut` devuelve el `sessionError` **antes** de `_removeSession()`, así que ni borra la sesión persistida ni emite `SIGNED_OUT`; con `offlineSession` el guard tampoco rebota) | **APLICADO** (ver abajo). Es un fallo de privacidad en un dispositivo compartido y cabe entero dentro del archivo que 12 ya tenía permitido tocar (`services/auth.ts#signOut`). |
| 2 | `signOut` borra `gym:diet:snapshot` pero no `gym:diet:check:*` | **No aplicado.** El tachado pertenece a 11 y limpiarlo exige exportar una función nueva en `lib/checklist.ts`, archivo fuera de la superficie que R22 autoriza a 12; sin plan no se renderiza nada, así que el impacto es nulo. Queda como decisión del humano en `progress/current.md`. |
| 3 | Dejar escrito que `offlineSession` significa "no se pudo refrescar por infraestructura" (sin red **o** 5xx), no solo modo avión | **APLICADO**: JSDoc de `offlineSession` en `src/hooks/useSession.tsx` reescrito con esa precisión (incluye que un 4xx de credenciales sí lleva a `/login`). Solo documentación. |
| 4 | Desviaciones ya documentadas (posición del banner, `signOut` reordenado, timeouts del E2E 3) | **Nada que hacer**: el reviewer las declara inocuas; siguen en §7. |

### Detalle del menor 1 — cierre de sesión honesto sin red

**Evidencia** (`@supabase/auth-js@2.110.7`, `dist/module/GoTrueClient.js`,
`_signOut`): `const { data, error: sessionError } = result; if (sessionError &&
!isAuthSessionMissingError(sessionError)) { return this._returnResult({ error:
sessionError }); }` → con el token caducado y sin red, `getSession()` aporta un
`AuthRetryableFetchError` y la función **sale antes** de `removeCurrentSession()`.
La sesión sigue en `localStorage` y nadie emite `SIGNED_OUT`.

**Arreglo (solo en `src/services/auth.ts#signOut`, sin tocar 02_auth ni
`AppHeader`):** si la primera llamada no cierra (devuelve error o lanza), el
service purga la clave `sb-*-auth-token` del dispositivo con
`purgePersistedSession()` (best-effort, nunca lanza, patrón de `lib/units.ts`;
solo borra claves que casan `/^sb-.+-auth-token$/`) y **repite**
`supabase.auth.signOut()`. El segundo intento ya no encuentra sesión
almacenada, por lo que **no sale a la red** (`__loadSession` devuelve
`{session: null, error: null}` sin fetch) y termina en `_removeSession()`, que
emite `SIGNED_OUT` **incondicionalmente** → `useSession` fija `session: null` y
`offlineSession: false` → `ProtectedRoute` redirige a `/login`. El snapshot de
dieta ya se borraba (R21).

Por qué es seguro: en el camino normal (con red) `error === null` y **no se
ejecuta nada nuevo** (test que lo afirma: una sola llamada y la clave intacta);
la purga solo puede quitar sesiones de supabase, nunca `gym:*`; y el desenlace
es fail-closed (sin sesión → `/login`), nunca al revés.

**Tests de ambos lados** (`src/services/auth.test.ts`, bloque "cierre local
aunque no haya red"): con red cierra a la primera sin purgar · sin red (error)
purga y repite · si la llamada lanza, también · no toca `gym:unit:*` ni
`gym:diet:check:*` · si el segundo intento también falla no propaga ·
`localStorage` hostil o ausente no propaga. Más el E2E real
`e2e/auth.spec.ts` (round trip con logout) **2/2 verde**.

### Verificación tras los menores

- `./init.sh` full **verde** (4.ª corrida completa de la feature): 48 archivos /
  **732 tests**, líneas 98.72 % global, `src/services/auth.ts` de nuevo al
  **100 %** de líneas, build OK.
- E2E `auth` (2/2), `smoke` (1/1) y `diet-offline` (test 1 y 3 **pasan**, test 2
  sigue saltándose por 09) **verdes**; `logging`/`history`/`today` siguen igual
  de rojos por los motivos ajenos ya documentados.
