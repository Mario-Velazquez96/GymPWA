# impl — 14_ui_redesign_cyclorama

**Estado:** implementación completa, lista para `impeccable-finish-reviewer` →
`impeccable-documenter` → `reviewer` (los lanza el leader). **No** se marcó
`done`. Fecha: 2026-09-12.
**Spec:** `specs/14_ui_redesign_cyclorama/` (aprobado por el humano el
2026-09-12; todas las casillas de `tasks.md` marcadas).

## Decisiones del humano aplicadas (no reabiertas)

| Item | Decisión | Dónde se aplica |
|---|---|---|
| A — Historial | **Día blanco.** Sesiones como bandas de día; la más reciente `bg-day` + `horizon-edge-l` + `data-latest="true"`, las anteriores `bg-day-wash`; tinta `text-cyc-black`. | `SessionCard.tsx`, `HistoryScreen.tsx` |
| B — Dieta | **Fases literales** en la ventana: `antes` → noche (`border-2 border-day`), `dentro` → día (`dawn-sweep dawn-sweep-day horizon-edge-l`), `despues` → apagón (`bg-blackout`), `sin_ventana` → none. `data-phase` en el `<section>`; copy intacto. | `EatingWindow.tsx` |
| C — Fase en Hoy | **C-1.** Bandas de Hoy todas en noche; `ExerciseCard.phase` latente (default `"night"`, probado en los tres valores); `TodayScreen` pasa `order` pero no `phase`. **Cero consultas nuevas.** | `ExerciseCard.tsx`, `TodayScreen.tsx` |
| D — Tipografía | Sin webfont: system sans; kickers `text-xs font-bold uppercase tracking-plot` (0.08em); numerales `tabular-nums`. Sin `--font-*` en `@theme` (lo afirma `theme.test.ts`). | `index.css` |
| E — Glifos | `‹ › − + ✓ ✕ › 💤` se conservan como texto (copy congelado y nombres accesibles que afirman los tests). Desviación menor del piso, registrada para el finish-reviewer. | todos |

## Archivos tocados por bloque

- **0 — Antes de UI:** `progress/impl_14_ui_redesign_cyclorama.md` (este),
  `src/theme.test.ts` (nuevo; 53 tests de inspección estática; **rojo** antes
  de empezar: 44 fallaban / 9 pasaban; **verde** al cerrar).
- **1 — Tokens y shell:** `src/index.css` (bloque `@theme` con los 8 tokens,
  `--background-image-horizon`, `--tracking-plot`, `--sweep-duration`,
  `--ease-sweep`; `@layer base` con `color-scheme: dark`, `::selection`,
  caret, `accent-color`, `:focus-visible`; `@utility horizon-edge-l`,
  `horizon-edge-t`, `dawn-sweep`, `dawn-sweep-day`), `AppHeader.tsx`,
  `BottomNav.tsx`, `LoadingScreen.tsx`, `ConfigError.tsx`. Tests: `AppHeader`,
  `BottomNav`, `ConfigError` (adiciones), `LoadingScreen.test.tsx` (nuevo).
  Comprobado en `dist/assets/index-*.css`: `.dawn-sweep` resolvió
  `--sweep-duration: .2s` y `--ease-sweep` (Tailwind sí emitió el token en
  `:root`; no hizo falta moverlo a `@layer base`).
- **2 — Hoy:** `TodayScreen.tsx` (banda de horizonte `min-h-24` con `<h1>Hoy</h1>`
  + fecha kicker debajo; flechas como cuadros secundarios de 44 px en los
  extremos, centradas verticalmente, apagón al deshabilitarse; `<h2>` del día
  como banda nocturna; `<ul class="divide-y divide-blackout">`; estados R12),
  `ExerciseCard.tsx` (props `order?`/`phase?`, `data-phase`, banda de 72 px,
  kicker "01", thumb `rounded-sm bg-blackout`, "S × R" tabular). Tests:
  `TodayScreen` (+6), `ExerciseCard` (+5).
- **3 — Ejercicio y registro:** `ExerciseScreen.tsx`, `ExerciseMedia.tsx`,
  `InstructionSteps.tsx`, `Stepper.tsx`, `UnitToggle.tsx`, `SetRow.tsx`
  (prop `active?`, `data-status`, `data-active`, máquina visual de design §4),
  `LoggingSection.tsx` (`activeSetNumber` = primera `editable`/`error`).
  Tests: `ExerciseMedia.test.tsx:62` (`bg-slate-800` → `bg-blackout`, **único
  assert reescrito**), `ExerciseScreen` (+3), `Stepper` (+3), `UnitToggle` (+1),
  `SetRow` (+7), `LoggingSection` (+4).
- **4 — Historial:** `HistoryScreen.tsx` (`<section class="flex flex-col gap-px">`,
  `latest={index === 0}`), `SessionCard.tsx` (prop `latest?`, `data-latest`).
  Tests: `SessionCard` (+3), `HistoryScreen` (+3).
- **5 — Dieta:** `DietScreen.tsx`, `OfflineBanner.tsx`, `MacroSummary.tsx`,
  `EatingWindow.tsx`, `MealCard.tsx`, `SupplementList.tsx`,
  `CollapsibleSection.tsx`, `Markdown.tsx`, `Checklist.tsx`, `ChecklistItem.tsx`.
  Tests: `DietScreen` (+2), `OfflineBanner` (+1), `MacroSummary` (+1),
  `EatingWindow` (+4), `MealCard` (+1), `SupplementList` (+2),
  `CollapsibleSection` (+1), `Markdown` (+1), `Checklist` (+2),
  `ChecklistItem` (+2).
- **6 — Login:** `LoginScreen.tsx`. Tests: `LoginScreen` (+3).
- **7 — Manifest:** `vite.config.ts` (`theme_color`/`background_color` →
  `#050505`, nada más en `VitePWA`), `index.html` (`<meta name="theme-color">`
  → `#050505`), `e2e/pwa.spec.ts` (+2 asserts de manifest).
- **10 — Capturas:** `e2e/review-capture.spec.ts` (nuevo; `test.skip` salvo
  `CAPTURE=1` y con credenciales; sin escrituras).

