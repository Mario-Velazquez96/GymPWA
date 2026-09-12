# Tasks — 14_ui_redesign_cyclorama

> Orden de implementación por capas, **una superficie a la vez**. Cada tarea
> cita sus requisitos y sus tests. Marca `[x]` al completarla. No empieces
> hasta que el humano apruebe el spec y resuelva los open items A–C (D y E
> son confirmaciones). ⚠️ Solo presentación: si una tarea te pide tocar
> `src/services/`, `src/hooks/`, `src/lib/`, `src/App.tsx`, `supabase/` o
> `package.json`, la tarea está mal leída — detente y anótalo en el progress
> file. Corre `pnpm test` después de **cada** superficie: la suite (732) debe
> seguir verde en todo momento.

## 0. Antes de tocar UI

- [x] Leer `.claude/skills/impeccable/reference/craft-floor.md` completo
      **inmediatamente antes** de la primera edición de UI (y volver a
      leerlo si la sesión se reinicia); leer el contrato
      `.impeccable/surfaces/src-screens-todayscreen-tsx.md` y `PRODUCT.md`
      (todos)
- [x] Registrar en `progress/impl_14_ui_redesign_cyclorama.md` las
      decisiones del humano sobre A (Historial), B (Dieta), C (fase en Hoy),
      D y E, y el tamaño actual de `dist/assets/index-*.css` tras un
      `pnpm build` de referencia (R30)
- [x] Crear `src/theme.test.ts` con la inspección estática del design §11
      (tokens, utilidades, reduced-motion, superficies del navegador, sin
      `@font-face`; ningún `.tsx` con paleta por defecto / hex / `style={{` /
      `rounded-lg+` / `shadow-` / `backdrop-` / gradientes; `index.html` y
      `vite.config.ts` con `#050505`; `package.json` sin dependencias nuevas).
      Debe fallar en rojo antes de empezar y quedar verde al cerrar (R1, R2,
      R3, R4, R6, R28, R30)

## 1. Tokens y app shell

- [x] Reescribir `src/index.css` con el bloque `@theme`, `@layer base` y las
      cuatro `@utility` del design §2.2, sin cambiar el `@import` (R1, R2,
      R3, R4)
- [x] `pnpm build` y comprobar en `dist/assets/index-*.css` que `.dawn-sweep`
      resolvió `--sweep-duration` y `--ease-sweep`; si Tailwind no emitió el
      token, moverlo a `:root` en `@layer base` y anotarlo (R4)
- [x] `components/AppHeader.tsx`: franja de 44 px, brand como kicker
      (`uppercase`, DOM "Rutinas Gym"), botón texto `min-h-11` (R7)
- [x] `components/BottomNav.tsx`: fondo negro, `horizon-edge-t` + `text-day`
      en la activa, `text-day/60` en la inactiva; conservar `fixed bottom-0
      pb-[env(safe-area-inset-bottom)]`, `flex-1`, `min-h-11` (R8)
- [x] `components/LoadingScreen.tsx`, `components/ConfigError.tsx`: suelo
      nocturno, `animate-pulse motion-reduce:animate-none`, `font-mono` solo
      en `<code>` (R12, R27)
- [x] **Tests:** `AppHeader.test.tsx` (kicker + `min-h-11`),
      `BottomNav.test.tsx` (`horizon-edge-t` solo en la activa; asserts
      existentes intactos), `LoadingScreen`/`ConfigError` (`bg-cyc-black`,
      `motion-reduce:animate-none`) (R7, R8, R12, R27)

## 2. Hoy

- [x] `screens/TodayScreen.tsx`: `<main>` sin `p-4` (con `pb-24`), banda de
      horizonte con `<h1>Hoy</h1>` + fecha kicker debajo + `<nav>` de flechas
      como cuadros secundarios de 44 px en los extremos (deshabilitado =
      apagón); `<h2>` del día como banda nocturna; `<ul class="divide-y
      divide-blackout">`; estados de R12; `order={index + 1}` a cada card;
      **sin** `phase` (C-1) salvo que el humano elija C-2 (R9, R10, R11, R12)
