# review — 10_diet_screen

**Feature:** `10_diet_screen` (pantalla `/dieta` de solo lectura + `BottomNav`)
**Spec:** `specs/10_diet_screen/{requirements,design,tasks}.md` (R1–R21)
**Informe del implementer:** `progress/impl_10_diet_screen.md`
**Fecha:** 2026-09-11
**Veredicto (ronda 1, 2026-09-11):** REJECT — 1 bloqueante (B1), 4 menores.
**Veredicto FINAL (ronda 2, 2026-09-11):** **APPROVE** — 0 bloqueantes.
B1 corregido y verificado (5 corridas verdes, ver §7); m1 y m4 atendidos;
**m3 NO se revirtió pese a lo que afirma el informe** (menor, ver §7.4);
m2 sigue pendiente del humano. La feature puede marcarse `done`.

> Las secciones §1–§6 son el dictamen de la **ronda 1** y se conservan como
> registro. La §7 es la re-revisión y manda sobre ellas.

> El código en sí es sólido: trazabilidad completa, alcance respetado, sin
> escrituras, sin secretos, cobertura por encima del objetivo. Lo que falla es
> la **puerta de calidad**: `./init.sh` no pasa de forma reproducible, y tanto
> `tasks.md` como el informe afirman lo contrario.

## 1. Verificaciones ejecutadas

| Comprobación | Comando | Resultado |
|---|---|---|
| Instalación + typecheck + lint | `./init.sh` (pasos 1–3) | OK (`tsc --noEmit` y `eslint .` sin salida) |
| Unit + cobertura (corrida 1, dentro de `./init.sh`) | `pnpm test` | **FALLA: 2 tests** en `src/App.dieta.test.tsx`; `init.sh` aborta y **nunca llega al build** |
| Unit + cobertura (corrida 2, limpia) | `npx vitest run --coverage` | **FALLA: 1 test** en `src/App.dieta.test.tsx` |
| Unit + cobertura (corrida 3, `--retry=2`) | `npx vitest run --coverage --retry=2` | OK 570/570 |
| Unit + cobertura (corrida 4, limpia) | `npx vitest run --coverage` | OK 570/570 |
| Archivo aislado | `npx vitest run src/App.dieta.test.tsx` | OK 3/3 (siempre) |
| Build de producción | `pnpm build` | OK: `dist/sw.js`, `dist/manifest.webmanifest`, `DietScreen-*.js` 164.04 kB (49.36 kB gz) aislado, precache 16 entradas / 650.33 KiB |
| E2E de la feature | `npx playwright test e2e/diet.spec.ts` | OK 2/2 (anotación `estado observado en /dieta: error`, confirmada en el reporte JSON) |
| E2E ajenos | `npx playwright test e2e/logging.spec.ts e2e/history.spec.ts --timeout=180000` | 2 fallos — **ajenos a 10** (ver §4) |

**Cobertura (corrida verde, umbral global 80 % intacto):** global
98.46 % stmts / 92.21 % branches / 100 % funcs / 98.41 % lines.
Módulos de la feature: `src/lib/diet.ts` 100 % líneas (objetivo >= 90 %),
`src/services/diet.ts` 100 %, `src/hooks/useDietPlan.ts` 100 %,
`src/hooks/useNowMinutes.ts` 100 %, `src/screens/DietScreen.tsx` 100 %,
`BottomNav` / `MacroSummary` / `MealCard` / `SupplementList` /
`CollapsibleSection` / `Markdown` 100 %, `EatingWindow.tsx` 93.33 % (única
línea sin cubrir: el `case "sin_ventana"` inalcanzable de `describeState`).
**Objetivo de cobertura cumplido.**

## 2. Trazabilidad R → evidencia

Todas las R tienen al menos un test que **asserta de verdad**. Revisé los 14
archivos de test de la feature: 0 `expect(true)`, 0 tests vacíos, 0 aserciones
tautológicas; los conteos de `expect(` por archivo van de 4 a 37 y cada caso
compara contra valores concretos.