Sin cambios (verificado con `git diff --stat`): `src/services/`, `src/hooks/`,
`src/lib/`, `src/App.tsx`, `src/main.tsx`, `supabase/`, `e2e/helpers.ts`,
`package.json`, `pnpm-lock.yaml`, `.env.example`. La única ruta de escritura a
Supabase sigue siendo `services/logs.ts#logSet` (intacta).

## Puertas de calidad (números reales)

| Puerta | Resultado |
|---|---|
| `pnpm typecheck` | 0 errores |
| `pnpm lint` | 0 errores (sin `console.log` en `src/` ni `e2e/`) |
| `pnpm test` | **50 archivos, 846 tests, 846 pasan** (732 previos + 114 nuevos). Cobertura global: **98.79 % líneas / 93.51 % ramas / 100 % funciones / 98.74 % statements** (umbral 80). Módulos tocados por debajo de 100 % líneas: `EatingWindow.tsx` 93.75, `Stepper.tsx` 95, `TodayScreen.tsx` 95.83 (líneas no cubiertas preexistentes: `describeState` sin ventana, `commit` con `draft === null`, `goToDay` sin plan). Todo ≥ 80. |
| `pnpm build` | OK. `dist/assets/index-VYgLmnjK.css` = **31,867 B** (gzip 6.71 kB) vs. referencia **29,309 B** → **1.09×** (≤ 2× ✓). Tipos en `dist/`: css 1, html 1, js 5, png 4, svg 1, webmanifest 1 — **idénticos** a la referencia. Precache 16 entradas (670.51 KiB; solo cambian hashes). `manifest.webmanifest` y `index.html` con `#050505`. Sin `@font-face` ni `url(` en el CSS. |
| `pnpm test:e2e` (preview, credenciales de `.env.local`) | **13 pasan, 6 saltados, 2 fallan** — ambos **preexistentes y ajenos al rediseño** (detalle abajo). `e2e/pwa.spec.ts` con los dos asserts nuevos de manifest: verde. `e2e/review-capture.spec.ts` sin `CAPTURE`: **2 skipped** (no fallo). `e2e/diet-checklists.spec.ts` (afirma `span.last()` con `line-through`): verde. |
| Detector Impeccable | `impeccable detect --json src/` (una sola corrida, al final): **`[]` — 0 hallazgos primarios, exit 0**. Nada mecánico que corregir. |

### Fallos E2E preexistentes (no introducidos por 14)

1. `e2e/today.spec.ts` › "R3/R4/R6: recorrer el plan hasta end_date": **timeout
   de 30 s** — ya registrado en `progress/current.md` §"Esperan decisión" punto
   5 (recorre el plan real día a día; el margen se estrecha conforme avanza el
   mes).
2. `e2e/diet-offline.spec.ts` › "criterio 7" (paso "R9/R12: el plan sin red es
   idéntico"): `readDietContent` lee `main.locator("p").first()` como nombre del
   plan; **sin red el primer `<p>` de `<main>` es el `OfflineBanner`**
   (`role="status"`), que ya iba entre el `<h1>` y el nombre del plan en el
   código previo (`DietScreen.tsx` de 12). El spec nunca había corrido con
   plan ("nunca se ha ejecutado de verdad", `progress/current.md` punto 2); hoy
   el repo `Gym` ya subió "Recomposición en casa — Septiembre 2026" y aflora.
   Es un defecto del helper E2E, fuera del alcance de 14 (`e2e/` intocable
   salvo capturas y `pwa.spec.ts`). Arreglo sugerido para quien lo tome:
   localizar el nombre del plan por clase de kicker o por `main p:not([role])`.

### Revisión manual de contraste (sobre la build, viewport 390, script con
`getComputedStyle` + muestreo del degradado en el centro del texto)

| Par | Ratio medido | Nota |
|---|---|---|
| Kicker RUTINAS GYM sobre negro (12 px 700) | 20.38:1 | |
| `<h1>Hoy` sobre horizonte (t = 0.25) | 6.51:1 | mitad superior |
| Kicker de fecha sobre horizonte (t = 0.50) | 5.13:1 | centro de la banda |
| Flechas ‹ › sobre horizonte (t = 0.50, centradas en 44 px) | 5.13:1 | |
| Kicker 01 (`opacity-60`) sobre negro | 7.33:1 | |
| Nombre de ejercicio / numeral S × R sobre negro | 20.38:1 | |
| Pestaña inactiva `text-day/60` sobre negro | 7.33:1 | |
| Numeral 4 × R (30 px 800) sobre negro | 20.38:1 | |
| `· Descanso` `text-day/60` | 7.33:1 | |
| Cuerpo instrucciones / "Anterior" `text-day/90` | 16.33:1 | |
| "Guardar serie" sobre horizonte (centrado, 44 px) | 5.13:1 | |
| "Guardando…" `text-day/90` sobre `blackout` | 9.63:1 | |
| Error `cue-fault` sobre negro (16 px 600) | 4.56:1 | siempre con texto |
| Tinta `cyc-black` en fila de día ("Serie N", "Anterior") | 20.38:1 | |

Ningún texto sobre `bg-horizon` cae bajo 4.5:1: el `<h1>` va en la mitad
superior y kicker/flechas/botón primario quedan centrados (t ≈ 0.50 → 5.1:1);
el blanco nunca toca el rosa puro.

### Reduced motion (build, `emulateMedia({ reducedMotion: "reduce" })`)

- `.dawn-sweep` `transition-duration`: sin preferencia `0.2s, 0.2s, 0.2s` →
  con `reduce` **`0s`** (corte ✓).
- Elementos con animación o transición activa (`transition-property ≠ none`
  y duración > 0, o `animation-name ≠ none`) bajo `reduce`: **0**. Todas las
  `transition-*` llevan `motion-reduce:transition-none`; `animate-pulse`
  lleva `motion-reduce:animate-none`.

## Capturas de evidencia (R33)