- [x] `components/ExerciseCard.tsx`: props `order?` y `phase?` con default
      `"night"`, `data-phase`, banda de 72 px (thumb 56 + `py-2`), kicker
      "01", nombre, "S × R" tabular a la derecha (texto intacto);
      `rounded-sm bg-blackout` en el thumb (R10, R11)
- [x] **Tests:** `TodayScreen.test.tsx` (`bg-horizon` alrededor del `<h1>`,
      fecha `tracking-plot`, flechas `border-2` y `min-h-11 min-w-11`,
      kickers "01"/"02", `<h2>`, `pb-24`, loading/alert por R12);
      `ExerciseCard.test.tsx` (`data-phase` por fase, `horizon-edge-l` en
      dawn, `dawn-sweep-day` en day, sin kicker sin `order`, "4 × 8-12"
      intacto, `min-h-11`) (R9, R10, R11, R12)

## 3. Ejercicio y registro

- [x] `screens/ExerciseScreen.tsx`: header nocturno con back secundario,
      `<h1>` 24 px, `TargetBadge` numerales `text-3xl font-extrabold
      tabular-nums`, chips `rounded-sm border border-day/40`, notas `border-2
      border-dawn-rose`, "Ver historial" secundario, atribución `text-day/60`,
      estados de R12 (R12, R13, R14)
- [x] `components/ExerciseMedia.tsx`: `bg-blackout rounded-md`, GIF
      `duration-200 motion-reduce:transition-none`; conservar `data-testid`,
      `aspect-square w-full max-w-[240px]`, `opacity-0/100` (R13)
- [x] `components/InstructionSteps.tsx`: `marker:text-dawn-rose`,
      `text-day/90`; conservar `list-decimal` (R14)
- [x] `components/Stepper.tsx`: −/+ `border-2 border-current` 44 px con
      `disabled:opacity-40`; valor `min-w-24 text-3xl font-extrabold
      tabular-nums` sin atenuar; input con `border-horizon-rose`; `gap-2`;
      conservar `aria-label`s y `min-h-11`/`min-w-11` (R18)
- [x] `components/UnitToggle.tsx`: activa = día/seleccionado, inactiva =
      secundario; conservar `aria-pressed`, `min-h-11 min-w-11` (R15)
- [x] `components/SetRow.tsx`: prop `active?`, `data-status`, `data-active`,
      máquina visual del design §4 (`dawn-sweep`, `dawn-sweep-day` en saved,
      `horizon-edge-l` si active y no saved, `border-2 border-cue-fault` en
      error, botón primario / apagón legible / día); "Anterior: …" como un
      solo `<p>` con nodos de texto directos (R16, R17)
- [x] `components/LoggingSection.tsx`: `activeSetNumber` (primera fila
      `editable` o `error`) → `active`; `<ul>` de bandas de borde a borde;
      "Agregar serie" secundario `min-h-11 w-full`; estados de R12 (R15)
- [x] **Tests:** `ExerciseMedia.test.tsx:62` → `bg-blackout` (único assert
      reescrito de toda la feature); `ExerciseScreen.test.tsx` (back
      `border-2`, tabular, chips sin `rounded-full`, `pb-24`);
      `Stepper.test.tsx` (`border-current`, `min-w-24`, valor sin
      `opacity-40`, −/+ con `opacity-40` cuando disabled);
      `UnitToggle.test.tsx` (pressed `bg-day`); `SetRow.test.tsx` (los 4
      estados × `data-status`, `dawn-sweep-day`, `border-cue-fault`,
      `bg-horizon`/`bg-blackout`/`bg-day` del botón, `active` con/sin filo,
      "Anterior" intacto); `LoggingSection.test.tsx` (tras guardar →
      `dawn-sweep-day` + `data-status="saved"`, un solo `data-active="true"`
      que avanza a la siguiente fila; filas montadas como saved ya en día)
      (R13–R18)

## 4. Historial

- [x] `screens/HistoryScreen.tsx`: header como Ejercicio, `<section
      class="flex flex-col gap-px">`, `latest={index === 0}`; estados de R12
      (R12, R13, R19)