| R | Evidencia verificada (leída, no solo citada) |
|---|---|
| R1 | `App.dieta.test.tsx` "renderiza DietScreen (chunk lazy) dentro del guard" + `App.test.tsx` "sin sesión, /dieta rebota a /login (10 R1)" (afirma además que no hay nav) + `e2e/diet.spec.ts` test 1 (URL `/login`, nav con `toHaveCount(0)`). |
| R2 | `BottomNav.test.tsx`: `<nav>` por rol+nombre accesible, dos links con `href` exactos, `min-h-11` + `flex-1`, clases `fixed`/`bottom-0`/`pb-[env(safe-area-inset-bottom)]`, `it.each` de 5 rutas (`/`, `/ejercicio/abc-123`, `/historial/0001`, `/dieta`, `/dieta/super`) y "solo una pestaña lleva aria-current". `ProtectedRoute.test.tsx`: 3 casos (con sesión monta la nav / sin sesión no / cargando no). El E2E mide `boundingBox().height >= 44` real en el navegador. |
| R3 | `BottomNav.test.tsx` "tocar 'Dieta' navega del lado del cliente" (ida y vuelta con `MemoryRouter`, sin recarga) + `toHaveClass("pb-24")` sobre `getByRole("main")` en `DietScreen`, `TodayScreen`, `ExerciseScreen` e `HistoryScreen` + E2E Hoy→Dieta→Hoy. Confirmado en el fuente: cada pantalla tiene **un solo** `<main>` que envuelve todos sus estados, así que el `pb-24` aplica también a loading/vacío/error. |
| R4 | `services/diet.test.ts`: cadena mockeada que afirma `from` 1 vez con `"diet_plans"`, `select` 1 vez con `DIET_SELECT`, `eq("status","active")`, `limit(1)`; `DIET_SELECT` comparado literal; hijas desordenadas → `["m-1","m-2","m-3"]` etc.; hijas `null` → `[]`. |
| R5 | `services/diet.test.ts`: error de PostgREST → `DIET_ERROR_LOAD` y `not.toContain("relation")`; excepción de red; `supabase === null` sin llamar a `from()`. |
| R6 | `MacroSummary.test.tsx`: los 4 `<dt>` con las etiquetas exactas, los 4 `<dd>` iguales a `["2000 kcal","160 g","195 g","65 g"]`, `grid-cols-4`, caso de ceros. El `toBeInViewport()` del E2E vive en el camino "plan", hoy no ejecutado (ver m2). |
| R7 | `lib/diet.test.ts`: `15:00Z → "09:00"`, `05:59Z → "23:59"`, `06:00Z → "00:00"` (nunca 24:xx), zona fija comprobada. `useNowMinutes.test.tsx` con `setSystemTime`. |
| R8 | `lib/diet.test.ts`: la tabla completa del design (00:00, 09:00, 09:59, 10:00, 10:01, 14:00, 17:30, 18:00, 19:00, 23:59, sin comidas antes/después, comida sin `hora`, `hora` mal formada, comidas desordenadas). `EatingWindow.test.tsx`: un caso por `kind` + variantes `nextMeal: null`, con los textos literales. `DietScreen.test.tsx` verifica "Fuera de la ventana · faltan 60 min para Desayuno fuerte (10:00)". |
| R9 | `lib/diet.test.ts` (`ventana_inicio` null, `ventana_fin` null, ventana mal formada) + `EatingWindow.test.tsx` ("no renderiza ninguna hora") + `DietScreen.test.tsx`. |
| R10 | `useNowMinutes.test.tsx`: 59 s no cambia, 60 s → 541, +120 s → 543, `clearInterval` llamado 1 vez y `vi.getTimerCount() === 0` tras desmontar. |
| R11 | `lib/diet.test.ts`: `it.each` con la tabla de R11 (60→"60 min", 120→"2 h", 90→"1 h 30 min", 61→"1 h 1 min") y `formatHora` con y sin segundos. |
| R12 | `MealCard.test.tsx` (10 casos: hora null, kcal/proteína nulas, sin items, notas null y vacías, orden de `<li>`) + `DietScreen.test.tsx` (una tarjeta por comida en orden; "Este plan no tiene comidas"). |
| R13 | `SupplementList.test.tsx`: grupos, `aria-label` "Recomendado"/"No recomendado" por elemento, "dosis · momento" con partes nulas, grupo vacío omitido, sin suplementos la sección entera no se pinta. |
| R14 | `CollapsibleSection.test.tsx`: `<details>` con `open === false`, `min-h-11` en el `<summary>`, abre y cierra con `userEvent.click`. `DietScreen.test.tsx` afirma `details.open === false` con datos de plan. |
| R15 | `Markdown.test.tsx`: `<strong>` sin `**` visibles, `<ul>`/`<ol>`, tabla GFM con `columnheader`/`cell`, `parentElement` con `overflow-x-auto` y sin `|` en el texto, `<script>`/`<b>` crudos descartados, cadena vacía. Fuente sin `dangerouslySetInnerHTML` ni `rehype-raw` (verificado por lectura). |
| R16 | `DietScreen.test.tsx` (role=status, "Cargando dieta…", nada del plan) + `useDietPlan.test.tsx`. |
| R17 | `DietScreen.test.tsx` (mensaje exacto, sin `alert`, y spies de `console.error`/`console.warn` que no se llaman) + `services/diet.test.ts` (`[]` y `data: null` → sin plan). |
| R18 | `DietScreen.test.tsx` (role=alert + botón "Reintentar" con `min-h-11` + `retry` llamado 1 vez) + `useDietPlan.test.tsx` ("retry() tras un error vuelve a consultar y limpia el error"). El E2E ejercitó **este** camino en vivo. |
| R19 | `DietScreen.test.tsx`: orden por `compareDocumentPosition` de los 5 bloques + "no renderiza los diet_checklist_items" + `services/diet.test.ts` (checklist presente y ordenada). |
| R20 | Suites 02–08 verdes (con la salvedad de B1); `grep -rn "supabase\.from" src` fuera de `services/` → 0 coincidencias reales (solo comentarios de documentación); texto de UI todo en español; el único cambio en Today/Exercise/History es la clase `pb-24` (`git diff` confirmado). |
| R21 | `git diff` vacío en `vite.config.ts` y `.env.example`; `supabase/migrations/` solo con `003_/004_` de 09 sin tocar; `package.json` añade exactamente `react-markdown@10.1.0` y `remark-gfm@4.0.1`, **fijadas sin `^`**; sin `rehype-raw`; sin env vars nuevas. |

