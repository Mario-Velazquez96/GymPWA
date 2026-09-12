# Review — 14_ui_redesign_cyclorama

**Reviewer:** harness `reviewer` · **Fecha:** 2026-09-12
**Feature:** `14_ui_redesign_cyclorama` (`in_progress`) — rediseño visual completo,
solo presentación, implementado en tres pasadas (inicial + 2 rondas dirigidas por
`impeccable-finish-reviewer`, cerrado con disposición `ship`).
**Spec validado:** `specs/14_ui_redesign_cyclorama/requirements.md` **enmendado**
(decisiones A, B, C-1, D, E + **Enmienda 1**, que reescribe R9/R10 y autoriza dos
asserts de `TodayScreen.test.tsx`).

## Veredicto

# APPROVE — 0 hallazgos bloqueantes

El leader puede marcar la feature como `done` en `feature_list.json`.

No he juzgado la estética: eso ya tiene veredicto propio
(`.impeccable/critique/finish-review-14.md`, `verdict pass 2` → `disposition: ship`).
Lo que sigue es trazabilidad, tareas, puertas, alcance, seguridad y convenciones,
verificado por mí sobre el árbol de trabajo, no sobre el reporte.

---

## 1. Puertas de calidad (corridas por mí, números reales)

| Puerta | Comando | Resultado medido | Declarado en el reporte | OK |
|---|---|---|---|---|
| Typecheck | `pnpm typecheck` (`tsc --noEmit`) | **exit 0**, 0 errores | 0 errores | sí |
| Lint | `pnpm lint` (`eslint .`) | **exit 0**, 0 errores/warnings | 0 errores | sí |
| Tests | `pnpm test` (`vitest run --coverage`) | **50 archivos, 868/868 passed**, exit 0 | 50 / 868 / 868 | sí |
| Cobertura | ídem | **98.8 % stmts · 93.63 % branches · 100 % funcs · 98.75 % lines** | idénticos | sí |
| Umbral | `vite.config.ts` thresholds 80 en las cuatro métricas; `docs/verification.md` §3 (≥ 80 % lines) | todos ≥ 93.63 % → **muy por encima de 80** | ídem | sí |
| Build | `pnpm build` | **exit 0**, 361 módulos, built in 494 ms | OK | sí |
| Tamaño CSS | `dist/assets/index-DdQkYXEr.css` | **32 711 B** (gzip 6.86 kB) vs. referencia 29 309 B → **1.116×** (límite R30: ≤ 2×) | 32 711 B, 1.12× | sí |
| Tipos de artefacto en `dist/` | `find dist -type f` | **css 1 · html 1 · js 5 · png 4 · svg 1 · webmanifest 1** — ningún tipo nuevo (R30) | idénticos | sí |
| Precache | salida de `vite-plugin-pwa` | **16 entradas (672.18 KiB)** | 16 / 672.18 KiB | sí |

**E2E:** no corrido, por instrucción explícita (requiere credenciales en vivo; dos
fallos preexistentes y ajenos ya documentados: timeout de `e2e/today.spec.ts` y el
defecto del helper `readDietContent` en `e2e/diet-offline.spec.ts`). Queda como
**punto abierto para el leader**, no como hallazgo de esta feature.

### PWA (R28 y regla de caché)

- `dist/manifest.webmanifest`: theme_color y background_color en `#050505`, íconos
  192 / 512 / 512-maskable intactos, `lang: "es"`, `display: "standalone"`.
- `index.html`: `<meta name="theme-color" content="#050505" />` (antes `#0f172a`).
- Service worker emitido (`dist/sw.js` + `dist/workbox-*.js`). Única regla
  `runtimeCaching`: hostname `*.supabase.co` **y** pathname que empieza por
  `/storage/` → CacheFirst solo para media de Storage; `/rest/` y `/auth/` no
  coinciden con ninguna regla → siempre red. El diff de `vite.config.ts` **no toca**
  `globPatterns`, `navigateFallback`, `includeAssets` ni `icons`: solo los dos
  colores y un reflow de Prettier semánticamente idéntico en el `urlPattern`.

---

## 2. Alcance — la comprobación central

`git diff --stat` sobre `src/services`, `src/hooks`, `src/lib`, `src/App.tsx`,
`src/main.tsx`, `supabase/`, `e2e/helpers.ts`, `package.json`, `pnpm-lock.yaml` y
`.env.example` → **salida vacía**. Ninguno de esos caminos cambió.

- **Dependencias:** `package.json` y `pnpm-lock.yaml` sin diff. Además
  `src/theme.test.ts` fija la lista exacta (6 dependencies, 24 devDependencies) y
  falla si entra una nueva. Verificado a mano contra `package.json`: coincide.
