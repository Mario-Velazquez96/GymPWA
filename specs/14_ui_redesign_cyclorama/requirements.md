# Requirements — 14_ui_redesign_cyclorama

**Feature:** Rediseño visual completo de la PWA con el mundo "ciclorama de amanecer" (solo presentación)
**Source:** pedido del humano 2026-09-12 ("que se vea mejor y con paleta más llamativa"); contrato de dirección aprobado `.impeccable/surfaces/src-screens-todayscreen-tsx.md` (autoridad de diseño: THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM); `PRODUCT.md` (principios 1–5, accesibilidad); `.claude/skills/impeccable/reference/operate.md` y `craft-floor.md` (piso de calidad); `docs/conventions.md` (Tailwind utility-first, gym UX, español, kg); `docs/architecture.md` (PWA, capas)
**Depends on:** 03, 04, 05, 06, 07, 10, 11, 12 (todas `done`)

## Purpose

Reemplazar el look slate + sky (evidencia de lo que no se quiere) por el mundo
elegido por el humano: tierra negra de ciclorama (`#050505`), horizonte
cobalto → rosa como único material estructural, día blanco solo para lo
guardado y completo. El momento memorable es **guardar una serie = un
amanecer**: la fila sube de noche a día en un barrido de 200 ms, y la rutina
se va aclarando conforme se completa. Todo esto **sin tocar datos, servicios,
hooks, rutas, copy ni comportamiento**: la app sigue leyendo planes/dieta y
escribiendo únicamente en `workout_logs`, y los 732 tests siguen verdes.

## In scope

- **Tokens del mundo** en `src/index.css` (Tailwind v4, bloque `@theme`):
  paleta oficial, degradado de horizonte, tracking de kicker, duración y
  easing del barrido; utilidades propias `horizon-edge-l`, `horizon-edge-t`,
  `dawn-sweep`, `dawn-sweep-day`; superficies del navegador (`color-scheme`,
  `::selection`, caret, `:focus-visible`).
- **App shell:** `AppHeader`, `BottomNav` (filo de horizonte en la pestaña
  activa).
- **Pantallas (5):** `TodayScreen` (banda de horizonte del día con ‹ ›,
  bandas de ejercicio), `ExerciseScreen` + registro (`LoggingSection`,
  `SetRow`, `Stepper`, `UnitToggle`), `HistoryScreen` (`SessionCard`),
  `DietScreen` (`MacroSummary`, `EatingWindow`, `MealCard`, `SupplementList`,
  `CollapsibleSection`, `Markdown`, `Checklist`, `ChecklistItem`,
  `OfflineBanner`), `LoginScreen`; estados globales `ConfigError`,
  `LoadingScreen`; `ExerciseCard`, `ExerciseMedia`, `InstructionSteps`.
- **Props de presentación nuevas, opcionales y con default** (sin datos
  nuevos): `ExerciseCard.order` / `ExerciseCard.phase`, `SetRow.active`,
  `SessionCard.latest`. Atributos `data-*` para que los tests afirmen fases sin
  afirmar colores.
- **Manifest y meta:** `theme_color` / `background_color` en `vite.config.ts`
  y `<meta name="theme-color">` en `index.html` → `#050505`.
- **Tests:** ajustes de aserciones **solo** en `ExerciseMedia.test.tsx:62`;
  tests nuevos (tokens/inspección de clases, fases, barrido, manifest) y una
  aserción adicional en `e2e/pwa.spec.ts`; spec Playwright de capturas
  `e2e/review-capture.spec.ts` (se salta salvo `CAPTURE=1`).
- **Evidencia de cierre:** capturas en `.impeccable/review/`, una corrida del
  detector de Impeccable, `progress/impl_14_ui_redesign_cyclorama.md`.

## Out of scope

- Cualquier cambio en `src/services/`, `src/hooks/`, `src/lib/`, `src/App.tsx`,
  `src/main.tsx`, rutas, `supabase/`, `.env.example`, `package.json`
  (dependencias) y el service worker (reglas de precache/runtime).
- Consultas nuevas a Supabase (en particular, saber en Hoy qué ejercicios
  tienen series guardadas hoy: ver open item C).