- [x] `components/SessionCard.tsx`: prop `latest?`, `data-latest`, `bg-day +
      horizon-edge-l` / `bg-day-wash`, tinta negra, sets `text-lg
      font-semibold tabular-nums` con texto intacto; **o** la variante
      nocturna si el humano rechazó A (R19)
- [x] **Tests:** `SessionCard.test.tsx` (latest vs. no latest, `data-latest`,
      textos "Serie 1 — 40 kg × 5" intactos); `HistoryScreen.test.tsx`
      (`latest` solo en el primero, `closest("article")`, `pb-24`) (R19)

## 5. Dieta

- [x] `screens/DietScreen.tsx`: `<main>` sin `p-4` (con `pb-24`), `<h1>`
      como franja, `plan.name` kicker, secciones con `px-4`, estados de R12
      (R12, R20)
- [x] `components/OfflineBanner.tsx`: banda apagón `role="status"` (R20)
- [x] `components/MacroSummary.tsx`: `gap-px`, tiles nocturnos, `dt` kicker,
      `dd` `text-2xl font-extrabold tabular-nums`; conservar `grid-cols-4` y
      `aria-label` (R21)
- [x] `components/EatingWindow.tsx`: `data-phase` + clases por `kind`
      (noche / día con `dawn-sweep-day horizon-edge-l` / apagón / none) según
      la decisión B; textos intactos (R22)
- [x] `components/MealCard.tsx`, `components/SupplementList.tsx`: bandas
      nocturnas con costura `border-b border-blackout`, ✓ en cuadro de día,
      ✕ en `text-cue-fault`, kickers de grupo; conservar `role="img"` +
      `aria-label` (R23)
- [x] `components/CollapsibleSection.tsx`, `components/Markdown.tsx`:
      `<details>` nocturno, chevron `duration-150 motion-reduce:
      transition-none`, variantes `[&_tag]:` con tokens; conservar
      `min-h-11` y `overflow-x-auto` (R24)
- [x] `components/Checklist.tsx`, `components/ChecklistItem.tsx`: contador y
      categorías como kickers, "Desmarcar todo" secundario con apagón al
      deshabilitar, `<li>` con `dawn-sweep` (+ `dawn-sweep-day` al marcar),
      caja `border-current` → `bg-day` marcada, label **último** `<span>` con
      `line-through` (R25)
- [x] **Tests:** `DietScreen.test.tsx` (`pb-24`, orden intacto, Reintentar
      `bg-horizon`); `OfflineBanner.test.tsx` (`bg-blackout`, `role`);
      `MacroSummary.test.tsx` (`tabular-nums`, `grid-cols-4`);
      `EatingWindow.test.tsx` (`data-phase` en los 4 `kind`, clases de fase,
      textos exactos intactos); `MealCard`/`SupplementList` (marcas y
      `aria-label`); `CollapsibleSection`/`Markdown` (`min-h-11`,
      `overflow-x-auto`, `motion-reduce`); `Checklist`/`ChecklistItem`
      (`dawn-sweep-day` al marcar, `line-through` en el último `span`,
      `min-h-11 w-full`, Desmarcar todo `min-h-11` deshabilitado) (R20–R25)

## 6. Login y estados globales

- [x] `screens/LoginScreen.tsx`: suelo nocturno, labels kicker, inputs
      `rounded-sm border-2 border-day/60 focus:border-horizon-rose`, error
      `text-cue-fault`, botón primario con apagón en `pending`; conservar
      `min-h-11` en los tres controles, `htmlFor`/`id`, `role="alert"` (R26)
- [x] Revisar que **todos** los estados de carga/vacío/error de las 5
      pantallas y de `LoggingSection` usan exactamente el vocabulario de R12
      (mismo markup, mismo copy) (R12)
- [x] **Tests:** `LoginScreen.test.tsx` (`border-2` en inputs, `bg-horizon`
      en Entrar, `disabled` en pending, `min-h-11` × 3, `role="alert"`
      `text-cue-fault`) (R26)

## 7. Manifest y theme-color

- [x] `vite.config.ts`: `theme_color` y `background_color` → `"#050505"`;
      nada más cambia en el bloque `VitePWA` (R28)