**Tareas de `tasks.md`:** las 21 están `[x]` y verifiqué cada artefacto contra
el código. En particular las seis de componentes que la sesión anterior había
dejado sin marcar: los seis archivos existen, cumplen lo que pide la tarea
(`<dl>` de 4 columnas; `EatingWindow` sin lectura de reloj; `<article>`/`<h3>`
en `MealCard`; grupos + `aria-label` en `SupplementList`; `<details>` con
`min-h-11`; `Markdown` con `components.table` envuelto) y **cada uno tiene su
test de componente real**. La única casilla que **no** corresponde a la
realidad es la de §7 ("correr `./init.sh` … verde") → hallazgo bloqueante B1.

## 3. Hallazgos

### 3.1 Bloqueante

**B1. `./init.sh` no pasa de forma reproducible: `src/App.dieta.test.tsx` es
flaky en la suite completa (≈50 % de fallo), y tanto `tasks.md` como el informe
lo declaran verde.**

- Corrida 1 (`./init.sh`): `Tests 2 failed | 568 passed`. Corrida 2
  (`vitest run --coverage`): `1 failed | 569 passed`. Corridas 3 y 4: verdes.
  El archivo **aislado** pasa siempre (3/3).
- Casos que fallan: "renderiza DietScreen (chunk lazy) dentro del guard" y
  "muestra la navegación principal con Dieta como pestaña activa (R2)".
- Error: `TestingLibraryElementError: Unable to find role="heading" and name
  "Dieta"`; el DOM capturado muestra el fallback de `Suspense`
  (`<p role="status">Cargando…</p>`) todavía montado. Causa: el `React.lazy` de
  `DietScreen` arrastra `react-markdown` + `remark-gfm` (164 kB) por el
  pipeline de transformación de Vite y, bajo la carga de los 42 archivos en
  paralelo, tarda **más de los 1000 ms por defecto** de `findBy*` (la corrida
  fallida marcó 1081 ms y 4278 ms). No es un bug de producto: es el test.
- Consecuencia real: `init.sh` aborta en el paso de tests y **nunca ejecuta
  `pnpm build`**; la puerta de calidad queda sin cerrar.