- Cambios de **copy**: ningún string visible ni `aria-label` cambia; los
  glifos tipográficos existentes (‹ › − + ✓ ✕ › 💤) se conservan como texto
  porque forman parte de los nombres accesibles que afirman los tests.
- Rediseño del ícono (`public/icon.svg`, PNGs) y del `apple-touch-icon`.
- Webfonts, `@font-face`, `<link>` a fuentes, canvas/WebGL, imágenes o SVGs
  nuevos, sistema de íconos, dependencias nuevas, env vars nuevas.
- `13_fix_lb_prefill_validation` (bug de producción independiente; sigue
  `pending`).
- Escritura de `DESIGN.md` y `.impeccable/design.json` (los produce
  `impeccable-documenter` tras la revisión de cierre) y el lanzamiento de
  `impeccable-finish-reviewer` / `reviewer` (los lanza el leader).
- Modo claro, temas alternos, preferencias de tema por usuario.

## Requirements (EARS)

### Tokens y base

**R1 (Ubiquitous):** `src/index.css` shall define, in a single `@theme`
block after `@import "tailwindcss"`, exactly these color tokens —
`--color-cyc-black: #050505`, `--color-horizon-cobalt: #0A33FF`,
`--color-horizon-rose: #FF6AAE`, `--color-dawn-rose: #FFC1D6`,
`--color-day-wash: #F7F5FF`, `--color-day: #FFFFFF`,
`--color-blackout: #3A3A3A`, `--color-cue-fault: #E0342C` — plus
`--background-image-horizon` (the vertical cobalt → rose linear gradient),
`--tracking-plot: 0.08em`, `--sweep-duration: 200ms` and `--ease-sweep`; and
no `src/**/*.tsx` file shall use any Tailwind palette color class
(`slate-*`, `sky-*`, `emerald-*`, `amber-*`, `red-*`, … any `<prefix>-<hue>-<shade>`),
any hex/rgb literal, or any `style={{…}}` color.

**R2 (Ubiquitous):** The system shall theme the browser surfaces from the
palette in `src/index.css` (`@layer base`): `color-scheme: dark`; `html` and
`body` background `cyc-black` with `day` text; `::selection` = `horizon-rose`
background with `cyc-black` text; caret `horizon-rose`; `:focus-visible` =
2 px solid `horizon-rose` outline with 2 px offset on every interactive
element; the font stack shall remain the Tailwind default system sans (no
`--font-*` override, no webfont).