- **Env vars:** `.env.example` sin diff. El único consumo en la app sigue siendo
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.ts:10-11`).
  `CAPTURE` es un flag **de Playwright**, no una variable de la app, y no pertenece
  a `.env.example`.
- **Webfonts:** `src/index.css` sin `@font-face`, sin `@import url(`, sin `--font-*`
  (afirmado por `theme.test.ts` y verificado leyendo el archivo). `index.html` solo
  cambió la línea de `theme-color`: ningún link a fuentes. En `dist/` no hay
  ficheros de fuente.
- **Rutas y tablas:** sin cambios (`src/App.tsx`, `supabase/` intactos).

---

## 3. Seguridad y RLS

- **Única ruta de escritura a Supabase:** `src/services/logs.ts#logSet` →
  `.from("workout_logs").insert({ ...input, user_id: userId })`. Barrido de
  `.insert(` / `.update(` / `.upsert(` / `.delete(` sobre todo `src/` (excluyendo
  tests): solo esa línea; las otras dos coincidencias son `Set.prototype.delete` en
  `useChecklist.ts:53` y `useWorkoutLog.ts:159`. **Ninguna escritura nueva.**
- **Sin cambio de esquema** (`supabase/` sin diff) → **no se requiere migración**.
  El contrato con el repo `Gym` (IDs "0001"–"1324", esquema de
  `solution_design.md` §3) queda intacto: ningún servicio ni tipo se tocó.
- **Service key:** barrido de `service_role` / `service key` / `SUPABASE_SERVICE`
  sobre `src/`, `e2e/`, `index.html`, `vite.config.ts` y `.env.example` → **0
  coincidencias**. Barrido de JWT, `sb_secret` y contraseñas embebidas sobre
  **todos los archivos untracked nuevos** (131) → **0 coincidencias**.
- **`e2e/review-capture.spec.ts`** (R33): siete de las ocho capturas son de solo
  lectura. La octava escribe **una** serie por la UI (es decir, por `logSet`, la
  ruta normal) y la limpia con el patrón ID-preciso de `e2e/helpers.ts`:
  `snapshotLogs` → guardar → `deleteCreatedLogs` en `afterEach`, que borra
  exclusivamente por `id=in.(…)`, nunca por filtro de ejercicio o fecha, con el
  tope de seguridad `MAX_ROWS_PER_SPEC` y ejecución garantizada aunque el test
  falle. `e2e/helpers.ts` **no fue modificado**. El spec entero va tras
  `test.skip(!CAPTURE)` y `test.skip(MISSING_CREDENTIALS)`.

---

## 4. Asserts reescritos

`git diff -U0` sobre los `*.test.tsx`, revisando **todas** las líneas eliminadas:

- **`ExerciseMedia.test.tsx`:** el assert de `bg-slate-800` pasó a `bg-blackout`
  (línea 64 hoy). **Único assert heredado reescrito**, autorizado por R13 / R31 y
  la tarea 8.
- **Resto de eliminaciones:** exclusivamente reflow de Prettier (imports ampliados,
  firma de `makeExercise`, arrays de datos, `waitFor(...)` colapsado a una línea).
  Verifiqué una por una que el contenido reaparece idéntico: por ejemplo los dos
  `toHaveBeenLastCalledWith("plan-1", …)` siguen vivos en `TodayScreen.test.tsx:211`
  y `:225`. **Ningún assert perdido ni debilitado.**
- **Los dos de la Enmienda 1** no aparecen como eliminaciones porque toda la feature
  está sin commitear; verifiqué su texto actual: `TodayScreen.test.tsx:289` afirma
  ahora `text-xs`, `font-bold`, `uppercase`, `tracking-plot`; `:325` afirma
  `text-[22px]`, `font-bold`, `text-day` más la comprobación de que el `<h2>` vive
  dentro de `bg-horizon min-h-24`. Exactamente lo que autoriza la Enmienda 1.
- **Tests propios del implementer actualizados en la ronda 2 (no heredados):**
  `ExerciseCard.test.tsx` › "fix 3" pasó de `opacity-60` a **`opacity-75`**
  (regresión R2 del `verdict pass 1`) y › "fix 1" de `line-clamp-2` a
  **`line-clamp-3`**. Ambos son tests que el propio implementer añadió en la ronda 1
  y ambos remedios los nombra literalmente el finish-reviewer. **No es un hallazgo**
  (ver menor M3).

**Preservación de accesibilidad (R29 / R31):** conté los atributos en los `.tsx` de
producción contra `HEAD` — `aria-label` 20→20, `role=` 20→20, `aria-pressed` 2→2,
`aria-checked` 2→2, `aria-current` 1→1, `aria-live` 2→2, `aria-labelledby` 5→5,
`data-testid` 1→1. **Nada se perdió.**

---

## 5. Trazabilidad R → test (muestreo real contra los archivos)

Comprobé la tabla del reporte abriendo los tests, no dándola por buena. Cada R7–R28
tiene un `describe` propio nombrado "— 14 ciclorama (Rn)" y los asserts son
sustantivos, no decorativos.

| R | Evidencia verificada por mí |
|---|---|
| R1, R2, R3, R4, R6 (parcial), R28, R30 | `src/theme.test.ts` — leído entero: 8 tokens con su hex, `--background-image-horizon`, `--tracking-plot: 0.08em`, `--sweep-duration: 200ms`, `--ease-sweep`; un solo `@theme`; `color-scheme: dark`, `::selection`, `caret-color`, `:focus-visible` 2 px; las 4 `@utility`; `background-size: 100% 200%` + transición de `background-position` + `@media (prefers-reduced-motion: reduce)` con `transition: none`; sin `@keyframes`; **recorre los 33 `.tsx` de producción** y prohíbe paleta Tailwind, hex, `style={{`, `rounded-lg+`, `shadow-`, `backdrop-`, gradientes y `bg-clip-text`; `#050505` en `index.html` y `vite.config.ts` y ausencia de `#0f172a`; lista exacta de dependencias |
| R5 | `TodayScreen.test.tsx:292` (`tracking-plot uppercase tabular-nums text-xs`), `ExerciseCard.test.tsx` (kicker `tracking-plot tabular-nums`; "S × R" `tabular-nums text-lg font-bold ml-auto`), más `MacroSummary` / `SessionCard` / `Stepper` |
| R7 | `AppHeader.test.tsx:34` |
| R8 | `BottomNav.test.tsx:106` |
| **R9 (enmendado)** | `TodayScreen.test.tsx:278` — el `<h1>Hoy</h1>` lleva `text-xs font-bold uppercase tracking-plot` dentro de `section.bg-horizon.min-h-24`, y la fecha va **después** del `<h1>` en el DOM; `:297` flechas `border-2 border-day min-h-11 min-w-11 rounded-sm disabled:bg-blackout` y `nav` con `aria-label` "Navegación de días"; `:456` al navegar, la banda **cambia de título** en vez de repetir "Hoy" |
| **R10 (enmendado)** | `TodayScreen.test.tsx:313` — `<h2>` con `text-[22px] font-bold text-day` **dentro** de la banda, la lista con `divide-y divide-blackout`, kickers "01" y "02"; `:403` un único `<h2>` y sin `border-blackout`; `:424` descanso sin franja huérfana; `:437` sin plan y día sin rutina tampoco inventan título. Código concordante en `TodayScreen.tsx:107-155` |
| R11 (C-1) | `ExerciseCard.test.tsx` — `data-phase` night/dawn/day con `horizon-edge-l` y `dawn-sweep dawn-sweep-day`; `TodayScreen.test.tsx:331` afirma que **todas** las cards van `data-phase="night"` (C-1: ninguna consulta nueva) |
| R12 | `TodayScreen.test.tsx:336/348/360`, `ExerciseScreen.test.tsx:329`, `HistoryScreen.test.tsx:293`, `DietScreen.test.tsx:689`, `LoggingSection.test.tsx:618`, `LoadingScreen.test.tsx` — `role="status"` con `animate-pulse motion-reduce:animate-none text-day/60`, `role="alert"` con `text-cue-fault font-semibold`, Reintentar `bg-horizon min-h-11`, vacíos `text-day/90 text-center py-10` |
| R13 | `ExerciseMedia.test.tsx:64` (`bg-blackout`), `ExerciseScreen.test.tsx:289`, `HistoryScreen.test.tsx:278` |
| R14 | `ExerciseScreen.test.tsx:303` — "4 × 8-12" en `text-3xl font-extrabold tabular-nums`, descanso `text-day/60`, chip `rounded-sm border border-day/40` con un `not.toHaveClass("rounded-full")`, notas `border-2 border-dawn-rose`, "Ver historial" `border-2 border-day w-full min-h-11`, atribución `underline min-h-11`. *(ver menor M1)* |
| R15 | `LoggingSection.test.tsx:551/618`, `UnitToggle.test.tsx:70` |
| R16, R17 | `SetRow.test.tsx:235` (4 estados con `data-status`, `data-active`, `dawn-sweep-day`, `border-cue-fault` y "Anterior" intacto), `LoggingSection.test.tsx:556` (al guardar amanece y el filo avanza) y `:593` (montadas como saved ya son día, sin animación) |
| R18 | `Stepper.test.tsx:164` |
| R19 | `SessionCard.test.tsx:90` (latest en `bg-day` con `horizon-edge-l` y `data-latest`; sin latest, `day-wash`), `HistoryScreen.test.tsx:256` (solo la primera lleva `latest`) |
| R20 | `DietScreen.test.tsx:674`, `OfflineBanner.test.tsx:32` |
| R21 | `MacroSummary.test.tsx:60` |
| R22 (decisión B) | `EatingWindow.test.tsx:134` — `data-phase` en los 4 `kind` con sus clases y textos intactos |
| R23 | `MealCard.test.tsx:97`, `SupplementList.test.tsx:99` |
| R24 | `CollapsibleSection.test.tsx:65`, `Markdown.test.tsx:57` |
| R25 | `Checklist.test.tsx:193`, `ChecklistItem.test.tsx:100` (al marcar, `dawn-sweep-day`, caja de día y `line-through` en el **último** span) |
| R26 | `LoginScreen.test.tsx:104` |
| R27 | `ConfigError.test.tsx:24`, `LoadingScreen.test.tsx:5`; `ProtectedRoute` y `PublicOnly` sin diff (confirmado) |
| R28 | `theme.test.ts` › "manifest y theme-color" y `e2e/pwa.spec.ts` (+2 asserts de `#050505`, diff revisado) |
| R29 | Sin test automático **por diseño del propio spec** (§Verification: tabla de contraste más revisión manual registrada). Evidencia: 14 pares medidos en el progress file y el `verdict pass 2` punto A (kicker 6.5:1, título 4.7:1). La parte automatizable — roles y atributos — la verifiqué con el conteo del §4 |
| R30 | `theme.test.ts` (dependencias) más mi medición: 1.116× de CSS y tipos de artefacto idénticos |
| R31 | 868/868 verdes, `git diff --stat` limpio en los caminos vedados y un solo assert heredado reescrito (todo verificado arriba) |
| R32 | Sin test automático, por diseño (§Verification → `desktop.png`). `.impeccable/review/desktop.png` existe (64 122 B) y el finish-reviewer lo puntuó |
| R33 | **Las 8 capturas existen** en `.impeccable/review/` con tamaño no trivial (8 221 a 223 258 B). Detector Impeccable: sin hallazgos |

**Conclusión de trazabilidad:** ningún requisito queda sin evidencia. R29, R32 y R33
no tienen assert de Vitest, pero es exactamente lo que el spec aprobado prescribe
para ellos (contraste medido, captura de escritorio, existencia de capturas), y las
tres tienen evidencia material que comprobé.

---

## 6. Completitud de tareas

Las 12 secciones de `tasks.md` están marcadas `[x]`. Muestreo contra el código, no
contra la casilla:

- **T0** `src/theme.test.ts` existe y hace la inspección estática del design §11 — leído entero.
- **T1** `src/index.css` reescrito con `@theme`, `@layer base` y las 4 `@utility` — leído entero; concuerda línea por línea con R1–R4.
- **T2** `TodayScreen.tsx` leído entero: banda `bg-horizon min-h-24`, flechas en `absolute` con `pointer-events`, lista con `divide-y divide-blackout`, `order={index + 1}`, **sin** `phase` (C-1), `<main>` con `pb-24` y sin `p-4`.
- **T7** `vite.config.ts` e `index.html` con `#050505` y nada más tocado en el bloque `VitePWA` — diff revisado.
- **T8** un solo assert heredado reescrito y `git diff --stat` limpio — reverificado por mí.
- **T9** puertas verdes con cobertura sobre umbral — reverificado por mí.
- **T10** las 8 capturas existen; el spec de capturas se salta sin `CAPTURE=1`.
- **T11** detector sin hallazgos.
- **T12** `progress/impl_14_ui_redesign_cyclorama.md` completo con decisiones A–E, tabla R → test, tamaños, puertas, contraste y capturas; `done` **no** marcado y no se lanzó a ningún otro agente.

---

## 7. Convenciones (`docs/conventions.md`, `docs/architecture.md`)

| Regla | Resultado |
|---|---|
| Acceso a datos solo en `services/` sobre el cliente singleton | Sin cambios en `services/`, `hooks/`, `lib/`. Ninguna pantalla o componente aprendió a consultar |
| Estados explícitos de carga, vacío y error | R12 afirmado en las 5 pantallas más `LoggingSection` y `LoadingScreen` |
| Textos en español | Copy congelado: los 868 tests localizan por `getByText` / nombre accesible y pasan; los conteos de `aria-label` no varían |
| Unidades en kg | `SetRow`, `LoggingSection`, `SessionCard` e `HistoryScreen` conservan toda la suite de 08 (kg y lb) verde, sin asserts tocados |
| Targets ≥ 44 px | `min-h-11` / `min-w-11` afirmados en flechas, back, steppers, toggle, checklist, "Agregar serie", "Ver historial", "Entrar" y nav |
| Sin `any` | Barrido de `: any`, `as any` y `<any>` sobre `src/` → **0** |
| Sin `console.log` | Barrido sobre `src/` y `e2e/` → **0** |
| Sin colores mágicos fuera de `@theme` | Barrido de hex y de clases de paleta Tailwind en los `.tsx` → **0** (además lo blinda `theme.test.ts` archivo por archivo) |
| Sin `style={}` | Barrido → **0** ocurrencias en todo `src/` |
| Sin `.only` ni tests saltados | Barrido de `it.only`, `describe.only`, `.skip` y `.todo` en `src/` → **0**; en `e2e/` solo los `test.skip` condicionales legítimos (credenciales, `CAPTURE`) |

---

## 8. Menores (no bloquean, informativos)

1. **M1 — `InstructionSteps` sin assert propio del rediseño.** La cláusula de R14
   sobre `marker:font-bold marker:text-dawn-rose` y `text-day/90` no tiene aserción
   directa: `InstructionSteps.test.tsx` solo preserva `list-decimal`. La regresión
   grave (volver a `text-slate-*`) sí la atrapa `theme.test.ts`, y el resto de R14
   está afirmado en `ExerciseScreen.test.tsx:303`, así que el riesgo real es
   cosmético. Si alguien toca ese componente, añadir un assert de dos líneas.
2. **M2 — La evidencia de R33 no queda en el repo.** `.gitignore` ignora
   `.impeccable/review/`, así que las 8 capturas viven solo en el árbol de trabajo.
   Es coherente (1 MB de PNG regenerables con `CAPTURE=1`), pero conviene que el
   leader lo sepa antes de commitear: quien clone no verá la evidencia del cierre.
3. **M3 — Cuatro asserts tocados, no tres.** Además de los dos de la Enmienda 1 y el
   `opacity-75` de la fix 3, cambió el `line-clamp-2` → `line-clamp-3` de la fix 1.
   Los dos últimos son tests que el propio implementer escribió en la ronda 1 y
   ambos remedios los nombra literalmente el `verdict pass 1`. Ningún assert
   **heredado** cambió más allá del `bg-slate-800` autorizado.
4. **M4 — Untracked fuera del catálogo declarado.** Además de lo esperado
   (`PRODUCT.md`, `specs/14_ui_redesign_cyclorama/`, `.impeccable/`,
   `src/theme.test.ts`, `src/components/LoadingScreen.test.tsx`,
   `e2e/review-capture.spec.ts`), el árbol trae `.agents/`, `.codex/`,
   `.claude/agents/impeccable-*.md` y `.claude/skills/impeccable/`. Es utillaje de
   agentes, **fuera del código de aplicación**, sin impacto en `dist/` ni en
   dependencias y sin secretos (barrido hecho). Decisión de commit del leader, no de
   esta feature.
5. **M5 — Dos fallos E2E preexistentes siguen abiertos**: el timeout de
   `e2e/today.spec.ts` y el helper `readDietContent` de `e2e/diet-offline.spec.ts`,
   que lee el `OfflineBanner` como nombre del plan. Ajenos a 14 — `e2e/helpers.ts`
   no se tocó — pero conviene abrirlos como feature o fix propio.
6. **M6 — Hueco de cobertura preexistente** en `TodayScreen.tsx` (rama `goToDay` sin
   plan) y `EatingWindow.tsx` línea 13. Muy por encima del umbral; se anota por
   higiene.

---

## 9. Resumen para el leader

Verificado por mí, no delegado al reporte: las cuatro puertas en verde con los
números que el reporte declara (868/868, cobertura 98.8 / 93.63 / 100 / 98.75 sobre
un umbral de 80, CSS 1.116×), alcance estrictamente de presentación (los diez
caminos vedados sin una sola línea de diff), cero dependencias, env vars o webfonts
nuevas, la única escritura a Supabase sigue siendo `logSet` sobre `workout_logs`,
ningún secreto en el repo, el SW sigue sin cachear la API, la accesibilidad heredada
intacta atributo por atributo, y cada requisito del spec **enmendado** con evidencia
en un test que lo afirma de verdad.

**APPROVE. 0 bloqueantes. Puede marcarse `done`.**