Generadas con `CAPTURE=1 npx playwright test e2e/review-capture.spec.ts`
contra `pnpm preview`, login real, datos reales del plan activo (Hoy avanzó
con "Día siguiente" hasta el lunes 14 sep, día de entrenamiento "Torso —
empuje", 8 ejercicios; Ejercicio = "Press de banca con mancuerna" con 4 filas
editables y "Anterior" real). Abiertas y verificadas una por una:

- `.impeccable/review/mobile.png` — Hoy, 390 × 844, página completa, thumbnails cargados.
- `.impeccable/review/mobile-ejercicio.png` — Ejercicio, 390, GIF cargado, filo en Serie 1.
- `.impeccable/review/desktop.png` — Hoy, 1440 × 900: columna de 448 px centrada sobre negro (R32).
- `.impeccable/review/desktop-ejercicio.png` — Ejercicio, 1440.

Nota para el finish-reviewer: en las capturas `fullPage` la `BottomNav`
(`fixed`) aparece a la altura del primer viewport, superpuesta al contenido
que sigue; es un artefacto de la captura de página completa, no del layout.

## Hallazgos del detector

Corrida única al final: **0 hallazgos**. Desviaciones del piso ya citadas en
design §12 que el finish-reviewer verá a ojo (no las reporta el detector):
filo de 3 px `horizon-edge-*` (lo pide el FIRST VIEWPORT del contrato);
números de orden 01… (orden de ejecución del plan, contrato); glifos
`‹ › − + ✓ ✕ ›` como texto (decisión E: copy congelado + nombres accesibles);
`<h1>Hoy` como título de banda con el kicker **debajo**; tiles de macros
(10 R6 + test `grid-cols-4`).

## Desviaciones y decisiones de implementación

- **Steppers apilados, valor a lo ancho.** A `text-3xl` con `min-w-24`, peso
  y reps no caben lado a lado en 358 px, así que cada stepper ocupa su propia
  fila con el valor `flex-1` entre − y + (los opuestos quedan en los extremos:
  principio 4 de `PRODUCT.md`). La unidad "kg"/"lb" va en un `<span>` a
  `text-base` dentro del mismo botón (textContent "22.5 kg" intacto).
- **Banda de Hoy:** el `<nav>` de flechas va `absolute` sobre la banda
  (`pointer-events-none` en el contenedor, `pointer-events-auto` en los
  botones) para pinarlas a los extremos sin `display: contents` en un `<nav>`
  (riesgo de perder el rol). Título y fecha centrados entre las flechas.
- **Login "Entrar" deshabilitado:** además del tratamiento de apagón lleva
  `disabled:bg-none` porque `bg-horizon` es `background-image` y
  `disabled:bg-blackout` solo cubre `background-color`.
- **`Markdown`:** el marcador de lista se colorea con `[&_li::marker]` en vez
  de apilar `[&_ul]:marker:` (variante compuesta menos fiable en v4).
- **Prettier** reformateó líneas preexistentes en varios tests (imports
  ampliados con `cleanup`, wraps largos en `TodayScreen.test.tsx` y
  `ExerciseMedia.test.tsx`). Ningún assert cambió salvo el autorizado; se ve
  en `git diff -U0 -- 'src/**/*.test.tsx' | grep '^-'`.

## Trazabilidad R → test

| R | Evidencia |
|---|---|
| R1 | `theme.test.ts` › "tokens del mundo" (8 tokens + horizonte/tracking/sweep) y "ningún .tsx conoce la paleta" (33 archivos) |
| R2 | `theme.test.ts` › "superficies del navegador" (color-scheme, ::selection, caret, :focus-visible) y "no define fuentes" |
| R3 | `theme.test.ts` (sin `bg-gradient/linear`, sin `bg-clip-text`; `@utility horizon-edge-l/t`); `BottomNav.test` › `horizon-edge-t`; `SetRow.test` › `bg-horizon` |
| R4 | `theme.test.ts` › "barrido es CSS puro con corte bajo prefers-reduced-motion", "no declara @keyframes"; verificación manual reduced-motion (arriba) |
| R5 | `TodayScreen.test` › kicker `tracking-plot`; `Stepper.test` › `text-3xl tabular-nums`; `MacroSummary.test` › `text-2xl font-extrabold tabular-nums`; `SessionCard.test` › `text-lg tabular-nums`; `ExerciseCard.test` › "S × R" tabular |
| R6 | `theme.test.ts` (sin `rounded-lg+`, `shadow-`, `backdrop-`); `TodayScreen.test` › flechas `border-2 border-day … disabled:bg-blackout`; `UnitToggle.test` › día/secundario; `Stepper.test` › `border-current`, `disabled:opacity-40` |
| R7 | `AppHeader.test` › "14 ciclorama (R7)" |
| R8 | `BottomNav.test` › "14 ciclorama (R8)" |
| R9 | `TodayScreen.test` › "R9: 'Hoy' vive en la banda…", "R9: las flechas…" |
| R10 | `TodayScreen.test` › "R10: el título del día…"; `ExerciseCard.test` › kicker/thumb/"4 × 8-12" |
| R11 | `ExerciseCard.test` › night/dawn/day (`data-phase`, `horizon-edge-l`, `dawn-sweep-day`); `TodayScreen.test` › todas las cards `data-phase="night"` (C-1) |
| R12 | `TodayScreen.test` › R12 (×3); `ExerciseScreen.test` › R12; `HistoryScreen.test` › R12; `DietScreen.test` › R12; `LoggingSection.test` › R12/R15; `LoadingScreen.test` |
| R13 | `ExerciseMedia.test.tsx:62` (`bg-blackout`); `ExerciseScreen.test` › R13; `HistoryScreen.test` › R13 |
| R14 | `ExerciseScreen.test` › R14; `InstructionSteps.test` (`list-decimal`, existente) |
| R15 | `LoggingSection.test` › fila activa avanza / "R12/R15"; `UnitToggle.test` › R15 |
| R16 | `SetRow.test` › "fases visuales" (editable/saving/saved/error, `data-status`, `data-active`, "Anterior") |
| R17 | `LoggingSection.test` › "al guardar, amanece y el filo avanza", "montadas como guardadas ya son de día"; manual reduced-motion |
| R18 | `Stepper.test` › "14 ciclorama (R18)" (×3) |
| R19 | `SessionCard.test` › R19 (×3); `HistoryScreen.test` › R19 |
| R20 | `DietScreen.test` › R20; `OfflineBanner.test` › R20 |
| R21 | `MacroSummary.test` › R21 |
| R22 | `EatingWindow.test` › fases literales (×4) |
| R23 | `MealCard.test` › R23; `SupplementList.test` › R23 (×2) |
| R24 | `CollapsibleSection.test` › R24; `Markdown.test` › R24 |
| R25 | `Checklist.test` › R25 (×2); `ChecklistItem.test` › R25 (×2); e2e `diet-checklists.spec.ts` (verde) |
| R26 | `LoginScreen.test` › R26 (×3) |
| R27 | `ConfigError.test` › R27; `LoadingScreen.test`; `ProtectedRoute`/`PublicOnly` sin diff |
| R28 | `theme.test.ts` › "manifest y theme-color"; `e2e/pwa.spec.ts` (manifest `#050505`, verde) |
| R29 | tabla de contraste medida (arriba); roles/atributos existentes verdes en toda la suite |
| R30 | `theme.test.ts` › "sin dependencias nuevas"; CSS 1.09×; tipos de `dist/` idénticos |
| R31 | 846/846 verdes; único assert reescrito `ExerciseMedia.test.tsx:62`; `git diff --stat` limpio en servicios/hooks/lib/App/main/supabase/helpers/package |
| R32 | `.impeccable/review/desktop.png` (columna 448 px centrada) |
| R33 | 4 capturas verificadas + detector `[]` |