**R3 (Ubiquitous):** The horizon shall be the **only** two-color gradient in
the app: `bg-horizon` (from `--background-image-horizon`, `to bottom`,
cobalt → rose) for the day band and primary actions, and the 3 px edge
utilities `horizon-edge-l` (vertical, left) and `horizon-edge-t` (top, the
same two colors laid along the edge's long axis) for "in progress" / active
markers. No other `bg-gradient`/`bg-linear` class and no gradient text shall
exist.

**R4 (Ubiquitous):** The dawn sweep shall be pure CSS: the utility
`dawn-sweep` (black ground, hard-edged white/transparent `linear-gradient(to
top)` at `background-size: 100% 200%`, `background-position` driven by a custom
property, `transition` of `background-position`, `color` and `border-color`
over `var(--sweep-duration)` with `var(--ease-sweep)`), and `dawn-sweep-day`
(moves the position so the white half fills the band and sets `cyc-black`
ink). Under `prefers-reduced-motion: reduce` the utility shall set
`transition: none` (cut instead of sweep). Every other transition in the app
shall last 150–250 ms, convey state only (no entrance/page-load animation, no
keyframes other than Tailwind's `animate-pulse` on loading text, which shall
carry `motion-reduce:animate-none`).

**R5 (Ubiquitous):** Typography shall follow the contract with system sans
only: kickers = `text-xs font-bold uppercase tracking-plot`; band titles =
`text-2xl font-bold`; section headings = `text-lg font-bold`; body =
`text-base` in `text-day/90` on night and `text-cyc-black` on day; numerals
(weight/reps values, "S × R" targets, macros, history sets) =
`tabular-nums` with `font-bold`/`font-extrabold`, ≥ `text-lg` in lists and
`text-3xl` for the editable weight/reps values. No kicker shall sit
immediately above a heading (the Hoy date kicker sits **below** the `<h1>`).

**R6 (Ubiquitous):** Every control shall be a rectangle ≥ 44 px (`min-h-11`,
and `min-w-11` where already asserted) with corner radius ≤ 6 px (only
`rounded-none`, `rounded-sm`, `rounded-md`; never `rounded-lg`/`xl`/`full`),
no `shadow-*`, no `backdrop-*`, no translucent "glass"; with exactly one of
these four treatments: **primary** = `bg-horizon text-day font-bold`;
**secondary (night)** = `border-2 border-day bg-transparent text-day`;
**day / selected** = `bg-day text-cyc-black border-2 border-cyc-black`;
**disabled (filled controls)** = `bg-blackout text-day/60 border-blackout`
+ `cursor-not-allowed`. Outline controls that inherit their band's ink
(`Stepper` −/+) shall use `border-current`/`text-current` and dim to
`disabled:opacity-40`.

### App shell

**R7 (Ubiquitous):** `AppHeader` shall be a 44 px black strip (`bg-cyc-black
border-b border-blackout`) with the brand text "Rutinas Gym" rendered as a
kicker (CSS `uppercase`; the DOM text stays "Rutinas Gym") and the "Cerrar
sesión" button as a text button `min-h-11 text-day/90` with underline on
hover/focus; `signOut` wiring unchanged.

**R8 (State-driven):** While a `BottomNav` tab is active (`aria-current="page"`
per the existing rule), it shall carry `horizon-edge-t` and `text-day`;
while inactive, `text-day/60`. The `<nav>` shall keep `fixed`, `bottom-0`,
`pb-[env(safe-area-inset-bottom)]`, `bg-cyc-black border-t border-blackout`;
each `<li>` keeps `flex-1`; each link keeps `min-h-11 font-bold`.

### Hoy

**R9 (Ubiquitous):** `TodayScreen` shall render, directly under `AppHeader`, a
**horizon day band** (`bg-horizon`, `min-h-24`, edge to edge inside
`max-w-md`) containing `<h1>Hoy</h1>` (`text-2xl font-bold text-day`), the
selected date as a kicker **below** the `<h1>` (`text-day`, `text-xs font-bold
uppercase tracking-plot tabular-nums`), and — while a plan exists — the
existing `<nav aria-label="Navegación de días">` with "Día anterior" ‹ and
"Día siguiente" › as 44 px boxes (`min-h-11 min-w-11 border-2 border-day
text-day text-xl font-bold`) pinned to the band's left and right ends,
vertically centered; disabled arrows shall use the disabled treatment of R6.
All text on the band shall sit in its upper half or be vertically centered in
a 44 px control (see R29).

**R10 (Ubiquitous):** Under the day band, `TodayScreen` shall render the day's
`title` (when present) as a night band `<h2>` (`text-lg font-bold px-4 py-3
border-b border-blackout`) and the exercise `<ul>` as stacked 72 px bands
(`divide-y divide-blackout`, no gaps, no radius). Each `ExerciseCard` shall be
a `<Link>` band `flex min-h-11 items-center gap-3 px-4 py-2` with: the order
number as a kicker (`order` prop, zero-padded "01", `tabular-nums`,
`text-day/60`), the 56 px thumbnail (`h-14 w-14 rounded-sm bg-blackout
object-cover`), the name (`text-base font-semibold truncate`) and "S × R"
right-aligned (`ml-auto text-lg font-bold tabular-nums`, text kept as one
text node "4 × 8-12").

**R11 (State-driven):** While `ExerciseCard.phase` is `"night"` (default),
the band shall be black with `text-day` and `data-phase="night"`; while
`"dawn"`, black + `horizon-edge-l` + `data-phase="dawn"`; while `"day"`,
`dawn-sweep dawn-sweep-day` (white band, `cyc-black` ink) +
`data-phase="day"`. In this feature `TodayScreen` shall pass no `phase`
(all bands night) unless the human chooses variant C-2 or C-3 in the open
items — **Where** C-2 is chosen, the spec of a follow-up feature supplies the
data; **where** C-3 is chosen, this feature adds nothing further.

**R12 (Ubiquitous):** Every loading, empty and error state (Hoy, Ejercicio,
Historial, Dieta, registro de series, `LoadingScreen`) shall keep its copy and
roles and use one vocabulary: loading = `role="status"`, `text-lg text-day/60
animate-pulse motion-reduce:animate-none`, centered, `py-10`; empty =
`text-lg text-day/90`, centered, `py-10`; error = `role="alert"`, `text-base
font-semibold text-cue-fault`, followed by a "Reintentar" **primary** button
(`min-h-11`, `bg-horizon`) — "Volver a Hoy" links use the same primary style.

### Ejercicio y registro

**R13 (Ubiquitous):** `ExerciseScreen` and `HistoryScreen` shall render their
`<header>` as a night strip (`px-4 py-2 border-b border-blackout`) with the
"Volver" ‹ link as a 44 px secondary box (`min-h-11 min-w-11 border-2
border-day`) and the `<h1>` at `text-2xl font-bold leading-tight`.
`ExerciseMedia` shall keep `data-testid="exercise-media"`, `aspect-square`,
`w-full`, `max-w-[240px]`, `overflow-hidden`, the GIF `opacity-0`/`opacity-100`
classes and `transition-opacity duration-300` → `duration-200`, and replace
`bg-slate-800` with `bg-blackout rounded-md`.

**R14 (Ubiquitous):** On the exercise body: `TargetBadge` shall show "S × R" as
`text-3xl font-extrabold tabular-nums text-day` with the "· Descanso: N s"
span in `text-lg font-normal text-day/60`; equipment/target chips shall be
`rounded-sm border border-day/40 px-3 py-1.5 text-sm text-day/90` (no
`rounded-full`, no fill); the trainer `notes` block shall be `border-2
border-dawn-rose bg-cyc-black p-3 text-base text-day/90`; `InstructionSteps`
keeps `list-decimal` with `marker:font-bold marker:text-dawn-rose` and
`text-day/90`; the attribution link keeps `min-h-11 underline` in
`text-day/60`; "Ver historial" is a secondary control `min-h-11 w-full`.

**R15 (Ubiquitous):** `LoggingSection` shall keep its `<h2>Registro de
series</h2>` (`text-lg font-bold`), its loading/error states per R12, the
"Agregar serie" secondary button (`min-h-11 w-full`), and compute
`activeSetNumber` = the first row whose status is `editable` or `error`,
passing `active={row.setNumber === activeSetNumber}` to `SetRow`. `UnitToggle`
shall keep `role="group"`, `aria-label`, `aria-pressed`, `min-h-11 min-w-11`;
the pressed unit uses the day/selected treatment, the other the secondary
treatment.

**R16 (State-driven):** `SetRow` shall expose `data-status={row.status}` and
`data-active="true|false"` on its `<li>` and render one visual phase per
status, distinguishable by **text and shape, not only color** (copy
unchanged): while `editable` → night band (`dawn-sweep`, `border-y
border-blackout`), button "Guardar serie" **primary**; while `saving` → night
band, button "Guardando…" `disabled` with the disabled treatment
(`bg-blackout text-day/90`), steppers disabled; while `saved` → `dawn-sweep
dawn-sweep-day` (white band, `cyc-black` ink), button "✓ Guardada" `disabled`
with the day/selected treatment (`bg-day text-cyc-black border-2
border-cyc-black`); while `error` → night band with `border-2
border-cue-fault`, `<p role="alert">` in `text-base font-semibold
text-cue-fault`, button "Guardar serie" primary. While `active` is true the
`<li>` shall add `horizon-edge-l`. The `<li>` shall keep `flex flex-col gap-3`,
the "Serie N" `<h3>`, and the "Anterior: …" `<p>` as a single element whose
direct text nodes read exactly as today (`Anterior: 22.5 kg × 10` /
`Anterior: —`), styled `text-base tabular-nums` (`text-day/90` on night,
inherited ink on day) and placed as the first line of the row (always in
view).

**R17 (Event-driven):** When a row's status changes from `saving` to
`saved`, the `<li>` shall gain `dawn-sweep-day` and, by the CSS of R4, sweep
white from bottom to top in 200 ms (cut under reduced motion); rows that
mount already `saved` (same-day reopen) shall render as day without any
animation; the "Guardar serie" button shall never be `disabled` in `editable`
or `error` and always `disabled` in `saving` and `saved` (unchanged).

**R18 (Ubiquitous):** `Stepper` shall render −/+ as 44 px outline boxes
(`min-h-11 min-w-11 rounded-sm border-2 border-current text-current text-xl
font-bold disabled:opacity-40`), the value button as `min-h-11 min-w-24
rounded-sm border-2 border-current text-3xl font-extrabold tabular-nums`
(no dimming when disabled: on a saved row the number is the record), and the
draft `<input inputmode="decimal">` with the same box (`min-h-11 min-w-24
text-3xl font-extrabold tabular-nums text-center bg-transparent border-2
border-horizon-rose outline-none`); all `aria-label`s unchanged.

### Historial

**R19 (Ubiquitous):** `HistoryScreen` shall render sessions as stacked
**day** bands separated by 1 px of black (`flex flex-col gap-px`), newest
first; `SessionCard` shall keep `<article>` + `<h2>` (date text unchanged) +
`<ul>` of "Serie N — X kg × Y" `<li>`s as single-element text nodes, styled
`text-lg font-semibold tabular-nums`; while `latest` is true (index 0, passed
by the screen) the article shall be `bg-day` + `horizon-edge-l` +
`data-latest="true"`; otherwise `bg-day-wash`; ink `text-cyc-black`, date
`text-base font-bold`. **Where** the human rejects "Historial en día blanco"
(open item A), sessions shall instead be night bands (`border-y
border-blackout`, `text-day`) with only the latest carrying `horizon-edge-l`.

### Dieta

**R20 (Ubiquitous):** `DietScreen` shall keep `<h1>Dieta</h1>` (`text-2xl
font-bold`, night strip), render `plan.name` as a kicker `text-day/60`, keep
the section order and headings of 10/11, and render `OfflineBanner` as a
blackout band (`role="status"`, `bg-blackout px-4 py-2 text-sm text-day/90`,
copy unchanged).

**R21 (Ubiquitous):** `MacroSummary` shall keep `<dl aria-label="Macros del
día" class="grid grid-cols-4 …">` with `gap-px` and four night tiles (`bg-cyc-black
border border-blackout px-1 py-3 text-center`): `<dt>` kicker `text-day/60`,
`<dd>` numeral `text-2xl font-extrabold tabular-nums text-day` (≥ 7:1) and
unit `text-xs text-day/60`.

**R22 (State-driven):** `EatingWindow` shall map the window state to literal
phases with `data-phase` on its `<section>` and copy unchanged: while
`antes` → `data-phase="night"`, `bg-cyc-black border-2 border-day text-day`;
while `dentro` → `data-phase="day"`, `dawn-sweep dawn-sweep-day
horizon-edge-l` (white band, ink); while `despues` → `data-phase="blackout"`,
`bg-blackout text-day/90`; while `sin_ventana` → `data-phase="none"`,
`bg-cyc-black border border-blackout text-day/60`. **Where** the human rejects
the phase mapping (open item B), all four states shall be night bands
(`border-2 border-day`) and the state shall be conveyed by text only.

**R23 (Ubiquitous):** `MealCard` and `SupplementList` items shall be night
bands (`border-b border-blackout px-4 py-3`, no radius, no fill): `<h3>`
`text-lg font-bold text-day`, macro line `text-sm text-day/60`, items
`list-disc marker:text-dawn-rose text-day/90`, notes `text-sm text-day/60`;
the supplement mark shall keep `role="img"` + `aria-label` and render ✓ as a
24 px day square (`size-6 bg-day text-cyc-black font-bold text-center`) and
✕ in `text-cue-fault font-bold`; group `<h3>`s as kickers `text-day/60`.

**R24 (Ubiquitous):** `CollapsibleSection` shall be a `<details>` night band
(`border-y border-blackout`) whose `<summary>` keeps `min-h-11`, `text-base
font-bold text-day`, hidden native marker, and a chevron `text-day/60` with
`transition-transform duration-150 motion-reduce:transition-none
group-open:rotate-90`; `Markdown` shall keep the `overflow-x-auto` table
wrapper and restyle `[&_tag]:` variants to `text-day/90`, `[&_strong]:text-day`,
`[&_th]:` kicker style, `[&_tr]:border-blackout`.

**R25 (Ubiquitous):** `Checklist` shall keep the "<n> de <m> marcados"
`<p aria-live="polite">` (kicker `text-day/60`) and the "Desmarcar todo"
button as a secondary control (`min-h-11 px-4 text-sm font-bold`) that takes
the disabled treatment when `disabled`; category `<h3>`s as kickers.
`ChecklistItem` shall keep `<li><button role="checkbox" aria-checked
class="… min-h-11 w-full …">` with the decorative box first (`size-6 rounded-sm
border-2 border-current`; checked → `bg-day text-cyc-black` ✓) and the label
`<span>` **last**; the `<li>` carries `dawn-sweep`, and while `checked` adds
`dawn-sweep-day` and the label keeps `line-through` (`text-cyc-black/60`);
while unchecked the label has no `line-through` and `text-day/90`.

### Login y estados globales

**R26 (Ubiquitous):** `LoginScreen` shall render on the night ground
(`bg-cyc-black text-day`) with `<h1>Iniciar sesión</h1>` `text-2xl font-bold`,
labels as kickers (`text-day/90`), inputs as rectangles keeping `min-h-11`
(`rounded-sm border-2 border-day/60 bg-cyc-black px-3 text-base text-day
outline-none focus:border-horizon-rose`), the error `<p role="alert">` in
`text-base font-semibold text-cue-fault`, and "Entrar"/"Entrando…" as the
primary button keeping `min-h-11` and taking the disabled treatment while
`pending`.

**R27 (Ubiquitous):** `ConfigError` and `LoadingScreen` shall render on the
night ground with `text-day/90` body, `<code>` kept in `font-mono` (code is
the one legitimate monospace use), and the loading `role="status"` text per
R12; `ProtectedRoute` and `PublicOnly` shall not change.

### Manifest y PWA

**R28 (Ubiquitous):** `vite.config.ts` manifest `theme_color` and
`background_color` and `index.html` `<meta name="theme-color">` shall be
`#050505`; icons, `includeAssets`, `globPatterns`, `runtimeCaching` and
`navigateFallback` shall not change; `e2e/pwa.spec.ts` shall additionally
assert `manifest.theme_color === "#050505"` and
`manifest.background_color === "#050505"`.

### Accesibilidad, rendimiento, preservación

**R29 (Ubiquitous):** Contrast shall meet: text ≥ 4.5:1 and numerals on black
≥ 7:1 (white on `cyc-black` = 20.4:1; `day/90` = 16:1; `day/60` = 7.4:1;
`dawn-rose` = 13.1:1; `cue-fault` on black = 4.5:1 and therefore only at
`text-base font-semibold` or larger and always with text; `cyc-black/60` on
`day` = 5.7:1). `horizon-rose` and `dawn-rose` shall never be the background
of text smaller than 24 px; `horizon-cobalt` shall never be a text color.
White text on `bg-horizon` shall be `font-bold` and placed either in the upper
half of a band ≥ 72 px or vertically centered in a ≤ 48 px control (local
contrast ≥ 4.5:1: white on cobalt 7.2:1, on the gradient midpoint 5.0:1;
white on pure rose is 2.65:1 and is never allowed). All existing roles and
attributes shall remain: `role="status"`, `role="alert"`, `role="group"`,
`role="checkbox"`/`aria-checked`, `role="img"`/`aria-label`, `aria-pressed`,
`aria-current`, `aria-live`, `aria-labelledby`, every `aria-label`,
`data-testid="exercise-media"`.

**R30 (Ubiquitous):** The redesign shall add no dependency, env var, font,
image, SVG, script, canvas or WebGL; `dist/` after `pnpm build` shall contain
no asset file type that the pre-redesign build did not contain, and the
built CSS size (uncompressed) shall be recorded in the progress file and shall
not exceed 2× the pre-redesign size; precache changes are limited to the
re-hashed shell files.

**R31 (Ubiquitous):** The existing Vitest suite (732 tests) and Playwright
suites shall pass with **one** assertion edited — `ExerciseMedia.test.tsx:62`
`bg-slate-800` → `bg-blackout` — and every structural class currently
asserted shall remain on the same element: `min-h-11`, `min-w-11`, `flex-1`,
`fixed`, `bottom-0`, `pb-[env(safe-area-inset-bottom)]`, `pb-24` (on every
protected `<main>`), `line-through`, `w-full`, `aspect-square`,
`max-w-[240px]`, `opacity-0`/`opacity-100`, `list-decimal`, `grid-cols-4`,
`overflow-x-auto`. `git diff --stat` shall show no changes under
`src/services/`, `src/hooks/`, `src/lib/`, `supabase/`, `e2e/helpers.ts`,
`src/App.tsx`, `src/main.tsx`; the only Supabase write path remains
`services/logs.ts#logSet` (unchanged).

**R32 (Ubiquitous):** On viewports wider than `max-w-md` (desktop 1440) the
shell shall remain a centered 448 px column on the black cyclorama; no
desktop-specific layout shall be added.

**R33 (Ubiquitous):** Evidence for the finish review shall exist before the
implementer hands off: `.impeccable/review/mobile.png` (Hoy, 390 × 844, full
page, real data, training day, motion settled), `.impeccable/review/
mobile-ejercicio.png` (Ejercicio, same), `.impeccable/review/desktop.png` and
`.impeccable/review/desktop-ejercicio.png` (1440 × 900), produced by
`e2e/review-capture.spec.ts` (`CAPTURE=1`, reusing `e2e/helpers.ts`, writing
nothing to Supabase); and one run of
`.claude/skills/impeccable/scripts/impeccable detect --json src/` with
mechanical findings fixed and the rest listed in
`progress/impl_14_ui_redesign_cyclorama.md`.

## Acceptance

Mario abre la PWA en el iPhone: la barra de estado y el fondo son negro
`#050505` (sin destello slate). Bajo la franja "RUTINAS GYM · Cerrar sesión"
está la banda de horizonte con "Hoy", la fecha en kicker y las flechas ‹ ›
como cuadros blancos de 44 px; debajo, el título del día y las bandas de
ejercicio de 72 px numeradas 01, 02… con thumbnail, nombre y "4 × 10" en
numerales tabulares. Entra a un ejercicio: el GIF sobre placeholder apagón,
"4 × 8-12" enorme, el registro con la fila activa marcada por el filo de
horizonte, "Anterior: 22.5 kg × 10" a la vista, valores de peso/reps a 30 px
entre cuadros −/+ de 44 px. Toca "Guardar serie": el botón pasa a
"Guardando…" en apagón y, al confirmarse, la fila **amanece** de abajo hacia
arriba en 200 ms y queda blanca con tinta negra y "✓ Guardada"; si falla, la
fila se enmarca en rojo de cue con el mensaje en texto y sigue editable. En
Historial, las sesiones son bandas de día con la más reciente marcada por el
filo. En Dieta, la ventana de alimentación es noche / día / apagón según la
hora, y cada renglón tachado del súper amanece. Con "Reducir movimiento"
activado, todo cambia de fase por corte. Los 732 tests y los E2E siguen
verdes; el único assert reescrito es el de `bg-slate-800`.

## Open items (decisiones para el humano)

- **A. Historial en día blanco (propuesta del contrato, confirmar).**
  Sesiones = bandas blancas (`day` la más reciente con filo de horizonte;
  `day-wash` las anteriores), tinta negra. Coherente con "lo hecho es de
  día". Alternativa: bandas nocturnas con filo solo en la más reciente (R19
  lo contempla).