- [x] `index.html`: `<meta name="theme-color" content="#050505" />` (R28)
- [x] **Tests:** `src/theme.test.ts` (ya afirma `#050505` / ausencia de
      `#0f172a`); `e2e/pwa.spec.ts` añade
      `expect(manifest.theme_color).toBe("#050505")` y
      `expect(manifest.background_color).toBe("#050505")` (R28)

## 8. Ajuste del único assert de color

- [x] Confirmar con `git diff -- 'src/**/*.test.tsx'` que la **única línea
      de assert reescrita** es `ExerciseMedia.test.tsx:62` (`bg-slate-800` →
      `bg-blackout`); el resto del diff en tests son **adiciones** (R31)
- [x] `git diff --stat` sin entradas en `src/services/`, `src/hooks/`,
      `src/lib/`, `src/App.tsx`, `src/main.tsx`, `supabase/`,
      `e2e/helpers.ts`, `package.json`, `pnpm-lock.yaml`, `.env.example`
      (R30, R31)

## 9. Puertas de calidad

- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` verdes;
      cobertura global ≥ 80 % (umbral vigente de `docs/verification.md` /
      `vite.config.ts`) y ≥ 80 % líneas en cada módulo tocado; registrar el
      total de tests (≥ 732 + los nuevos) (R31)
- [x] `pnpm test:e2e` con credenciales (`.env.local`) contra `pnpm preview`:
      todas las suites existentes verdes sin cambios de assert; anotar
      cualquier spec saltado por datos (descanso/sin plan) (R31)
- [x] Medir `dist/assets/index-*.css` tras el build y registrar el delta
      contra la referencia de la tarea 0 (≤ 2×); listar los archivos de
      `dist/` y confirmar que no hay tipos nuevos (R30)
- [x] Revisión manual de contraste con los pares de design §6 sobre la
      build (DevTools > Accessibility en un texto por superficie: kicker,
      cuerpo, numeral, texto sobre horizonte, error, Guardando…); registrar
      en el progress file. Si un texto sobre `bg-horizon` cae por debajo de
      4.5:1, corregir **colocación** (mitad superior / centrado), no el
      degradado (R29)
- [x] Verificar en la build con "Reducir movimiento" activado (DevTools >
      Rendering > `prefers-reduced-motion: reduce`) que guardar una serie
      cambia por corte y que nada más se mueve (R4, R17)

## 10. Capturas de evidencia

- [x] Crear `e2e/review-capture.spec.ts` según design §11 (skip salvo
      `CAPTURE=1` y con credenciales; viewports 390×844 y 1440×900; login;
      avanzar a un día con ejercicios; `fullPage: true`, `animations:
      "disabled"`; Hoy y Ejercicio; **sin escrituras**) (R33)
- [x] Ejecutar `CAPTURE=1 pnpm test:e2e e2e/review-capture.spec.ts` (en
      PowerShell: `$env:CAPTURE="1"; pnpm test:e2e e2e/review-capture.spec.ts`)
      y verificar que existen y no están en blanco:
      `.impeccable/review/mobile.png`, `.impeccable/review/mobile-ejercicio.png`,
      `.impeccable/review/desktop.png`, `.impeccable/review/desktop-ejercicio.png`
      (abrirlos con Read) (R33)
- [x] Confirmar que la corrida normal (`pnpm test:e2e` sin `CAPTURE`) reporta
      el spec como saltado, no como fallo (R33)

## 11. Detector de Impeccable

- [x] Ejecutar **una sola vez**
      `.claude/skills/impeccable/scripts/impeccable detect --json src/`
      (`impeccable.cmd` en Windows); corregir lo mecánico que no contradiga el
      contrato ni el copy congelado; anotar en
      `progress/impl_14_ui_redesign_cyclorama.md` cada hallazgo restante con
      su cita (contrato / copy / test) — los del design §12 ya tienen cita
      (R33)
- [x] Volver a correr `pnpm test` si el detector obligó a tocar clases (R31)

## 12. Cierre (nota para el leader)

- [x] Completar `progress/impl_14_ui_redesign_cyclorama.md`: decisiones A–E,
      tabla R → test (R1…R33), tamaños de CSS antes/después, resultados de
      typecheck/lint/test/build/e2e, contraste manual, hallazgos del detector,
      rutas de las capturas
- [x] **No** lanzar `impeccable-finish-reviewer`, `impeccable-documenter` ni
      el `reviewer`, y **no** escribir `DESIGN.md` ni `.impeccable/design.json`:
      el leader lanza, en este orden, `impeccable-finish-reviewer` (con las
      capturas de la tarea 10, el contrato y el progress file), aplica sus
      `material_fixes` vía implementer si las hay, luego
      `impeccable-documenter` (DESIGN.md + `.impeccable/design.json`) y por
      último el `reviewer` del harness

## Verification

- **Comandos:** `./init.sh` (typecheck + lint + test con coverage + build);
  `pnpm test:e2e` (Playwright contra `pnpm preview`); `CAPTURE=1 pnpm
  test:e2e e2e/review-capture.spec.ts` (capturas);
  `.claude/skills/impeccable/scripts/impeccable detect --json src/`.
- **Trazabilidad R → test:**
  R1, R2, R3, R4, R6, R30 → `src/theme.test.ts`; R4/R17 (barrido) →
  `SetRow.test.tsx` + `LoggingSection.test.tsx` (`dawn-sweep-day`) +
  verificación manual reduced-motion; R5 → asserts `tracking-plot` /
  `tabular-nums` en Today/Stepper/MacroSummary/SessionCard tests; R7 →
  `AppHeader.test.tsx`; R8 → `BottomNav.test.tsx`; R9, R10 →
  `TodayScreen.test.tsx`; R10, R11 → `ExerciseCard.test.tsx`; R12 → tests de
  las 5 pantallas + `LoggingSection` + `LoadingScreen` (`role`, copy,
  `bg-horizon`, `motion-reduce:animate-none`); R13 → `ExerciseMedia.test.tsx`
  + `ExerciseScreen.test.tsx` + `HistoryScreen.test.tsx`; R14 →
  `ExerciseScreen.test.tsx` + `InstructionSteps.test.tsx`; R15 →
  `LoggingSection.test.tsx` + `UnitToggle.test.tsx`; R16, R17 →
  `SetRow.test.tsx` + `LoggingSection.test.tsx`; R18 → `Stepper.test.tsx`;
  R19 → `SessionCard.test.tsx` + `HistoryScreen.test.tsx`; R20 →
  `DietScreen.test.tsx` + `OfflineBanner.test.tsx`; R21 →
  `MacroSummary.test.tsx`; R22 → `EatingWindow.test.tsx`; R23 →
  `MealCard.test.tsx` + `SupplementList.test.tsx`; R24 →
  `CollapsibleSection.test.tsx` + `Markdown.test.tsx`; R25 →
  `Checklist.test.tsx` + `ChecklistItem.test.tsx` + e2e
  `diet-checklists.spec.ts` (existente); R26 → `LoginScreen.test.tsx`; R27 →
  `ConfigError.test.tsx` + `LoadingScreen` test + `ProtectedRoute`/`PublicOnly`
  sin diff; R28 → `src/theme.test.ts` + `e2e/pwa.spec.ts`; R29 → tabla de
  contraste (design §6) + revisión manual registrada + asserts de roles
  existentes verdes; R31 → suite completa verde + `git diff --stat`; R32 →
  captura `desktop.png` (columna centrada); R33 → existencia de las cuatro
  capturas + salida del detector en el progress file.
- **Coverage:** umbral vigente (80 % global en líneas/funciones/statements/
  branches) y ≥ 80 % líneas en cada módulo tocado.
- **Manual en el iPhone (registrar en el progress file):** barra de estado y
  fondo negros al abrir desde la pantalla de inicio; banda de horizonte con
  "Hoy" y fecha legibles bajo luz fuerte; guardar una serie amanece en un
  barrido; con "Reducir movimiento" cambia por corte; flechas, −/+ y
  Guardar se tocan con el pulgar sin errar; Historial y Dieta según las
  decisiones A y B.