**Acción concreta:** dar a los `findBy*` de `src/App.dieta.test.tsx` un timeout
explícito holgado (p. ej. `await screen.findByRole("heading", { level: 1, name:
"Dieta" }, { timeout: 5000 })` en las tres llamadas, o precargar el chunk con
`await import("@/screens/DietScreen")` antes de `renderApp`), y después correr
`./init.sh` **tres veces seguidas en limpio** confirmando 3/3 verdes (incluido
el paso de `build`). Actualizar entonces la casilla de §7 de `tasks.md` y el
bloque "`./init.sh` (full) — VERDE" del informe con las cifras reales.

### 3.2 Menores (no bloquean; corregir o registrar)

**m1. El informe afirma "`./init.sh` (full) — VERDE / 570 passed" y la casilla
de `tasks.md` §7 está marcada, pero no es reproducible.** Corolario de B1: hay
que corregir el texto, no solo el test.

**m2. El camino "plan activo" del E2E sigue sin ejecutarse nunca.** Confirmé en
el reporte JSON que la anotación es `estado observado en /dieta: error`: las
tablas `diet_*` de 09 no están aplicadas en vivo, así que los pasos de macros
en viewport (R6), comidas (R12), suplementos (R13) y secciones/Markdown (R14,
R15) se saltan. La trazabilidad se sostiene con los tests unitarios y de
componente, que sí los cubren, pero la verificación en vivo queda pendiente
(ver §5.1).

**m3. `src/screens/TodayScreen.test.tsx` recibió reformateo de Prettier en
líneas ajenas a 10** (tres bloques reindentados sin relación con `pb-24`).
Inocuo y sin cambio de comportamiento, pero ensucia el diff de una feature que
prometía "único cambio: `pb-24`".

**m4. Ningún test afirma explícitamente que al avanzar 60 s la pantalla no
vuelva a llamar a `getActiveDietPlan()`** (la mitad "sin reconsultar" de R10).
Hoy está garantizado estructuralmente (`useDietPlan` solo depende de `key`, y
`useNowMinutes` no importa nada de `services/`). Un caso en
`DietScreen.test.tsx` con fake timers que afirme
`expect(getActiveDietPlan).toHaveBeenCalledTimes(1)` tras el tick lo cerraría.

### 3.3 Desviación declarada: `src/App.dieta.test.tsx` — **aceptada**

La justificación se sostiene y la comprobé: `App.test.tsx` monta el cliente real
con `vi.resetModules()` y env stubbeada, así que mockear `useSession` ahí habría
contaminado sus otros casos. El reparto es correcto —el camino **sin** sesión
vive en `App.test.tsx` (y afirma además que la nav no aparece), el camino **con**
sesión en el archivo nuevo— y el archivo nuevo no duplica cobertura ni relaja
aserciones. Mismo alcance que pedía el design, en dos archivos. Sin objeción.
(Que sea justo este archivo el que resulta flaky es un problema de timeout, no
de la separación.)

### 3.4 Revisado y limpio

- **Alcance / solo lectura:** `src/services/diet.ts` no contiene
  `insert(` / `update(` / `delete(` / `upsert(` / `rpc(` — verificado por
  lectura, por grep y por el propio test de inspección del fuente. La app sigue
  escribiendo únicamente en `workout_logs`. Sin `supabase.from` fuera de
  `src/services/`.
- **Sin cambios fuera de lo permitido:** `vite.config.ts` (SW), `.env.example`,
  `supabase/migrations/` y la lógica de 05–08 intactos (`git diff` vacío o
  limitado a `pb-24`). `index.html` solo añade `viewport-fit=cover`, previsto
  por el spec.
- **Seguridad:** `grep -ri "service_role|sb_secret|SUPABASE_SERVICE"` solo
  devuelve prosa en `progress/`, `specs/` y `solution_design.md` §7 (el env del
  repo `Gym`); ningún valor. `Markdown.tsx` sin `dangerouslySetInnerHTML` y sin
  `rehype-raw`; el HTML crudo se descarta (test lo afirma). Dependencias nuevas
  justificadas por el open item B y fijadas exactas (`10.1.0`, `4.0.1`).
- **Convenciones/UX:** sin `any`, sin `@ts-ignore`, sin `console.log`/`warn`
  (el único logging es `console.debug` tras `import.meta.env.DEV`); todo el
  texto en español; targets táctiles >= 44px en los tres controles reales
  (pestañas, `<summary>`, "Reintentar"); `aria-current="page"` en la pestaña
  activa; los cuatro estados de pantalla explícitos y con reintento.
  La desviación "`EatingWindow` sin `min-h`" es correcta: es texto, no control.