## Pendiente para el leader

1. Lanzar `impeccable-finish-reviewer` con las 4 capturas, el contrato y este
   archivo; si devuelve `material_fixes`, volver por implementer.
2. `impeccable-documenter` (DESIGN.md + `.impeccable/design.json`) y luego el
   `reviewer` del harness.
3. Manual en el iPhone (no automatizable, `tasks.md` §Verification): barra de
   estado y fondo negros al abrir desde la pantalla de inicio; banda de
   horizonte legible bajo luz fuerte; guardar una serie amanece; con "Reducir
   movimiento" cambia por corte; flechas, −/+ y Guardar con el pulgar;
   Historial y Dieta según A y B.
4. Decidir qué hacer con el defecto del helper de `e2e/diet-offline.spec.ts`
   (fuera de 14).

---

# Ronda de corrección 1 — `finish-review-14` (disposición `fix`)

Fecha: 2026-09-12. La lista de trabajo fue **solo** `material_fixes` de
`.impeccable/critique/finish-review-14.md` (7 puntos). **6 aplicadas**,
**1 pendiente de waiver del humano** (fix 4). Nada de `src/services|hooks|lib`,
rutas ni copy cambió; sin dependencias nuevas (`theme.test.ts` lo sigue
afirmando). Un solo lote → una sola reconstrucción → recaptura.

## Fix 1 — nombres de ejercicio truncados (clamp a dos líneas)

- **Archivo:** `src/components/ExerciseCard.tsx`.
- **Qué se hizo:** el `<span>` del nombre pasó de
  `min-w-0 flex-1 truncate text-base font-semibold` a
  `line-clamp-2 min-w-0 flex-1 text-base leading-5 font-semibold`. Dos líneas de
  20 px = 40 px caben junto al thumb de 56 px, así que la banda sigue midiendo
  72 px. El nodo de texto y el nombre accesible del `<Link>` no cambian.
- **Resultado medido en la recaptura (390):** antes 5 de 8 nombres con elipsis;
  ahora **7 de 8 completos**; solo "Extensión de tríceps acostado con mancuerna"
  (el más largo del plan) corta en la 2.ª línea, que es el comportamiento propio
  del clamp. A 1440 caben los 8.
- **Test nuevo:** `ExerciseCard.test.tsx` › "fix 1: el nombre se parte en dos
  líneas dentro de la banda, nunca se trunca".

## Fix 2 — el horizonte, solo en la fila activa

- **Archivo:** `src/components/SetRow.tsx`.
- **Qué se hizo:** el botón se resuelve ahora por estado **y** por `active`:
  `PRIMARY_BUTTON` (horizonte + texto de día) solo cuando la fila es la activa;
  `SECONDARY_BUTTON` (`border-2 border-day bg-transparent text-day`, el mismo
  vocabulario secundario que "Agregar serie") en las demás filas pendientes.
  `saving` y `saved` conservan su tratamiento exacto. Copy, `disabled`,
  `onSave`, `min-h-11` y la máquina de estados intactos.
- **Resultado:** en `mobile-ejercicio.png` hay **un solo** slab de horizonte
  (Serie 1, la del filo) en vez de cuatro apilados; en
  `mobile-ejercicio-guardada.png` se ve el relevo: Serie 1 amanecida en día
  blanco y el horizonte ya encendido en Serie 2.
- **Tests:** ningún assert reescrito. Los dos tests de 14 que afirmaban
  `bg-horizon` ("editable", "error") pasaron de `renderRow` a `renderActive`
  — el mismo assert sobre el caso que ahora describe (el primario vive en la
  fila activa); sus asserts son idénticos. Nuevos: `SetRow.test.tsx` › "fix 2"
  (×4, incluye que la fila pendiente sigue habilitada y llama a `onSave`) y
  `LoggingSection.test.tsx` › "fix 2" (×2: con 4 filas pendientes hay
  exactamente un `bg-horizon`, y al guardar el horizonte pasa a la siguiente).

## Fix 3 — thumbnails blancos que robaban el estado "día"

- **Archivo:** `src/components/ExerciseCard.tsx`.
- **Qué se hizo:** `THUMB_CLASS` por fase: `opacity-60` en `night`/`dawn`,
  `opacity-100` en `day`. Ni la imagen ni el `alt` ni el marco
  (`bg-blackout rounded-sm h-14 w-14`) se tocan.
