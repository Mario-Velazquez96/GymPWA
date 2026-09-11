# impl — 10_diet_screen

**Feature:** pantalla `/dieta` de solo lectura + primera navegación principal
(Hoy | Dieta)
**Spec:** `specs/10_diet_screen/{requirements,design,tasks}.md` (aprobado por el
humano, con los open items A–D resueltos con la opción recomendada)
**Estado:** implementación completa, `tasks.md` con todas las tareas en `[x]`.
**No** se marca la feature como `done`.
**Ronda 2:** el reviewer rechazó la feature por un hallazgo bloqueante (B1,
suite intermitente) — corregido y verificado abajo en
[§ Corrección tras el review](#corrección-tras-el-review-b1--m1-m3-m4).

> ⚠️ **Sesión reanudada a mitad.** Una sesión anterior dejó ya escritos el
> núcleo puro (`lib/diet.ts`), el service, los dos hooks, sus tests y los seis
> componentes presentacionales (sin tests de componente). Esta sesión revisó lo
> existente contra el spec —no hizo falta corregir nada— y añadió lo que
> faltaba: los seis tests de componente, la pantalla, la ruta, la barra de
> navegación, el montaje en `ProtectedRoute`, el `pb-24` de las tres pantallas
> previas, los tests de pantalla/navegación/ruta, el E2E y esta verificación.

## Decisiones (open items A–D, resueltas por el humano)

- **A. Navegación:** `BottomNav` fija abajo con dos pestañas, "Hoy" (`/`) y
  "Dieta" (`/dieta`), montada una sola vez en `ProtectedRoute`. Historial **no**
  es pestaña (no tiene ruta sin `exerciseId`). "Hoy" queda activa en `/`,
  `/ejercicio/*` e `/historial/*`.
- **B. Markdown:** `react-markdown` + `remark-gfm`, sin `rehype-raw` y sin
  `dangerouslySetInnerHTML`; el HTML crudo del texto se descarta.
- **C. Hora:** `nowLocalHM` usa `Intl.DateTimeFormat` con zona fija
  `America/Mexico_City` y `hourCycle: "h23"`. `todayLocalISO()` (de Hoy) queda
  intacto.
- **D. `rotacion`:** en 10 se muestra como una sección colapsable más; 11 la
  reubicará bajo el meal prep.

## Archivos

### Nuevos en esta sesión

| Archivo | Qué es |
|---|---|
| `src/screens/DietScreen.tsx` | Pantalla: `useDietPlan` + `useNowMinutes`; estados carga / error+Reintentar / sin plan / plan; orden macros → ventana → Comidas → Suplementos → "Más del plan"; `<main … pb-24>` |
| `src/components/BottomNav.tsx` | `<nav aria-label="Navegación principal">` fija abajo, dos `<Link>` de ≥ 44px, `aria-current="page"`, `pb-[env(safe-area-inset-bottom)]` |
| `src/components/{MacroSummary,EatingWindow,MealCard,SupplementList,CollapsibleSection,Markdown}.test.tsx` | Tests de los seis componentes presentacionales |
| `src/components/BottomNav.test.tsx` | Estructura, pestaña activa en 5 rutas, navegación client-side |
| `src/screens/DietScreen.test.tsx` | Los cuatro estados, orden en el DOM, checklist no renderizada, consola limpia en vacío, Reintentar |
| `src/App.dieta.test.tsx` | `/dieta` **con** sesión → `DietScreen` (chunk lazy) + nav con la pestaña correcta |
| `e2e/diet.spec.ts` | E2E de solo lectura, viewport 390×844 |

### Nuevos de la sesión anterior (revisados, sin cambios)

`src/lib/diet.ts` + `diet.test.ts`, `src/services/diet.ts` + `diet.test.ts`,
`src/hooks/useDietPlan.ts` + `.test.tsx`, `src/hooks/useNowMinutes.ts` +
`.test.tsx`, `src/lib/types.test.ts` y los seis componentes
(`MacroSummary`, `EatingWindow`, `MealCard`, `SupplementList`,
`CollapsibleSection`, `Markdown`).

### Modificados

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Ruta `/dieta` con `ProtectedRoute` + `lazy`/`Suspense` (`LoadingScreen` de fallback) |
| `src/components/ProtectedRoute.tsx` | Renderiza `<BottomNav />` tras los hijos (solo con sesión) |
| `index.html` | `viewport-fit=cover` en el meta viewport (para que `env(safe-area-inset-bottom)` valga algo en standalone) |
| `src/screens/{TodayScreen,ExerciseScreen,HistoryScreen}.tsx` | **Único** cambio: `pb-24` en el `<main>` |
| `src/App.test.tsx` | + caso: sin sesión, `/dieta` → `/login` y sin nav |
| `src/components/ProtectedRoute.test.tsx` | + 3 casos: nav con sesión / ausente sin sesión / ausente mientras carga |
| `src/screens/{TodayScreen,ExerciseScreen,HistoryScreen}.test.tsx` | + aserción `pb-24` en el `<main>` |
| `src/lib/types.ts` | `DietPlanFull` (sesión anterior) |
| `package.json` / `pnpm-lock.yaml` | Solo las dos dependencias aprobadas |

### Dependencias añadidas (producción)

- `react-markdown@10.1.0`
- `remark-gfm@4.0.1`

Sin `rehype-raw`, sin `@types/*` (ambas traen tipos), sin env vars nuevas
(`.env.example` intacto), sin migraciones nuevas y sin tocar el service worker
(`vite.config.ts` intacto).

## Mapa R → test

| R | Qué exige | Test que lo cubre |
|---|---|---|
| R1 | `/dieta` protegida; sin sesión → `/login` | `src/App.dieta.test.tsx` ("renderiza DietScreen…"), `src/App.test.tsx` ("sin sesión, /dieta rebota a /login"), `e2e/diet.spec.ts` test 1 |
| R2 | `BottomNav` en toda pantalla protegida, `aria-current`, ≥ 44px, safe-area | `BottomNav.test.tsx` (estructura, `it.each` de 5 rutas, clases `fixed/bottom-0/pb-[env(...)]`), `ProtectedRoute.test.tsx` (3 casos), `e2e/diet.spec.ts` (nav visible + `boundingBox().height ≥ 44`) |
| R3 | Navegación client-side + `pb-24` en cada `<main>` | `BottomNav.test.tsx` ("tocar 'Dieta' navega…"), `DietScreen.test.tsx` ("reserva espacio… pb-24"), `TodayScreen/ExerciseScreen/HistoryScreen.test.tsx` (describe "espacio para la barra inferior"), `e2e/diet.spec.ts` (Hoy → Dieta → Hoy) |
| R4 | Una sola consulta anidada, orden por `position`, sin escrituras | `src/services/diet.test.ts` (forma de la consulta, orden, inspección del fuente) |
| R5 | Error/excepción/cliente nulo → `DIET_ERROR_LOAD` | `src/services/diet.test.ts` |
| R6 | Cuatro macros en `<dl>` con unidades, sin scroll | `MacroSummary.test.tsx` (dt/dd, `grid-cols-4`), `e2e/diet.spec.ts` (`toBeInViewport`, camino "plan") |
| R7 | Hora en `America/Mexico_City` vía `Intl` | `src/lib/diet.test.ts` (`nowLocalHM`), `useNowMinutes.test.tsx` |
| R8 | Semántica y textos de la ventana | `src/lib/diet.test.ts` (tabla completa de casos), `EatingWindow.test.tsx` (un caso por `kind` + variantes), `DietScreen.test.tsx` ("calcula el estado… con la hora del hook") |
| R9 | Sin ventana → "Este plan no tiene ventana de ayuno" | `src/lib/diet.test.ts`, `EatingWindow.test.tsx`, `DietScreen.test.tsx` |
| R10 | Recalcular cada 60 s sin reconsultar | `useNowMinutes.test.tsx` (fake timers + `clearInterval`) |
| R11 | `formatHora` / `formatMinutes` | `src/lib/diet.test.ts` |
| R12 | Comidas en orden, partes nulas omitidas, estado vacío | `MealCard.test.tsx`, `DietScreen.test.tsx` ("una tarjeta por comida…", "sin comidas…"), `e2e/diet.spec.ts` |
| R13 | Dos grupos de suplementos con etiqueta accesible | `SupplementList.test.tsx`, `DietScreen.test.tsx`, `e2e/diet.spec.ts` |
| R14 | `<details>` cerrado por defecto, `<summary>` ≥ 44px | `CollapsibleSection.test.tsx`, `DietScreen.test.tsx`, `e2e/diet.spec.ts` (abre la primera sección) |
| R15 | Markdown seguro (negritas, listas, tablas GFM, sin HTML crudo) | `Markdown.test.tsx` (incl. `<script>` descartado y tabla en `.overflow-x-auto`), `e2e/diet.spec.ts` (sin `**` ni `|`) |
| R16 | "Cargando dieta…" con `role="status"` | `DietScreen.test.tsx`, `useDietPlan.test.tsx` |
| R17 | Sin plan: mensaje + consola limpia | `DietScreen.test.tsx` (2 casos), `services/diet.test.ts` (`[]` → sin plan), `e2e/diet.spec.ts` (camino sin plan) |
| R18 | Error con `role="alert"` + "Reintentar" | `DietScreen.test.tsx` (alert, `min-h-11`, `retry` llamado), `useDietPlan.test.tsx`, `e2e/diet.spec.ts` (camino error) |
| R19 | Orden del cuerpo; checklist cargada pero no pintada | `DietScreen.test.tsx` (`compareDocumentPosition`, checklist ausente), `services/diet.test.ts` (checklist presente en el resultado) |
| R20 | Español, sin fetching en componentes, suites 02–08 verdes | Suite completa verde (570 tests); `grep` de `supabase.from` fuera de `services/`: 0 coincidencias (solo comentarios) |
| R21 | Sin env vars, sin cambios de SW, sin migraciones, solo las 2 deps | `git diff` de `vite.config.ts`, `.env.example` y `supabase/migrations/`: vacío; `package.json` solo añade `react-markdown` y `remark-gfm` |

## Verificación

### `./init.sh` (full) — **VERDE, 4/4 corridas consecutivas**

> ⚠️ Ronda 1: este bloque decía "VERDE / 570 passed" con **una** corrida. El
> reviewer demostró que no era reproducible (≈50 % de fallo por B1). Las
> cifras de abajo son las de la ronda 2, tras la corrección, con **cuatro**
> corridas completas seguidas y la caché de Vite borrada antes de la primera.

```
install → typecheck → lint → test (coverage) → build   ×4, exit=0 las cuatro
Test Files  42 passed (42)
Tests       571 passed (571)      ← 570 + el caso nuevo de R10 (m4)
build       ✓ built in ~0.3 s · precache 16 entradas (650.33 KiB)
```

Corrida adicional de la **ronda 3**, tras revertir de verdad el reformateo de
`TodayScreen.test.tsx` (m3): `./init.sh` → exit=0, 42 archivos / 571 tests,
98.46 % stmts · 98.41 % líneas, build y precache idénticos. Total acumulado:
**5 corridas completas verdes** (4 de la ronda 2 + 1 de la ronda 3), más las
3 corridas adversariales en paralelo.

Cobertura de los módulos de la feature (todos por encima del objetivo):

| Módulo | Líneas |
|---|---|
| `src/lib/diet.ts` | 100 % (objetivo ≥ 90 %) |
| `src/services/diet.ts` | 100 % |
| `src/hooks/useDietPlan.ts` | 100 % |
| `src/hooks/useNowMinutes.ts` | 100 % |
| `src/screens/DietScreen.tsx` | 100 % |
| `src/components/BottomNav.tsx`, `MacroSummary`, `MealCard`, `SupplementList`, `CollapsibleSection`, `Markdown` | 100 % |
| `src/components/EatingWindow.tsx` | 93.33 % (la única línea sin cubrir es el `case "sin_ventana"` de `describeState`, inalcanzable: sin ventana no se pinta la segunda línea) |

(Cobertura global tras la ronda 2, idéntica a la ronda 1: 98.46 % stmts ·
92.21 % branches · 100 % funcs · 98.41 % líneas; umbral global del repo
intacto.)

**Build:** el chunk de `/dieta` queda aislado por `React.lazy` —
`dist/assets/DietScreen-*.js` **164.04 kB (49.36 kB gz)**, frente a
`index-*.js` 467.62 kB (134.00 kB gz), que no creció por el renderizador de
Markdown. Precache del SW: 16 entradas, 650.33 KiB (incluye el chunk, como
anticipa 12).

### E2E (`pnpm e2e` / `./init.sh e2e`)

- **`e2e/diet.spec.ts`: 2/2 pasan.** Estado observado en `/dieta`:
  **`error`** (anotación `estado observado en /dieta: error` en el reporte).
  Es lo esperado hoy: las tablas `diet_*` de 09 **todavía no están aplicadas**
  en el proyecto Supabase en vivo, así que PostgREST responde error y la
  pantalla muestra "No se pudo cargar la dieta" + "Reintentar" (R18). El spec
  afirmó ese camino (alert con el texto exacto, botón ≥ 44px, nav visible) y,
  en cualquier estado, el guard `/dieta` → `/login` y la ida y vuelta
  Hoy → Dieta → Hoy con `aria-current` (R1, R2, R3).
- **Suite completa:** `./init.sh e2e` (timeout por defecto de 30 s) → **11
  pasan, 3 fallan**; con `--timeout=180000` → **12 pasan, 2 fallan**. Ninguno
  de los fallos lo causa esta feature:
  1. `today.spec.ts` — solo excede los 30 s por defecto al recorrer el plan
     real día por día (tarda ~35 s contra el backend real). Con más timeout
     pasa. Es latencia + longitud del plan, no la nav.
  2. `logging.spec.ts` y `history.spec.ts` — fallan en el paso de guardar:
     el DOM capturado muestra `alert: "El peso debe ir en pasos de 0.5 kg"`.
     La serie anterior real vale **6.8 kg / 9.07 kg** (son 15 lb y 20 lb
     convertidos por 08), el spec suma +2.5 kg dos veces y cae en 11.8 kg, que
     no es múltiplo de 0.5 → la validación de 05 lo rechaza. Es una colisión
     entre la validación de 05 y los datos en lb de 08, anterior a 10 y
     ajena a esta feature (10 no toca registro, unidades ni steppers).
  Los specs que sí ejercitan la navegación nueva (`auth`, `exercise`, `units`,
  `pwa`, `smoke`, `diet`) están todos verdes: la barra no tapa contenido ni
  intercepta toques.
- `node scripts/check-rls.mjs` **no** se corrió: comprueba las tablas de 09,
  que aún no existen en vivo (pertenece al cierre de 09).

### Inspección de no-regresión y de alcance

- `git diff` vacío en `vite.config.ts`, `.env.example` y
  `supabase/migrations/` (los `003_/004_` son de 09, intactos).
- `package.json`: solo `react-markdown@10.1.0` y `remark-gfm@4.0.1`.
- `grep -rn "supabase\.from" src` fuera de `src/services/`: **0** coincidencias
  reales (solo comentarios que documentan la regla).
- `grep -rn "console\.log" src e2e`: **0**. El único logging es
  `console.debug` tras `import.meta.env.DEV` en `services/diet.ts`.
- La app sigue escribiendo **únicamente** en `workout_logs`; `services/diet.ts`
  no contiene `insert(`/`update(`/`delete(`/`upsert(`/`rpc(` (verificado por
  grep y por un test de inspección del fuente).
- En las tres pantallas previas el único cambio es la clase `pb-24`.

## Corrección tras el review (B1 + m1, m3, m4)

**Veredicto recibido:** REJECT por B1 — `./init.sh` fallaba de forma
intermitente (≈50 %) en `src/App.dieta.test.tsx` y abortaba **antes** del
`build`; más cuatro menores (m1–m4). Detalle en
`progress/review_10_diet_screen.md`.

### Causa raíz del flake

`App` monta `DietScreen` con `React.lazy`, así que la **primera** vez que un
test renderiza `/dieta` es Vite quien, dentro de ese render, transforma el
árbol de `react-markdown` + `remark-gfm` (~164 kB, decenas de módulos ESM).
Ese trabajo ocurría **dentro** del plazo por defecto de `findBy*` (1000 ms):
con la suite completa corriendo en paralelo (42 archivos compitiendo por el
mismo servidor de transformación) la resolución del chunk tardaba 1–4 s, el
`findByRole("heading", { name: "Dieta" })` vencía con el fallback de
`<Suspense>` (`<p role="status">Cargando…</p>`) todavía montado, y el archivo
fallaba. Aislado pasaba siempre porque no había contención. **No era un bug de
producto ni de los mocks**: era una aserción cuyo plazo dependía del tiempo de
transformación del bundler.

Descartadas explícitamente como causa (se revisaron): `useNowMinutes` deja su
`setInterval` limpio al desmontar y `App.dieta.test.tsx` no usa fake timers;
`vi.resetModules()` solo vive en `App.test.tsx`, que corre en otro worker
aislado; los mocks de `useSession`/`lib/supabase` son deterministas y no tocan
`localStorage` ni `onAuthStateChange`; todas las esperas ya usaban `findBy*`.

### Arreglo (de raíz, sin reintentos ni `test.retry`)

`src/App.dieta.test.tsx` precarga el chunk antes de renderizar:

```tsx
beforeAll(async () => {
  await import("@/screens/DietScreen");
}, 30_000);
```

El coste de transformación se paga una vez, en un hook con presupuesto propio,
y `React.lazy` resuelve después desde la caché de módulos: el render deja de
depender del reloj. No se tocó el timeout de ninguna aserción, no se añadió
`--retry`, y los tres casos del archivo (incluido "/dieta con sesión", que es
la trazabilidad de **R1** y parte de **R2**) siguen intactos: se mantuvo la
estructura del archivo, que el reviewer ya había aceptado en §3.3.

### Menores atendidos

- **m1 (informe/tasks engañosos):** este bloque de verificación se reescribió
  con las cifras reales y la advertencia de la ronda 1; la casilla de §7 de
  `tasks.md` vuelve a ser cierta (4/4 corridas verdes, build incluido).
- **m3 (ruido de Prettier): en la ronda 2 quedó MAL y el informe lo dio por
  hecho — corregido en la ronda 3.** Lo que pasó: sí restauré el archivo desde
  HEAD, pero en el mismo comando volví a pasarle `npx prettier --write`, que
  reintrodujo exactamente los cuatro bloques de reformateo (firma de
  `makeExercise`, array de `mockGetDayExercises` y dos `waitFor` replegados).
  El diff seguía en `15 +/- 15` cuando el informe ya afirmaba `+11`. Lo detectó
  el leader al verificarlo.
  **Ronda 3:** se restauró el archivo desde HEAD y se le añadió el `describe`
  de `pb-24` **sin** volver a pasar Prettier sobre el archivo completo;
  `git diff --stat src/screens/TodayScreen.test.tsx` = **`+11`**, solo el test
  nuevo.
  **Sobre si el reformateo era obligatorio:** `npx prettier --check` sobre la
  versión de HEAD **falla** (ese archivo, ya commiteado, excede el
  `printWidth: 100` del repo), pero Prettier **no forma parte de la puerta de
  calidad**: `pnpm lint` es `eslint .` e `init.sh` corre typecheck + lint +
  test + build, sin `prettier --check`; de hecho 4 archivos ya commiteados en
  `main` (`ExerciseMedia.test.tsx`, `services/auth.test.ts`,
  `services/exercises.test.ts`, `services/plans.test.ts`) tampoco lo pasan. Así
  que revertir **no** rompe ninguna verificación y gana el diff mínimo. Nota de
  transparencia: con el mismo criterio quedan sin reformatear dos archivos
  nuevos de esta feature (`components/CollapsibleSection.tsx` y
  `services/diet.test.ts`, una línea larga cada uno); no se tocaron para no
  añadir ruido a archivos ya revisados, y no afectan a ninguna verificación.
  El resto de archivos tocados de 02–08 ya eran solo adiciones (`git diff
  --stat` verificado uno por uno).
- **m4 (mitad "sin reconsultar" de R10):** caso nuevo en
  `src/hooks/useNowMinutes.test.tsx` → describe "useNowMinutes + useDietPlan —
  el tick no reconsulta (R10)": compone los dos hooks reales con el service
  mockeado y afirma que al avanzar 60 s y 180 s el reloj pasa de 540 → 541 →
  544 mientras `getActiveDietPlan` sigue en **1 llamada**. (Se ubicó en ese
  archivo, y no en `DietScreen.test.tsx`, porque allí los dos hooks están
  mockeados y el service nunca se llamaría; además ese archivo ya tiene la
  higiene de fake timers en `beforeEach`/`afterEach`.)
- **m2 (camino "plan activo" del E2E):** sigue sin poder ejecutarse hasta que
  09 esté aplicado en vivo; queda registrado en "Pendiente de verificar" (1).
  Sin cambio de alcance.

### Evidencia de determinismo

| Verificación | Resultado |
|---|---|
| `./init.sh` ×4 seguidas (caché `node_modules/.vite` borrada antes de la 1ª) | **4/4 exit=0**, 571/571 tests y `build` ejecutado en las cuatro |
| Adversarial: 3 suites completas **en paralelo** con caché fría (reproduce la contención que rompía el test) | 3/3 verdes, 571/571 cada una |
| `npx vitest run src/App.dieta.test.tsx` aislado | 3/3 (como antes) |

### Archivos tocados en la ronda 2

- `src/App.dieta.test.tsx` — `beforeAll` de precarga del chunk lazy (arreglo
  de B1).
- `src/hooks/useNowMinutes.test.tsx` — mock de `@/services/diet` + caso nuevo
  de R10 (m4).
- `src/screens/TodayScreen.test.tsx` — revertido el reformateo ajeno (m3;
  efectivo solo en la ronda 3, ver arriba).
- `progress/impl_10_diet_screen.md` — este informe (m1).

Sin cambios de código de producción: `src/` fuera de tests, `supabase/`,
`vite.config.ts`, `.env.example` y `package.json` quedaron **idénticos** a la
ronda 1.

## Desviaciones del spec

- **`src/App.dieta.test.tsx` (archivo extra).** El design pedía que `App.test`
  cubriera `/dieta` con y sin sesión. `App.test.tsx` ejercita el cliente real
  con env stubbeada y `vi.resetModules()`, y mockear `useSession` ahí habría
  cambiado el comportamiento de sus otros casos. El camino **sin** sesión se
  añadió a `App.test.tsx`; el camino **con** sesión vive en el archivo nuevo,
  que mockea `useSession`, `lib/supabase` y los services. Mismo alcance, dos
  archivos.
- **`EatingWindow` no lleva `min-h`** (no es un control táctil, es texto);
  todos los controles reales (pestañas, `<summary>`, "Reintentar") sí miden
  ≥ 44px.
- Nada más: el resto sigue el design literalmente (consulta única, orden en el
  cliente, hora como input puro, nav montada en `ProtectedRoute`).

## Pendiente de verificar cuando 09 esté aplicado en vivo

1. **Camino "plan activo" del E2E.** Hoy `/dieta` resuelve en `error` porque no
   existen las tablas. Cuando el humano aplique `003_diet_schema.sql` y
   `004_diet_rls.sql` y el repo `Gym` suba el plan, hay que volver a correr
   `npx playwright test e2e/diet.spec.ts` y confirmar que la anotación dice
   `plan` (o `sin-plan` si aún no hay plan) y que pasan los pasos de macros
   en viewport, ventana, comidas, suplementos y secciones. El spec ya está
   escrito para ese camino; **no** se ha ejecutado contra datos reales.
2. **Checklist manual en el iPhone** (criterios 1, 2, 3 y 6 del requerimiento):
   - los cuatro macros visibles sin scroll en 390×844;
   - a las 09:00 "faltan 60 min para Desayuno fuerte" y a las 19:00 "Ventana
     cerrada · próxima comida mañana…";
   - las secciones abren y muestran negritas/listas/tablas sin asteriscos;
   - la barra inferior se alcanza con el pulgar y queda **sobre** el indicador
     de inicio en modo standalone (`viewport-fit=cover` ya está puesto).
   Nada de esto pudo comprobarse en esta sesión: requiere el plan real y el
   dispositivo.
3. **Recomendación para el leader (fuera de 10):** los fallos de
   `logging.spec.ts` / `history.spec.ts` por "El peso debe ir en pasos de
   0.5 kg" con series reales guardadas en lb merecen un open item propio
   (¿la validación de 05 debería aplicarse en la unidad activa, o los specs
   deberían partir de un valor múltiplo de 0.5?). No se tocó nada de eso aquí.
