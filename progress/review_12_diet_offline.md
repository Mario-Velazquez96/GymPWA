# review — 12_diet_offline

**Veredicto: APPROVE** (0 hallazgos bloqueantes)
Revisor: subagente reviewer. Fecha: 2026-09-11. Solo lectura: no se tocó código.

## 0. Resumen ejecutivo

- `./init.sh` full (install → typecheck → lint → test+coverage → build)
  **3 veces seguidas, las 3 verdes**: 48 archivos / **725 tests** cada vez,
  98.69 % de líneas global, build OK (precache 16 entradas, 656.12 KiB).
- Cobertura de **todos** los módulos tocados por 12: **100 % de líneas**
  (`dietCache.ts`, `useDietPlan.ts`, `OfflineBanner.tsx`, `DietScreen.tsx`,
  `useSession.tsx`, `ProtectedRoute.tsx`, `services/auth.ts`). Objetivo del
  tasks.md (≥ 90 % en dietCache, ≥ 80 % en el resto) superado.
- E2E diet-offline + auth + pwa + smoke: **8 passed, 1 skipped**. El skipped es
  el test 2 (criterio 7) y **el skip es honesto** (evidencia en §4).
- Alcance limpio: `vite.config.ts`, `public/`, manifest, `.env.example`,
  `package.json`, `pnpm-lock.yaml`, `supabase/` y `src/services/diet.ts`
  **sin tocar**; cero migraciones, cero dependencias, cero env vars, cero
  escrituras a Supabase, **ninguna regla de runtime caching para /rest/**.
- **El cambio de auth es seguro**: no abre ningún hueco de acceso (dictamen
  detallado en §3). De él sale un hallazgo **menor**, documentado en §5.

## 1. Trazabilidad R1–R22 (verificada leyendo los tests, no el informe)

| R | Evidencia verificada |
|---|---|
| R1 | `dietCache.test.ts` › "sin clave devuelve null" + round-trip que afirma `{v:1, plan, savedAt ISO}` bajo `gym:diet:snapshot` |
| R2 | `dietCache.test.ts` › JSON inválido · v:2 · savedAt no string · plan.id no string · plan no objeto/ausente · hija no array · array/número/null como raíz · getItem que lanza · getter de localStorage que lanza (9 casos) |
| R3 | `dietCache.test.ts` › round-trip `toEqual({v:1, plan, savedAt:"2026-09-10T15:15:00.000Z"})` con `now` inyectado; ids y `position` de `diet_checklist_items` intactos |
| R4 | `dietCache.test.ts` › "write(null) borra la clave" + "write(null) sin snapshot previo es inocuo"; `useDietPlan.test.tsx` › "sin plan activo… sin snapshot escrito" y "si la red dice que ya no hay plan… se borra el snapshot" |
| R5 | `dietCache.test.ts` › setItem lanza (cuota) · removeItem lanza · localStorage ausente · getter hostil — ninguno propaga |
| R6 | `useDietPlan.test.tsx` › "el primer render ya muestra el snapshot sin pasar por loading": loading:false, plan = snapshot, isStale:false y `getActiveDietPlan` llamado **1** vez |
| R7 | `useDietPlan.test.tsx` › "arranca en loading y entrega el plan al resolver" |
| R8 | `useDietPlan.test.tsx` › "la respuesta OK reemplaza el snapshot mostrado y el persistido" (+3 casos) + E2E test 2 paso final (hoy skipped) |
| R9 | `useDietPlan.test.tsx` › "si la red falla, conserva el snapshot con isStale y savedAt, sin error" (+ variante con snapshot corrupto → error) |
| R10 | `useDietPlan.test.tsx` › "error sin snapshot expone el mensaje…" y "retry() vuelve a loading, reconsulta y limpia el error" (2 llamadas al service) |
| R11 | `useDietPlan.test.tsx` › bloque "reintento al volver la red": relanza en stale → OK quita el banner · reintento fallido sigue stale · en fresh **no** relanza · removeEventListener al desmontar · listener retirado al dejar de estar stale |
| R12 | `OfflineBanner.test.tsx` (role=status, texto exacto) + `DietScreen.test.tsx` › banner entre el h1 y los macros vía compareDocumentPosition · "sin isStale no existe 'Sin conexión'" · "isStale sin savedAt no pinta banner" + E2E test 2 (skipped) |
| R13 | `dietCache.test.ts` › bloque formatSavedAt (09:15 · sin adelantar día · 24 h · sin punto · ISO inválido → null) + `OfflineBanner.test.tsx` › ISO inválido → "…en este dispositivo" |
| R14 | `dietCache.test.ts` › ids de `diet_checklist_items` intactos tras el round-trip + `DietScreen.test.tsx` › "las listas siguen siendo tachables mostrando el snapshot" (escribe `gym:diet:check:diet-1:super`) |
| R15 | `vite.config.ts` **sin diff** y mtime 2026-07-20 (anterior a 12); única regla runtimeCaching = /storage/ CacheFirst; `e2e/pwa.spec.ts` R5 "/rest/ nunca se cachea" **PASA**; E2E 12 test 1 afirma además cero entradas /rest/ en el precache |
| R16 | E2E test 1 **PASA**: `/assets/DietScreen-NWF2QDOd.js` en workbox-precache; verificado también en `dist/sw.js` tras el build |
| R17 | `src/services/diet.ts` sin insert/update/upsert/delete y mtime 2026-09-10 (previo a 12); git status + mtimes confirman que 12 solo tocó los 5 archivos permitidos + los nuevos |
| R18 | `useSession.test.tsx` › bloque "sesión sin red" (6 casos, §3) + E2E test 3 **PASA (29.4 s)** contra el proyecto real |
| R19 | `ProtectedRoute.test.tsx` › offline renderiza hijos+header+nav · **sin offline sigue redirigiendo** · offline no se salta el spinner · offline no tapa ConfigError + E2E test 3 |
| R20 | `useSession.test.tsx` › TOKEN_REFRESHED fija sesión y limpia bandera · SIGNED_OUT deja null/false · SIGNED_IN (test de 02 intacto) |
| R21 | `services/auth.test.ts` › signOut llama `writeDietSnapshot(null)` (éxito, fallo de red, cliente null) y signIn **no** lo toca |
| R22 | 725 tests de 02–12 verdes · sin `supabase.from` fuera de services/ · sin console.log en src/ ni e2e/ · sin any/@ts-ignore en los archivos de 12 · textos nuevos en español · mtimes acotan los cambios a los archivos permitidos |

**Ninguna R sin test.**

## 2. Tareas [x] — muestra amplia comprobada contra el código

| Tarea | Comprobación |
|---|---|
| 2.1 dietCache.ts | Existe con DIET_SNAPSHOT_KEY/VERSION, DietSnapshot, storage() con try/catch, isDietSnapshot, read/write, formatSavedAt, debugCache solo en DEV ✔ |
| 2.2 tests de dietCache | 24 casos; cubren todos los caminos del design ✔ |
| 3.1 hook | Máquina de fases loading / snapshot / fresh / stale / error igual al design; lectura única en el inicializador de useState; una llamada por attempt; relectura del snapshot en fallo ✔ |
| 3.2 listener online | Efecto con guarda `phase.kind !== "stale"` y removeEventListener en cleanup ✔ |
| 4.2 montaje del banner | `DietScreen.tsx:159` monta OfflineBanner bajo el h1 solo con isStale y savedAt; ningún otro cambio en la pantalla ✔ |
| 5.1–5.3 auth | Verificado línea a línea (§3) ✔ |
| 6.1 "verificar, no cambiar" | Confirmado por git diff + mtimes: no era una casilla marcada sin cumplir ✔ |
| 6.2 chunk en dist/sw.js | `assets/DietScreen-NWF2QDOd.js` presente; grep "rest/v1" en dist/sw.js = 0 ✔ |
| 7 E2E | Los 3 tests existen y afirman cosas reales (§4) ✔ |
| 8 cierre | Reproducido por mí: 3 corridas full verdes ✔ |

## 3. Dictamen sobre el cambio de auth (lo más delicado del lote)

Revisado línea a línea contra el código real de @supabase/auth-js 2.110.7
(GoTrueClient.js, lib/fetch.js), no contra el informe del implementer.

**a) ¿Sigue expulsando a /login cuando debe?**

- **signOut explícito con red:** sí. `_removeSession()` → SIGNED_OUT →
  useSession fija session:null y offlineSession:false → ProtectedRoute
  redirige. Cubierto por unit (SIGNED_OUT real) y por `e2e/auth.spec.ts`
  (round trip completo, **2/2 PASAN**).
- **Sesión ausente o nunca iniciada:** sí. `__loadSession` devuelve
  `{session:null, error:null}` **sin tocar la red** cuando no hay sesión en
  storage, y la condición de offline exige `error !== null` → setSession(null)
  → /login. Test: "sin sesión persistida termina la carga con session null".
- **Token inválido o revocado (no fallo de red):** sí. El refresh falla con
  AuthApiError (no retryable) → `_removeSession` → SIGNED_OUT, y getSession()
  devuelve `{session:null, error: AuthApiError}` → rama else → /login. Test
  explícito: "un error NO retryable no activa el modo offline".

**b) ¿La condición distingue de verdad red de credenciales?**

Sí. `isAuthRetryableFetchError` solo es cierto para AuthRetryableFetchError,
que auth-js crea **únicamente** en dos situaciones (lib/fetch.js:38,42,124):
fallo de transporte (fetch lanza) y códigos de infraestructura
500/501/502/503/504/520–530. Un rechazo de credenciales o de refresh token
(400/401/403) produce AuthApiError, que **no** es retryable. Además la rama
exige `data.session === null`, y `__loadSession` solo sale a la red si había
una sesión persistida válida: "error retryable + sesión null" equivale a
"había sesión y no se pudo refrescar por infraestructura".

**No abre ningún agujero.** offlineSession no fabrica token ni sesión: el
cliente sigue sin access token válido, así que cualquier consulta sale con la
anon key y **RLS la rechaza**; lo único visible sin red es el snapshot local
del propio dispositivo (que signOut borra, R21). El guard sigue siendo UX y la
autorización sigue siendo RLS. Efecto lateral aceptado: con Supabase caído
(5xx) la app se queda en el shell con estados de error en vez de rebotar a
/login; se autocura con TOKEN_REFRESHED o termina en SIGNED_OUT.

**c) El .catch() añadido en getSession(): correcto y necesario.**

Solo hace setLoading(false) si el componente sigue montado; **no** fija sesión
ni bandera, así que el desenlace es fail-closed (session:null,
offlineSession:false → /login), idéntico a 02. Era imprescindible: al ignorar
INITIAL_SESSION se perdió el único apagador del spinner en el camino de promesa
rechazada (habría quedado "Cargando…" eterno). No se traga ningún error con
consecuencia distinta a la de antes: getSession() no rechaza en los caminos de
credenciales (los devuelve como error), solo ante fallos inesperados (p. ej.
locks). Test: "si getSession rechaza, no deja el spinner colgado".

**d) ¿Tests de ambos lados? Sí, y son de verdad.**

- No expulsa por red: AuthRetryableFetchError → offlineSession:true ·
  INITIAL_SESSION nulo no pisa la bandera · ProtectedRoute con offlineSession
  renderiza hijos+header+nav · E2E test 3 (token caducado real + setOffline +
  route abort) **PASA**: sigue en /dieta, sin campo "Correo".
- Sí expulsa por sesión inválida: error no retryable → offlineSession:false ·
  SIGNED_OUT → null/false · "sin sesión y sin modo offline sigue redirigiendo a
  /login" · e2e/auth.spec.ts verde.

**Conclusión: el cambio de auth es seguro.** No concede acceso a datos que RLS
no conceda ya, no convierte un fallo de credenciales en permanencia dentro de
la app y conserva intacto el contrato de 02 (6 tests originales verdes + E2E).

## 4. Honestidad del E2E

Ejecutado por mí: `npx playwright test e2e/diet-offline.spec.ts e2e/auth.spec.ts
e2e/pwa.spec.ts e2e/smoke.spec.ts` → **8 passed, 1 skipped (31.8 s)**.

- **Test 1 (R16) PASA** y asserta algo real: recorre `caches.keys()` del
  workbox-precache y exige al menos una entrada `/assets/DietScreen-<hash>.js`
  y **cero** entradas /rest/.
- **Test 2 (criterio 7) SE SALTA — skip honesto.** Verificado con el reporter
  JSON: la anotación registrada es `estado observado en /dieta = "error"` y el
  motivo "/dieta resolvió en estado de error (las tablas diet_* de 09 aún no
  están aplicadas en el proyecto en vivo) — el criterio 7 necesita un plan de
  dieta activo". El test.skip es **condicional y posterior** al login y a
  waitForDiet (con 3 "Reintentar"): con plan activo el test correría entero. No
  hay skip incondicional ni aserciones vacías. **Nunca se ha ejecutado de
  verdad** (pendiente del humano, §6).
- **Test 3 (R18/R19) PASA (29.4 s)** y asserta algo real: caduca el expires_at
  del `sb-*-auth-token`, corta la red y recarga; exige URL /dieta, el h1
  "Dieta" y la ausencia del campo "Correo".
- auth.spec.ts 2/2 · pwa.spec.ts 3/3 (incluido R5) · smoke.spec.ts 1/1.

**Contexto (no bloqueante de 12; verificado que no ha empeorado):**
`e2e/today.spec.ts` reejecutado → falla exactamente igual que antes (timeout de
30 s en el bucle de "Día siguiente", tras login y render correctos: no es
regresión de auth). logging/history no se reejecutaron para no escribir en la
base en vivo sin necesidad; su fallo es el bug kg/lb de
13_fix_lb_prefill_validation, en código que 12 no toca (mtimes lo confirman) y
cuyas suites unitarias están verdes.

## 5. Hallazgos

### Bloqueantes: ninguno

### Menores (no bloquean el cierre de 12; conviene registrarlos)

1. **"Cerrar sesión" sin red y con token caducado no cierra nada** (efecto
   colateral nuevo del open item A). En ese estado `GoTrueClient._signOut`
   devuelve el sessionError **antes** de `_removeSession()`, así que no se borra
   la sesión persistida ni se emite SIGNED_OUT: con offlineSession el guard
   sigue mostrando la app y el botón parece no hacer nada. Antes de 12 ese
   estado era inalcanzable (el guard ya había redirigido). No concede acceso
   nuevo a nadie —y el snapshot de dieta **sí** se borra (R21)—, pero la
   intención de cerrar sesión se pierde en silencio. Sugerencia para una feature
   futura (no para 12): tras signOut, si sigue habiendo sesión persistida,
   limpiar la clave `sb-*-auth-token` o forzar navegación a /login.
2. **signOut borra `gym:diet:snapshot` pero no `gym:diet:check:*`** (estado de
   tachado de 11): residuo local del usuario anterior. Sin plan no se renderiza,
   así que el impacto práctico es nulo; decisión del humano si se amplía la
   limpieza (pertenece a 11).
3. **AuthRetryableFetchError también cubre 5xx/Cloudflare (500–530)**: con
   Supabase caído pero con red, la app se queda dentro mostrando estados de
   error en vez de ir a /login. Es el comportamiento deseable, pero conviene
   dejar escrito que offlineSession significa "no se pudo refrescar por
   infraestructura", no solo "modo avión".
4. Desviaciones ya documentadas por el implementer y verificadas como inocuas:
   posición del banner (sobre todo renderBody()), signOut reordenado, timeouts
   del E2E test 3.

## 6. Pendientes del humano (no bloquean el cierre de 12)

1. **Aplicar 003_diet_schema.sql / 004_diet_rls.sql en el proyecto en vivo** y
   entonces **correr de verdad el E2E test 2 (criterio 7)**, que hoy nunca se ha
   ejecutado. Con eso vuelven también e2e/diet-checklists.spec.ts y el camino
   "plan activo" de e2e/diet.spec.ts.
2. **Checklist manual en el iPhone** del criterio 7, incluida la reapertura tras
   más de 1 h (token caducado) sin rebotar a /login, y medir el tamaño real de
   `localStorage["gym:diet:snapshot"]`.
3. Decidir sobre los hallazgos menores 1 y 2 (¿feature de seguimiento?).
4. Ajenos a 12: 13_fix_lb_prefill_validation (kg/lb) y el timeout de
   e2e/today.spec.ts.

## 7. Veredicto

**APPROVE.** La feature 12_diet_offline puede marcarse `done` en
feature_list.json. El cambio en 02_auth es seguro y está cubierto por tests de
los dos lados; el snapshot local es robusto y privado; el service worker sigue
sin cachear la API de Supabase; el alcance no se ha desbordado.

---

## 8. Adenda — revisión del delta posterior al APPROVE (cierre local de sesión)

Delta revisado: `src/services/auth.ts` (nueva `purgePersistedSession` + segundo
intento de cierre), `src/services/auth.test.ts` (+7 casos) y `src/hooks/useSession.tsx`
(**solo JSDoc**, lógica idéntica a la ya aprobada: verificado con git diff).
`find` sobre src/ y e2e/ confirma que el delta **no tocó ningún otro archivo**.

**Dictamen: el delta es seguro. 0 bloqueantes nuevos.** Resuelve el menor 1 de
§5 sin abrir camino nuevo.

### 8.1 ¿El borrado está acotado a la sesión de supabase?

Sí. `SESSION_STORAGE_KEY_PATTERN = /^sb-.+-auth-token$/` está **anclada por los
dos extremos**: solo borra claves que empiezan por `sb-` y terminan
exactamente en `-auth-token`, que es el `storageKey` por defecto de
supabase-js (`sb-<project-ref>-auth-token`; `lib/supabase.ts` usa `createClient`
sin `storageKey` personalizado, así que el patrón es el correcto). **No** puede
barrer `gym:unit:*` (08), `gym:diet:check:*` (11) ni `gym:diet:snapshot` (12):
ninguna empieza por `sb-`. Hay test explícito ("no toca otras claves del
dispositivo al purgar"). Tampoco borra `sb-*-auth-token-code-verifier` ni
`-user` (no terminan en `-auth-token`), pero eso da igual: el segundo
`signOut()` llega a `_removeSession()`, que las borra él mismo
(GoTrueClient.js:4328-4330).

### 8.2 ¿Bucle o excepción posible?

No. **No hay recursión**: `signOut()` no se llama a sí misma; llama dos veces,
como máximo, a `supabase.auth.signOut()`, y el resultado del segundo intento se
ignora (no hay tercer intento). Cada llamada va en su `try/catch` y
`purgePersistedSession` envuelve **todo** el acceso a `localStorage`
(incluidos `length`/`key()`) en un `try/catch`, devolviendo `null` si el getter
no existe. Tests: segundo intento que también rechaza · `localStorage`
inexistente · `removeItem` que lanza. Los tres terminan con
`resolves.toBeUndefined()`.

Que el segundo intento **no salga a la red y sí emita `SIGNED_OUT`** está
verificado en el código de auth-js 2.110.7, no solo en la declaración del
implementer: con el storage ya purgado, `__loadSession` devuelve
`{session:null, error:null}` (línea 2481), `_signOut` no entra en la rama de
`sessionError` ni en la de `accessToken` (3368-3372) y cae en
`removeCurrentSession()` → `_removeSession()`, que termina **siempre** en
`_notifyAllSubscribers('SIGNED_OUT', null)` (4334). Ese evento es justo el que
`useSession` traduce a `session:null` + `offlineSession:false` → `/login`.

### 8.3 ¿El camino con red sigue igual? ¿Cierre espurio?

Sí, idéntico: si la primera llamada devuelve `error === null`, `closed` queda en
`true` y **no** se purga nada ni se repite el cierre (test: "con red cierra a la
primera, sin purgar nada a mano", que afirma 1 sola llamada y la clave intacta).

Cierre espurio: **no es posible**. `signOut` solo tiene un llamador
(`AppHeader`, botón "Cerrar sesión"), así que la purga únicamente ocurre cuando
el usuario ya pidió cerrar sesión y el cierre falló; borrar entonces la sesión
local es exactamente la intención del usuario, no un efecto colateral. El caso
"sesión válida + servidor 5xx" tampoco pierde nada indebido: auth-js ya había
llamado a `removeCurrentSession()` antes de devolver ese error (3380-3383), de
modo que la purga es un no-op y el segundo `SIGNED_OUT` es inocuo.
Consecuencia asumida y correcta: sin red el refresh token no se revoca en el
servidor, solo desaparece del teléfono.

### 8.4 ¿Los 7 casos nuevos cubren ambos lados?

Sí, no solo el camino feliz: lado positivo (con red cierra a la primera y **no**
purga), lado negativo (error de sesión → purga + segundo intento; llamada que
lanza → purga + segundo intento; segundo intento que también falla → no
propaga), acotación (otras claves sobreviven) y almacenamiento hostil
(`localStorage` ausente y `removeItem` que lanza). Lo único que no se puede
afirmar a nivel unitario es la emisión real de `SIGNED_OUT` (el cliente está
mockeado en esa frontera, como manda docs/verification.md); queda cubierto por
la lectura del código de auth-js (§8.2) y por `e2e/auth.spec.ts`, que hace el
round trip completo incluido el cierre de sesión.

### 8.5 ¿Interacción con `offlineSession`?

Coherente. Cerrar sesión sin red: purga → segundo cierre → `SIGNED_OUT` →
`useSession` fija `session:null` y `offlineSession:false` → `ProtectedRoute`
redirige a `/login` (ya no se queda dentro de la app, que era el menor 1). Al
volver la red no hay sesión en storage, así que `getSession()` devuelve
`{session:null, error:null}` **sin salir a la red** y la app permanece en
`/login` hasta un login normal: no hay resurrección de sesión ni bandera
`offlineSession` colgada. El snapshot de dieta se borra igual (R21).

### 8.6 Verificación del delta (ejecutada por mí)

- `./init.sh` full **2 veces, las 2 verdes**: 48 archivos / **732 tests**
  (+7 respecto al APPROVE), líneas 98.72 % global, build OK.
- `src/services/auth.ts`: **100 % de líneas** (branch 95.45 %).
- `npx playwright test e2e/auth.spec.ts e2e/smoke.spec.ts` → **3 passed (4.3 s)**:
  el round trip de sesión con red sigue intacto.

### 8.7 Menores del delta (no bloquean)

1. **Latencia del cierre sin red**: con token caducado, la primera llamada a
   `supabase.auth.signOut()` puede tardar ~25–30 s en resolver (backoff del
   refresh de auth-js, el mismo retardo medido en el E2E test 3) antes de que
   se purgue y se redirija. `AppHeader` lanza `void signOut()` sin estado
   pendiente, así que el botón no da feedback durante ese rato. Candidato a
   mejora de UX en otra feature (deshabilitar el botón / "Cerrando sesión…").
2. Si una versión futura de supabase-js fragmentara la sesión en claves
   `sb-<ref>-auth-token.0/.1`, el patrón no las alcanzaría y se volvería al
   comportamiento anterior (degradación silenciosa, nunca borrado de más).
   Conviene recordarlo al actualizar la dependencia.
3. El **menor 2** del review (signOut no limpia `gym:diet:check:*`) sigue
   abierto como decisión del humano, tal y como se acordó.

### 8.8 Veredicto del delta

**APPROVE (delta seguro, 0 bloqueantes nuevos).** Se mantiene el APPROVE global
de 12_diet_offline; el menor 1 de §5 queda resuelto y se sustituye por los
menores de §8.7.