- **Por qué 60 y no 75:** el objetivo del reviewer es dejar el tile **por debajo
  de la luminancia de la banda**. Compuesto sobre el marco de apagón (58), 244
  al 75 % da ≈ 197 (seguiría siendo lo más claro de la pantalla); al 60 % da
  ≈ 170, ya por debajo del rosa del horizonte. La recaptura lo confirma: los
  ocho tiles leen como gris y el blanco puro queda para lo guardado
  (`mobile-ejercicio-guardada.png`, `mobile-historial.png`).
- **Test nuevo:** `ExerciseCard.test.tsx` › "fix 3: el thumbnail se atenúa en
  noche y amanecer, y va a luz plena en día".

## Fix 4 — orden de lectura de la banda de Hoy: **PENDIENTE DE WAIVER DEL HUMANO**

No se aplicó, por dos razones concretas (la instrucción del leader era no
forzarlo si la estructura está afirmada):

1. **Lo afirma el spec aprobado**, no solo el build. `requirements.md` R9 exige
   literalmente `<h1>Hoy</h1>` con `text-2xl font-bold text-day` en la banda y
   la fecha como kicker **debajo**; R10 exige el título del día como banda
   nocturna `<h2>` con `text-lg font-bold px-4 py-3 border-b border-blackout`.
   El fix invierte ambas. Aplicarlo sin waiver sería implementar contra un spec
   que el humano aprobó el 2026-09-12.
2. **Hay asserts de estructura exacta que no se pueden conservar:**
   `TodayScreen.test.tsx:289` (`expect(heading).toHaveClass("text-2xl",
   "font-bold")`) y `TodayScreen.test.tsx:325`
   (`expect(title).toHaveClass("border-blackout", "text-lg", "font-bold")`).
   El fix los contradice por definición, y la regla de esta ronda es tests
   verdes **sin reescribir asserts**.

Lo que el humano tiene que decidir (una línea): o **waiver** (se queda como
está: `<h1>Hoy` de 24 px en la banda y "Torso — empuje" en banda nocturna de
18 px debajo) o **autorizar el cambio de R9/R10 y sus dos asserts**, en cuyo
caso el `<h1>Hoy` baja a tamaño kicker, `day.title` sube a 22 px 700 dentro de
la banda y la fecha queda de kicker. Coste estimado: `TodayScreen.tsx`, 2
asserts y una línea en `requirements.md`/`design.md`.

## Fix 5 — el hover ya no usa el token de deshabilitado

- **Archivo:** `src/components/ExerciseCard.tsx`.
- **Qué se hizo:** `hover:bg-blackout` → `hover:bg-day/10` en `night` y `dawn`.
  Tailwind v4 emite `hover:` dentro de `@media (hover:hover)` (comprobado en
  `dist/assets/index-*.css`), así que en iOS el hover pegajoso ni siquiera
  aplica. El apagón sigue siendo exclusivo de `disabled:` (flechas de Hoy y
  botón de `Checklist`, que el reviewer aprobó y no se tocaron).
- **Tests:** `ExerciseCard.test.tsx` › "fix 5"; y guardia estática en
  `theme.test.ts` › "fix 5: el apagón solo aparece en hover cuando el control
  está deshabilitado" (recorre los `.tsx` de producción).

## Fix 6 — estado pulsado como paso de fase (`dawn-rose`)

- **Archivos:** `SetRow.tsx`, `LoggingSection.tsx`, `TodayScreen.tsx`,
  `DietScreen.tsx`, `ExerciseScreen.tsx`, `HistoryScreen.tsx`, `LoginScreen.tsx`.
- **Qué se hizo:** en todos los primarios `transition-opacity duration-150
  hover:opacity-90` → `transition-colors duration-150 active:bg-none
  active:bg-dawn-rose active:text-cyc-black`, conservando
  `motion-reduce:transition-none`. `active:bg-none` es necesario porque el
  horizonte es `background-image`. Las flechas ‹ › de la banda reciben el mismo
  paso (`active:bg-dawn-rose active:text-cyc-black`) sobre su hover de día.
  Usa el token `--color-dawn-rose` ya declarado: **ningún color nuevo**.
- **Cascada verificada en el CSS construido:** `hover` (offset 24537) <
  `active` (25109) < `disabled` (25463) → el pulsado gana al hover y el
  deshabilitado gana al pulsado (importa en "Entrar" del login).
- **Tests:** `SetRow.test.tsx` › "fix 6"; `TodayScreen.test.tsx` › "fix 6" (×2:
  flechas y primario); guardias estáticas en `theme.test.ts` (ningún `.tsx` usa
  `hover:opacity-90` / `active:opacity-`; todo archivo con `bg-horizon` lleva
  el paso `active:bg-dawn-rose` + `active:text-cyc-black`).

## Fix 7 — cabecera en la misma columna que el contenido

- **Archivo:** `src/components/AppHeader.tsx`.
- **Qué se hizo:** el contenido del `<header>` se envuelve en
  `mx-auto flex w-full max-w-md items-center justify-between`; la franja negra
  sigue siendo full-bleed. A 390 px no cambia un píxel (la columna ya es el
  ancho de la pantalla); a 1440 marca y "Cerrar sesión" caen sobre la misma
  columna de 448 px que `<main>` y la `BottomNav` (`desktop.png`).
- **Test nuevo:** `AppHeader.test.tsx` › "fix 7".

## Puertas (números reales de esta ronda)

| Puerta | Resultado |
|---|---|
| `pnpm typecheck` | 0 errores |
| `pnpm lint` | 0 errores |
| `pnpm test` | **50 archivos, 862 tests, 862 pasan** (846 → 862: **+16 tests nuevos**, 0 asserts reescritos). Cobertura global **98.8 % statements / 93.57 % ramas / 100 % funciones / 98.75 % líneas** (umbral 80). De los módulos tocados, solo `TodayScreen.tsx` queda por debajo de 100 % de líneas (95.83, líneas preexistentes sin cubrir). |
| `pnpm build` | OK. `dist/assets/index-BUIq_gwO.css` **32,511 B** (gzip 6.83 kB) vs. 31,867 B de la ronda inicial y 29,309 B de referencia → **1.11×** (≤ 2× ✓). Precache 16 entradas (671.74 KiB); mismos tipos de artefacto que la referencia. |
| `npx prettier --check` | limpio en todo lo tocado (siguen fuera de formato 3 tests preexistentes de `src/services/`, ajenos a 14). |
| Detector Impeccable | **no se volvió a correr** (instrucción explícita del leader). |