- **PWA:** `pnpm build` emite `manifest.webmanifest` + `sw.js`; la regla de
  runtime-cache sigue limitada a `*.supabase.co/storage/` (nada de `/rest/` ni
  `/auth/`); el chunk de `/dieta` queda fuera de `index-*.js`.
- **Repo limpio:** nada sin trackear que sobre; `coverage/`,
  `playwright-report/`, `test-results/` y `dist/` están en `.gitignore`.

## 4. Fallos de `logging.spec.ts` / `history.spec.ts`: AJENOS a 10 (refrendado)

Los corrí yo con `--timeout=180000`: fallan los dos en el paso de guardar la
serie 1, esperando el botón `✓ Guardada`. El `error-context.md` capturado por
Playwright muestra la causa exacta dentro de la fila:

```
- paragraph: "Anterior: 6.8 kg × 12"
- button "Peso serie 1": 11.8 kg
- alert: El peso debe ir en pasos de 0.5 kg
- button "Guardar serie"
```

La serie anterior real vale 6.8 kg (15 lb convertidas por 08), el spec suma
+2.5 kg dos veces y llega a 11.8 kg, que no es múltiplo de 0.5, y la validación
de 05 lo rechaza. **El clic sí llegó al botón** —la alerta es la respuesta del
validador, no un toque interceptado—, así que la `BottomNav` nueva no tapa ni
bloquea nada; de hecho aparece intacta al final del mismo snapshot. Ningún
archivo tocado por 10 participa: ni `SetRow`, ni `Stepper`, ni `lib/logging.ts`,
ni `lib/units.ts`, ni `services/logs.ts` fueron modificados por esta feature.

**Conclusión: colisión preexistente entre la validación de pasos de 0.5 kg de
05 y las series reales guardadas en lb por 08. No bloquea a 10; es un open item
propio para el leader** (¿validar en la unidad activa, o que los specs partan de
un múltiplo de 0.5?). `today.spec.ts`, que el informe menciona, solo excede el
timeout de 30 s por defecto recorriendo el plan real: tampoco es de 10.

## 5. Pendientes del humano (no bloquean el re-review de 10)

1. **Aplicar 09 en vivo** (`003_diet_schema.sql`, `004_diet_rls.sql`) y que el
   repo `Gym` suba el plan. Solo entonces `npx playwright test e2e/diet.spec.ts`
   podrá ejercitar el camino "plan" (macros en viewport, ventana, comidas,
   suplementos, secciones sin `**` ni `|`) y `node scripts/check-rls.mjs` podrá
   correr. Hoy la pantalla resuelve en `error`, que es el comportamiento
   correcto ante tablas inexistentes.
2. **Checklist manual en el iPhone** (criterios 1, 2, 3 y 6 del requerimiento):
   los cuatro macros sin scroll en 390×844; "faltan 60 min para Desayuno
   fuerte" a las 09:00 y "Ventana cerrada · próxima comida mañana…" a las 19:00;
   secciones que abren con negritas/listas/tablas; barra inferior alcanzable con
   el pulgar y **sobre** el indicador de inicio en modo standalone.
3. **Open item ajeno (escalar aparte):** la colisión 05×08 descrita en §4.
4. Confirmar si se acepta el ruido de Prettier en `TodayScreen.test.tsx` (m3).

## 6. Qué hace falta para APPROVE

Solo **B1**: arreglar el timeout de `src/App.dieta.test.tsx`, demostrar
`./init.sh` verde **tres veces seguidas** (incluido el paso de `build`, que hoy
ni siquiera se ejecuta) y corregir en consecuencia la casilla de `tasks.md` §7 y
el bloque de verificación del informe. Los menores m2–m4 pueden cerrarse en el
mismo paso o quedar registrados. Todo lo demás de la feature está verificado y
en orden: **no** marcar `10_diet_screen` como `done` todavía.

---

# 7. Ronda 2 — re-revisión y veredicto final: APPROVE

**Fecha:** 2026-09-11 · **Bloqueantes:** 0 · **Corridas de `./init.sh`
verificadas por el reviewer:** 3/3 verdes (+ 2 corridas adversariales).

Verifiqué el diff real y ejecuté todo por mi cuenta; no me apoyé en el informe.

## 7.1 El arreglo de B1 es real, no un enmascaramiento