- **B. Dieta con fases literales en la ventana de alimentación (confirmar).**
  antes = noche, dentro = día (banda blanca con filo), después = apagón. La
  ventana "cerrada" en apagón podría leerse como "deshabilitado"; el texto
  sigue diciendo el estado. Alternativa: cuatro estados en noche, solo texto
  (R22 lo contempla).
- **C. Fase por ejercicio en Hoy (decisión nueva).** El contrato pide bandas
  en noche / filo si tiene series hoy / día si completó todas; pero
  `TodayScreen` + `usePlanDay` no conocen las series guardadas hoy y
  averiguarlo exige una consulta nueva (`workout_logs` por fecha y
  `exercise_id in (…)`), fuera del alcance "solo presentación". Variantes:
  **C-1 (recomendada):** en 14 las bandas de Hoy van todas en noche y la
  fase vive en Ejercicio (SetRow) y en la banda del día; `ExerciseCard` ya
  recibe `phase` (con default `night`, probado en los tres valores) para que
  una feature posterior `15_today_progress` solo añada el service + hook.
  **C-2:** ampliar 14 con esa consulta (rompe la regla de cero servicios;
  requiere excepción explícita). **C-3:** no añadir `phase` a `ExerciseCard`
  y renunciar a la fase por ejercicio en Hoy.