## Capturas (recaptura completa)

`CAPTURE=1 npx playwright test e2e/review-capture.spec.ts --workers=1` contra
`pnpm preview` (Playwright levanta y apaga el preview). `e2e/review-capture.spec.ts`
se amplió con tres pantallas de solo lectura y la fila guardada; los cuatro
archivos originales conservan ruta y viewport. Las ocho se abrieron una a una:

| Archivo | Qué muestra | Verificada |
|---|---|---|
| `mobile.png` | Hoy 390, lun 14 sep, "Torso — empuje", 8 bandas con nombres a dos líneas y thumbs atenuados | ✓ |
| `mobile-ejercicio.png` | Ejercicio 390: un solo "Guardar serie" de horizonte (Serie 1) y tres secundarios | ✓ |
| `mobile-ejercicio-guardada.png` | Serie 1 amanecida (día blanco, "✓ Guardada") y el horizonte ya en Serie 2 | ✓ |
| `mobile-historial.png` | Historial del mismo ejercicio: sesión más reciente en día blanco con filo, la anterior en `day-wash` | ✓ |
| `mobile-dieta.png` | `/dieta` con el plan real y las secciones colapsables abiertas | ✓ |
| `mobile-login.png` | `/login` sin sesión, "Entrar" en horizonte | ✓ |
| `desktop.png` | Hoy 1440: cabecera, contenido y pestañas en la misma columna de 448 px (fix 7) | ✓ |
| `desktop-ejercicio.png` | Ejercicio 1440 | ✓ |

`mobile-dieta.png` se recapturó una vez: la primera salió en "Cargando dieta…"
porque `networkidle` resolvía antes que la consulta; el spec ahora espera a que
el estado de carga desaparezca y exista la primera sección colapsable.

**Escritura y limpieza de `mobile-ejercicio-guardada.png`.** Patrón exacto de
`e2e/logging.spec.ts` + `e2e/helpers.ts`: `snapshotLogs` de los ids previos →
guardar **una** serie → captura → `deleteCreatedLogs` en `afterEach` (borra
solo por `id=in.(…)`, nunca por ejercicio/fecha, y corre aunque el test falle).
El prefill de esa fila venía de una sesión capturada en libras (11.34 kg), que
la validación de 0.5 kg rechaza, así que la captura teclea 12.5 kg en el
stepper antes de guardar (acción de usuario; `src/` no se tocó).
**Verificación posterior:** consulta de solo lectura a `workout_logs` con
`performed_at = 2026-09-12` → **`[]`**: la base real quedó sin rastro.

## Estado del árbol

Sin `pnpm preview` corriendo (puerto 4173 libre), sin `test-results/`, sin
temporales dentro del repo. `done` **no** se marcó: falta el waiver del fix 4 y
el cierre del reviewer.

---

# Ronda de corrección 2 — `verdict pass 1` de `finish-review-14`

Fecha: 2026-09-12. Lista **cerrada** de cuatro puntos (A–D) del veredicto: fix 4
(autorizado por el humano en la Enmienda 1 del spec), fix 1 parcial y las dos
regresiones que introdujo la ronda 1. Un solo lote → una sola reconstrucción →
recaptura de las ocho rutas. Nada de `src/services|hooks|lib`, rutas ni copy;
sin dependencias, webfonts ni canvas; no se corrió el detector; `done` no se
marcó.

## A — Orden de lectura de la banda de Hoy (fix 4, autorizado)

- **Archivos:** `src/screens/TodayScreen.tsx`, `src/screens/TodayScreen.test.tsx`,
  `specs/14_ui_redesign_cyclorama/requirements.md` (aclaración derivada de R5),
  `specs/14_ui_redesign_cyclorama/design.md` (tabla de `TodayScreen`, lista de
  aserciones RTL y la nota de desviaciones).