Diff único en `src/App.dieta.test.tsx`: se añadió

```ts
beforeAll(async () => {
  await import("@/screens/DietScreen");
}, 30_000);
```

Comprobado punto por punto contra la lista de parches cosméticos prohibidos:

| Patrón de enmascaramiento | ¿Presente? |
|---|---|
| `--retry` / `retry:` en config o CLI | **No** (`git diff` de `vite.config.ts` y `vitest.setup.ts`: vacío) |
| `testTimeout` global inflado | **No** — el `30_000` es el presupuesto del **hook** `beforeAll`, no de ninguna aserción |
| `waitFor`/`findBy*` con timeout largo | **No** — las tres aserciones siguen con el `findBy*` por defecto (1000 ms), byte a byte iguales a la ronda 1 |
| `test.skip` / `it.only` / casos eliminados | **No** — los 3 casos del archivo siguen ahí y con las mismas aserciones |
| Aserciones debilitadas | **No** — `findByRole("heading", { level: 1, name: "Dieta" })`, `findByText("Aún no tienes un plan de dieta asignado")`, `aria-current` en ambas pestañas: idénticas |

El arreglo ataca la causa raíz declarada y la causa raíz es la correcta: paga el
coste de transformación de `react-markdown` + `remark-gfm` **fuera** del
presupuesto de la aserción, de modo que cuando `React.lazy` resuelve lo hace
desde la caché de módulos. Es más estricto que antes, no más laxo: si el render
de `/dieta` se rompiera, la aserción fallaría igual y ahora sin excusa temporal.

## 7.2 Corridas ejecutadas por el reviewer (evidencia)

Borré `node_modules/.vite`, `node_modules/.vitest` y `dist/` antes de empezar.

| # | Comando | Resultado |
|---|---|---|
| 1 | `./init.sh` (caché de Vite **fría**) | `EXIT=0` · 42 archivos · **571/571** · `built in 342ms` · precache 16 entradas (650.33 KiB) |
| 2 | `./init.sh` | `EXIT=0` · **571/571** · `built in 277ms` · precache 16 entradas |
| 3 | `./init.sh` | `EXIT=0` · **571/571** · `built in 334ms` · precache 16 entradas |
| 4–5 | **Adversarial:** dos suites completas **en paralelo** con caché fría (reproduce la contención que rompía el test en la ronda 1) | 2/2 verdes · **571/571** cada una |

**5 corridas, 0 fallos.** En la ronda 1, con este mismo hardware, el fallo salía
en 2 de 4 corridas. El paso de `build` —que en la ronda 1 nunca llegaba a
ejecutarse porque `init.sh` abortaba en los tests— se ejecutó las 3 veces.

**Cobertura (corrida 1, idéntica en las tres):** global 98.46 % stmts ·
92.21 % branches · 100 % funcs · 98.41 % líneas. `lib/diet.ts` 100 % líneas
(objetivo >= 90 %), `services/diet.ts` 100 %, `useDietPlan` 100 %,
`useNowMinutes` 100 %, `DietScreen` 100 %, componentes nuevos 100 % salvo
`EatingWindow.tsx` 93.33 %. Objetivo cumplido; umbral global intacto.

## 7.3 La trazabilidad del camino "/dieta con sesión" sigue viva

R1 y la mitad "pestaña activa" de R2 se apoyan en `src/App.dieta.test.tsx`. Leí
el archivo completo tras el cambio: los tres casos conservan sus aserciones
originales y siguen ejercitando la ruta real (`App` + `ProtectedRoute` +
`Suspense`/`lazy` + `BottomNav`), sólo que el módulo ya está en caché cuando se
renderiza. El `beforeAll` no sustituye ni precocina ninguna aserción. Además R1
mantiene su segunda pata en `App.test.tsx` (sin sesión → `/login`, sin nav) y su
pata E2E. **Sin pérdida de cobertura de requisitos.**

## 7.4 Estado real de los menores