- **D. Tipografía sin webfont (confirmación del contrato).** Sin `@font-face`
  ni `<link>`; kickers = system sans 700 mayúsculas con tracking 0.08em;
  numerales = system sans `tabular-nums`. Cambiarlo exige otro spec.
- **E. Glifos tipográficos como íconos (aviso, no bloquea).** ‹ › − + ✓ ✕ ›
  se conservan como texto porque forman parte del copy congelado y de los
  nombres accesibles que afirman los tests (`"✓ Guardada"`). El
  `impeccable-finish-reviewer` lo verá como desviación del piso; la cita
  que la justifica es esta y la regla "cero cambios de copy" del leader.

## Decisiones resueltas por el humano (aprobación del spec, 2026-09-12)

Estado `spec_ready` → `in_progress` aprobado por Mario. Resolución de los open
items; el implementer las aplica tal cual y no reabre ninguna:

- **A — Historial:** **día blanco.** Sesiones completadas como bandas de día;
  la más reciente en `day` con filo de horizonte, las anteriores en `day-wash`.
- **B — Dieta:** **fases literales** en la ventana de alimentación: antes =
  noche, dentro = día blanco, después = apagón. El texto de estado se conserva.
- **C — Fase por ejercicio en Hoy:** **C-1.** Las bandas de Hoy quedan en
  noche bajo la banda de horizonte del día; la fase viva se muestra solo en la
  pantalla Ejercicio. Se deja la prop latente prevista en el design para una
  futura `15_today_progress`. **Ninguna consulta nueva** a `workout_logs`.