- **Qué se hizo, tal como lo redacta la Enmienda 1:**
  - El `<h1>` conserva texto "Hoy" y rol, pero baja a kicker
    (`text-xs font-bold tracking-plot uppercase`) y comparte línea con la fecha:
    `HOY · LUN 14 SEP`. El separador `·` es un `<span aria-hidden="true">`, para
    que el nombre accesible del `<h1>` siga siendo exactamente "Hoy" (lo usan
    `login()` del E2E y `auth.spec.ts` / `diet*.spec.ts` con `level: 1`).
  - `day.title` sube a la banda como texto protagonista: `<h2>` a
    `text-[22px] leading-7 font-bold text-day` (22 px del FIRST VIEWPORT; el
    `text-2xl` de Tailwind son 24).
  - **Desaparece la franja nocturna `<h2>`** de debajo de la banda; el resto de
    R10 (lista de 72 px, `divide-y divide-blackout`, anatomía de `ExerciseCard`)
    queda intacto. El `<h2>` sigue en el árbol accesible, ahora dentro de la
    banda.
  - Sin título (carga, error, sin plan, día sin rutina y **descanso**) la banda
    se queda en su línea de kicker: **no queda franja huérfana**. El estado lo
    sigue diciendo el cuerpo con el vocabulario único de R12. *Por qué no se
    repite el texto de estado dentro de la banda:* duplicaría copy congelado
    ("Día de descanso 💤", "Sin plan activo", "Sin rutina asignada para este
    día") y rompería aserciones heredadas que localizan ese texto por
    `getByText` y afirman sus clases (`text-day/90 text-center py-10`). El
    kicker se mantiene en la misma posición todos los días, con y sin título, de
    modo que la fecha no salta al navegar con ‹ ›.
- **Contraste (R29):** el bloque de texto sigue en la mitad superior de la banda
  de 96 px — kicker a 8–24 px y título a 28–56 px, centro del título en t ≈ 0.44
  del degradado (≈ 5.3:1 para blanco de 22 px 700); las flechas siguen centradas
  (t ≈ 0.50, 5.13:1). El blanco no toca el rosa puro.
- **Resultado medido (recaptura):** `mobile.png` y `desktop.png` leen
  "HOY · LUN 14 SEP" como kicker y **"Torso — empuje"** como línea protagonista;
  no hay banda nocturna debajo. Recorriendo el plan real con ‹ › (script de
  verificación, no captura): sáb 12 y dom 13 descanso → banda solo con kicker y
  cuerpo "Día de descanso 💤"; lun 14 "Torso — empuje" (8 cards); mar 15
  "Pierna — cuádriceps"; mié 16 descanso; jue 17 "Torso — tirón"; vie 18
  "Pierna — cadera y glúteo"; sáb 19 descanso. La banda ya dice **qué toca**, no
  "Hoy".
- **Asserts reescritos (los dos autorizados, y solo esos):**
  `TodayScreen.test.tsx:289` `toHaveClass("text-2xl", "font-bold")` →
  `toHaveClass("text-xs", "font-bold", "uppercase", "tracking-plot")`; `:325`
  `toHaveClass("border-blackout", "text-lg", "font-bold")` →
  `toHaveClass("text-[22px]", "font-bold", "text-day")` + comprobación de que el
  `<h2>` vive dentro de la banda (`bg-horizon min-h-24`).
- **Tests nuevos** (`TodayScreen.test.tsx` › "ronda 2 (punto A…)", 4): el título
  protagonista con el `<h1>` a kicker y un único `<h2>`; el descanso sin franja
  huérfana; sin plan / día sin rutina tampoco inventan título; y al navegar con
  "Día siguiente" la banda **cambia de título** en vez de repetir "Hoy".

## B — Fila 07: el nombre más largo ya no corta a 390

- **Archivos:** `src/components/ExerciseCard.tsx`, `ExerciseCard.test.tsx`.
- **Remedio 1 primero (recuperar ancho), medido antes de tocar nada.** Con
  Chromium a 390 px y el mismo stack de system sans: "Extensión de tríceps
  acostado con mancuerna" mide **331 px** en una línea y necesita **≥ 185 px** de
  columna para caber en dos. El ancho disponible era **160 px** (390 − 32 de
  gutter − 24 del kicker `w-6` − 56 del thumb − 82 de "3 × 12-15" − 3 × 12 de
  `gap-3`). Se recuperó todo lo posible sin bajar el nombre de 16 px ni tocar el
  "S × R" de 18 px que afirma el test: `gap-3` → `gap-2` (+12 px) y el kicker de
  orden pasa de `w-6` a su ancho natural, 15.7 px con `tabular-nums` (+8 px) →
  **181 px**. Sigue 4 px por debajo del umbral de 185 px, y ese margen depende de
  la fuente del dispositivo (Segoe UI aquí, SF en el iPhone), así que no bastaba.
- **Remedio 2, como manda el veredicto:** `line-clamp-2` → **`line-clamp-3`**. El
  clamp solo fija el máximo: las siete bandas restantes siguen midiendo 72 px y
  únicamente la 07 crece a **76 px** (3 × 20 px de línea + `py-2`). **No se bajó
  el nombre de 16 px** (principio 2 de `PRODUCT.md`: legibilidad a un brazo de
  distancia por encima de los 72 px exactos del contrato).
- **Resultado medido en la recaptura a 390 (`mobile.png`, los 8 nombres del plan
  real):** 01 "Press de banca con mancuerna" (2 líneas), 02 "Remo inclinado con
  mancuerna" (2), 03 "Flexión declinado" (1), 04 "Press sentado con mancuerna en
  banco" (2), 05 "Pullover con mancuerna" (1), 06 "Elevación lateral con
  mancuerna" (2), 07 "Extensión de tríceps acostado con mancuerna" (**3 líneas,
  completo, sin elipsis**), 08 "Plancha frontal con peso" (2). **Cero elipsis, 8
  de 8 nombres legibles**, incluido el equipo. A 1440 (`desktop.png`) ninguno
  pasa de dos líneas.
- **Assert actualizado:** el test de la fix 1 es **mío, de la ronda 1**
  (`ExerciseCard.test.tsx` › "fix 1"): `line-clamp-2` → `line-clamp-3`, con el
  `not.toHaveClass("truncate")` intacto. Es la consecuencia mecánica del remedio
  2 que el propio punto B autoriza; ningún assert heredado cambió.

## C — Regresión R1: vocabulario de tres niveles en Ejercicio

- **Archivos:** `src/components/LoggingSection.tsx` (+ `.test.tsx`),
  `src/screens/ExerciseScreen.tsx` (+ `.test.tsx`), `src/components/SetRow.tsx`
  (solo documentación: el secundario no cambia de clases).