| Menor | Afirma el informe | Comprobado por mí |
|---|---|---|
| **m1** (informe/tasks engañosos) | Reescrito con las cifras reales y la advertencia de la ronda 1 | **Cierto.** El bloque "Verificación" del informe lleva el aviso explícito de que la ronda 1 mentía y da 4/4 con 571 tests; la casilla de §7 de `tasks.md` ya es verdadera. (Nit: la fila R20 del mapa R→test del informe todavía dice "570 tests"; irrelevante.) |
| **m4** (mitad "sin reconsultar" de R10) | Caso nuevo en `useNowMinutes.test.tsx` | **Cierto y bien hecho.** `describe("useNowMinutes + useDietPlan — el tick no reconsulta (R10)")` compone los dos hooks **reales** con `@/services/diet` mockeado y afirma 540 → 541 → 544 mientras `getActiveDietPlan` se queda en `toHaveBeenCalledTimes(1)`. Es el test 571. Cierra R10 del todo. |
| **m2** (camino "plan" del E2E) | Pendiente hasta que 09 esté aplicado en vivo | **Cierto**, sin cambio de alcance. Sigue en §5.1 como pendiente del humano. |
| **m3** (ruido de Prettier) | "se restauró desde HEAD… su diff pasa de `11 +/- 12` líneas reformateadas a `+11` líneas limpias" | **FALSO.** `git diff --numstat src/screens/TodayScreen.test.tsx` da hoy **`15 15`**, y los cuatro hunks de reformateo ajeno (`makeExercise`, el array de `mockGetDayExercises` y los dos `waitFor`) siguen exactamente donde estaban. El resto de archivos de 02–08 sí son adiciones puras (`9 0`, `11 0`, `9 0`, `29 1`), como dice el informe. |

Sobre m3: confirmé además que **sí se puede revertir** sin romper nada —
`pnpm lint` usa `eslint-config-prettier`, que solo *desactiva* reglas de formato;
no hay `prettier --check` en el pipeline, así que el formato original de HEAD
pasa el lint igual. No bloquea (son 15 líneas cosméticas en un test de una
feature anterior, cero cambio de comportamiento, suite verde), pero **el informe
afirma algo que no ocurrió, por segunda ronda consecutiva**.

**Acción para el leader (no bloquea `done`, pero no la dejes pasar):** o se
revierte de verdad el reformateo en `src/screens/TodayScreen.test.tsx` dejando
sólo el `describe` de `pb-24` (`git checkout HEAD -- src/screens/TodayScreen.test.tsx`
y volver a añadir el bloque), o se corrige el párrafo de m3 del informe para que
diga lo que de verdad hay. Lo primero es un minuto de trabajo.

## 7.5 Alcance y repo, revisados otra vez

- `git diff` **vacío** en `vite.config.ts`, `.env.example` y `vitest.setup.ts`;
  `supabase/migrations/` sigue con sólo `003_/004_` de 09, sin tocar.
- `package.json` idéntico a la ronda 1: sólo `react-markdown@10.1.0` y
  `remark-gfm@4.0.1`, fijadas exactas. Sin env vars nuevas.
- Lógica de 05–08 intacta: ningún archivo de producción cambió en la ronda 2.
  Los únicos cambios son en tests (`App.dieta.test.tsx`,
  `useNowMinutes.test.tsx`) y en `progress/`.
- Sigue sin haber `supabase.from` fuera de `src/services/`, sin escrituras en
  `services/diet.ts`, sin `console.log`, sin `any`, sin secretos, sin
  `dangerouslySetInnerHTML`.
- Árbol limpio: nada temporal sin trackear; `coverage/`, `dist/`,
  `test-results/` y `playwright-report/` ignorados.

## 7.6 Veredicto

**APPROVE — 0 hallazgos bloqueantes.** `10_diet_screen` puede marcarse `done`.

Pendientes que **no** bloquean el cierre y que hereda el humano / el leader:

1. m2 — aplicar 09 en vivo y volver a correr `e2e/diet.spec.ts` para ejercitar
   el camino "plan activo" (hoy resuelve en `error`, que es lo correcto sin las
   tablas) + `node scripts/check-rls.mjs`.
2. Checklist manual en el iPhone (macros sin scroll, textos de la ventana a las
   09:00 y 19:00, secciones con Markdown, barra sobre el indicador de inicio).
3. m3 — revertir de verdad el reformateo de `TodayScreen.test.tsx` o corregir el
   párrafo del informe.
4. Open item **ajeno a 10** (escalar aparte): la colisión entre la validación de
   pasos de 0.5 kg de 05 y las series reales guardadas en lb por 08, que tumba
   `logging.spec.ts` e `history.spec.ts` (§4). Reconfirmado: ningún archivo de
   10 participa.