- **D — Tipografía:** confirmada sin webfont (system sans; kickers 700 en
  mayúsculas con tracking 0.08em; numerales `tabular-nums`).
- **E — Glifos `‹ › − + ✓ ✕` como texto:** se conservan (copy congelado y
  nombres accesibles que afirman los tests). Aceptado como desviación menor
  del piso de Impeccable; el finish-reviewer la registra, no la corrige.

## Enmienda 1 — fix 4 del finish review (autorizada por el humano, 2026-09-12)

El finish-reviewer (`.impeccable/critique/finish-review-14.md`, material fix 4)
observó que la banda de horizonte gasta su protagonismo en la palabra "Hoy",
que ya aparece en la pestaña inferior, mientras el título del día —lo que Mario
necesita leer— queda en una franja nocturna de 18 px. El humano **autorizó el
cambio**, que sustituye la redacción de R9 y R10 en ese punto:

- **R9 (enmendado):** dentro de la banda de horizonte, el `<h1>` conserva su
  texto "Hoy" y su rol, pero se renderiza a tamaño de kicker (`text-xs
  font-bold uppercase tracking-plot`), en la misma línea que la fecha
  (`HOY · LUN 14 SEP`), y el **título del día** (`day.title`) pasa a ser el
  texto protagonista de la banda (22 px, `font-bold`, `text-day`). Cuando el
  día no tiene título, es de descanso o no hay plan, la banda muestra en esa
  posición el estado correspondiente, sin franja nocturna huérfana.
- **R10 (enmendado):** desaparece la banda nocturna `<h2>` del título del día;
  el resto de R10 (lista de bandas de 72 px, `divide-y divide-blackout`,
  anatomía de `ExerciseCard`) queda **intacto**. El `<h2>` se conserva como
  elemento accesible donde el árbol lo requiera, sin ser la pieza visual
  protagonista.
- **R5 (aclaración derivada):** el paréntesis "el kicker de fecha va debajo
  del `<h1>`" queda superado por esta enmienda: el `<h1>` **es** el kicker y
  comparte línea con la fecha, por encima del `<h2>` del día. El veto del piso
  ("kicker sobre heading") no se rompe: no hay una etiqueta ajena sobre el
  título, sino el propio heading de la pantalla a tamaño de kicker.
- **Tests:** se autoriza reescribir exactamente los dos asserts de estructura
  afectados, `src/screens/TodayScreen.test.tsx:289` y `:325`. Ningún otro
  assert cambia.

Motivo registrado: al navegar con ‹ › a otro día del plan, la banda seguía
diciendo "Hoy"; con la enmienda dice qué toca ese día.