- **Qué se hizo:** se declara el tercer nivel con los tokens ya existentes, sin
  volver a apilar horizontes (la fix 2 sigue intacta):
  - **Primario** — `bg-horizon`: solo "Guardar serie" de la fila activa.
  - **Secundario** — `border-2 border-day bg-transparent text-day` a **plena
    luz**: "Guardar serie" de las filas pendientes; sigue siendo una acción de
    escritura y se lee como tal.
  - **Terciario** — el mismo rectángulo con `opacity-60`: "Agregar serie" y "Ver
    historial", que solo añaden o navegan.

  El 60 % es exactamente el remedio que nombra el veredicto ("leave the terminal
  pair at 60 pct border"); se aplica como `opacity-60` sobre el control entero
  porque los asserts heredados exigen literalmente `border-2 border-day min-h-11
  w-full` en ambos (no se podía cambiar el token del borde a apagón sin
  reescribirlos, y esta ronda no lo autoriza). Contraste del blanco al 60 % sobre
  negro: **7.3:1**. Copy, `min-h-11`, `disabled`, roles y máquina de estados
  intactos; el ‹ "Volver" del encabezado **no** se atenúa (es chrome de
  navegación, no una acción de la página).
- **Resultado medido (`mobile-ejercicio.png`, `desktop-ejercicio.png`):** en el
  mismo viewport se leen tres pesos distintos — un slab de horizonte (Serie 1),
  tres rectángulos blancos a plena luz (Series 2–4) y dos claramente apagados
  ("Agregar serie", "Ver historial"). En `mobile-ejercicio-guardada.png` el
  relevo sigue funcionando: Serie 1 en día blanco, horizonte y filo ya en
  Serie 2.
- **Tests nuevos:** `LoggingSection.test.tsx` › "ronda 2 (punto C…)" —
  exactamente un `bg-horizon`, ninguna fila pendiente atenuada, "Agregar serie"
  con `opacity-60` y todavía funcional (agrega la Serie 5);
  `ExerciseScreen.test.tsx` › "ronda 2 (punto C…)" — "Ver historial" terciario y
  "Volver" sin atenuar. Ningún assert reescrito.

## D — Regresión R2: el thumbnail recupera contraste

- **Archivos:** `src/components/ExerciseCard.tsx`, `ExerciseCard.test.tsx`.
- **Qué se hizo:** `THUMB_CLASS` en `night` / `dawn` pasa de `opacity-60` a
  **`opacity-75`** (el valor que nombraba la fix 3 original); `day` sigue en
  `opacity-100`.
- **Resultado medido sobre `mobile.png`** (muestreo de la placa del thumb con
  canvas): luminancia de la placa **192** (era 155 en la ronda 1 y 244 antes de
  la fix 3), tierra de la fila **5**, fila guardada en
  `mobile-ejercicio-guardada.png` **255**. La figura de línea recupera su
  contraste contra la placa y el blanco puro sigue siendo exclusivo de lo
  guardado y completo.
- **Assert actualizado:** el test de la fix 3 es **mío, de la ronda 1**
  (`ExerciseCard.test.tsx` › "fix 3"): `opacity-60` → `opacity-75` en noche y
  amanecer, y el `not.toHaveClass` del caso día ajustado al valor nuevo. Queda
  dicho aquí, como pidió el leader.

## Puertas (números reales de esta ronda)

| Puerta | Resultado |
| --- | --- |
| `pnpm typecheck` | 0 errores |
| `pnpm lint` | 0 errores |
| `pnpm test` | **50 archivos, 868 tests, 868 pasan** (862 → 868: **+6 tests nuevos**). Asserts tocados: **4** — los 2 autorizados de `TodayScreen.test.tsx` (:289, :325) y los 2 de mis propios tests de la ronda 1 (fix 1 `line-clamp`, fix 3 `opacity`). Cobertura global **98.8 % statements / 93.63 % ramas / 100 % funciones / 98.75 % líneas** (umbral 80). De los módulos tocados, `ExerciseCard.tsx`, `LoggingSection.tsx`, `SetRow.tsx` y `ExerciseScreen.tsx` quedan al 100 % de líneas; `TodayScreen.tsx` al 96 % (línea 48, `goToDay` sin plan, hueco preexistente). |
| `pnpm build` | OK. `dist/assets/index-DdQkYXEr.css` **32 711 B** (gzip 6.86 kB) vs. 32 511 B de la ronda 1 y 29 309 B de referencia → **1.12×** (≤ 2× ✓). Precache 16 entradas (672.18 KiB); mismos tipos de artefacto que la referencia. |
| `npx prettier --write` | limpio en todo lo tocado (`src/` y los dos `.md` del spec). |
| Detector Impeccable | **no se corrió** (instrucción explícita del leader). |

## Capturas (recaptura completa de las ocho)

`CAPTURE=1 npx playwright test e2e/review-capture.spec.ts --workers=1` contra
`pnpm preview` (3 tests, 3 passed, 25 s), mismos nombres y viewports. Abiertas y
verificadas una a una:

| Archivo | Dimensiones | Qué muestra | Verificada |
| --- | --- | --- | --- |
| `mobile.png` | 390 × 889 | Hoy: banda "HOY · LUN 14 SEP" + **"Torso — empuje"** de 22 px; 8 bandas, los 8 nombres completos (07 en tres líneas), thumbs al 75 % | ✓ |
| `mobile-ejercicio.png` | 390 × 2288 | Ejercicio: horizonte solo en Serie 1, Series 2–4 en secundario a plena luz, "Agregar serie" / "Ver historial" apagados | ✓ |
| `mobile-ejercicio-guardada.png` | 390 × 2288 | Serie 1 amanecida (día blanco, "✓ Guardada"), horizonte y filo ya en Serie 2 | ✓ |
| `mobile-historial.png` | 390 × 889 | Historial: sesión más reciente en día blanco con filo, la anterior en `day-wash` | ✓ |
| `mobile-dieta.png` | 390 × 5161 | `/dieta` con el plan real y los colapsables abiertos | ✓ |
| `mobile-login.png` | 390 × 844 | `/login` sin sesión, "Entrar" en horizonte | ✓ |
| `desktop.png` | 1440 × 945 | Hoy 1440: cabecera, contenido y pestañas en la misma columna de 448 px; ningún nombre corta | ✓ |
| `desktop-ejercicio.png` | 1440 × 2220 | Ejercicio 1440 con los tres niveles de botón | ✓ |

Ninguna hubo que repetirla. En las capturas `fullPage` la `BottomNav` (`fixed`)
sigue apareciendo a la altura del primer viewport: artefacto conocido de la
captura de página completa, no del layout.

**Escritura y limpieza de `mobile-ejercicio-guardada.png`:** mismo patrón de la
ronda 1 — `snapshotLogs` de los ids previos → teclear 12.5 kg → guardar **una**
serie → captura → `deleteCreatedLogs` en `afterEach`, que borra solo por
`id=in.(…)` y corre aunque el test falle. La limpieza fue segura (el test cerró
en verde y el `afterEach` se ejecutó), así que la captura se conserva.

## Estado del árbol

Sin `pnpm preview` corriendo (puerto 4173 libre), sin `test-results/`, sin
temporales dentro del repo (los scripts de medición y el paseo por los días del
plan vivieron en el scratchpad de la sesión). `done` **no** se marcó: faltan el
cierre del `impeccable-finish-reviewer`, el `impeccable-documenter` y el
`reviewer` del harness.
