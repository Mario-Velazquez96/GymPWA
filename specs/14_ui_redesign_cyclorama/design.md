# Design — 14_ui_redesign_cyclorama

**Source:** requirements.md de esta feature; contrato de dirección
`.impeccable/surfaces/src-screens-todayscreen-tsx.md` (autoridad visual: este
documento lo **traduce** a tokens y clases, no lo reinterpreta); `PRODUCT.md`;
`.claude/skills/impeccable/reference/craft-floor.md` y `operate.md`;
`src/index.css`, `index.html`, `vite.config.ts`, `src/screens/*.tsx`,
`src/components/*.tsx`; los tests que afirman clases/roles (inventario en §8).

## 1. Approach

Cuatro ideas gobiernan el diseño:

1. **Todo el color vive en `@theme`.** Tailwind v4 convierte cada
   `--color-*` en utilidades (`bg-cyc-black`, `text-day/90`,
   `border-blackout`…). Ningún `.tsx` conoce un hex ni una tonalidad de la
   paleta por defecto; un test de inspección lo garantiza (R1).
2. **Un solo material estructural.** El horizonte cobalto → rosa es el único
   degradado (`bg-horizon`) y aparece en tres lugares: banda del día, acción
   primaria y filo de 3 px (`horizon-edge-l` / `horizon-edge-t`) que marca
   "activo / en curso". Nada más lleva degradado.
3. **La fase es una clase, no un color.** Cada superficie con fase expone
   `data-status` / `data-phase` / `data-latest` y una utilidad con nombre de
   fase (`dawn-sweep-day`, `horizon-edge-l`). Los tests afirman fases por
   atributo y por nombre de utilidad, nunca por hex. Así el mundo puede
   ajustarse en `index.css` sin tocar tests.
4. **El barrido es CSS puro y dura 200 ms.** Un `background-position` sobre
   un degradado duro (blanco/transparente) con `transition`; con
   `prefers-reduced-motion: reduce` es un corte. No hay keyframes de entrada,
   ni canvas, ni JS de animación.

Capa tocada: **UI únicamente** (clases, dos props de presentación con
default, `index.css`, `index.html`, manifest en `vite.config.ts`). Sin
services, hooks, lib, rutas, SQL ni SW.

## 2. Tokens — `src/index.css`

### 2.1 Tabla

| Token (`@theme`) | Valor | Utilidades generadas | Uso en el mundo |
|---|---|---|---|
| `--color-cyc-black` | `#050505` | `bg-cyc-black`, `text-cyc-black`, `border-cyc-black` | Tierra negra, tinta sobre día |
| `--color-horizon-cobalt` | `#0A33FF` | `from-*`/`bg-*` **no se usa suelto** | Extremo superior del horizonte; nunca texto |
| `--color-horizon-rose` | `#FF6AAE` | `border-horizon-rose`, `text-horizon-rose` | Extremo inferior; foco, caret, selección; nunca fondo de texto pequeño |
| `--color-dawn-rose` | `#FFC1D6` | `border-dawn-rose`, `marker:text-dawn-rose` | Notas del entrenador (borde), marcadores de lista |
| `--color-day-wash` | `#F7F5FF` | `bg-day-wash` | Sesiones anteriores en Historial |
| `--color-day` | `#FFFFFF` | `bg-day`, `text-day`, `text-day/90`, `text-day/60`, `border-day` | Día (guardado/completo), texto sobre noche |
| `--color-blackout` | `#3A3A3A` | `bg-blackout`, `border-blackout`, `divide-blackout` | Deshabilitado, "Guardando…", placeholder de media, costuras (1 px) |
| `--color-cue-fault` | `#E0342C` | `text-cue-fault`, `border-cue-fault` | Error, siempre con texto |
| `--background-image-horizon` | `linear-gradient(to bottom, cobalt, rose)` | `bg-horizon` | Banda del día, primario |
| `--tracking-plot` | `0.08em` | `tracking-plot` | Kickers |
| `--sweep-duration` | `200ms` | (referenciado por `dawn-sweep`) | Barrido |
| `--ease-sweep` | `cubic-bezier(0.16, 1, 0.3, 1)` | `ease-sweep` | Ease-out exponencial |

Tipografía: **sin** override de `--font-sans` (la pila de sistema de Tailwind
ya es system sans). Radios: solo `rounded-none` / `rounded-sm` (4 px) /
`rounded-md` (6 px).

### 2.2 Archivo completo

```css
@import "tailwindcss";

/* Mundo: ciclorama de amanecer (contrato .impeccable/surfaces/src-screens-todayscreen-tsx.md). */
@theme {
  --color-cyc-black: #050505;
  --color-horizon-cobalt: #0a33ff;
  --color-horizon-rose: #ff6aae;
  --color-dawn-rose: #ffc1d6;
  --color-day-wash: #f7f5ff;
  --color-day: #ffffff;
  --color-blackout: #3a3a3a;
  --color-cue-fault: #e0342c;

  /* Único degradado del mundo: horizonte vertical cobalto → rosa. */
  --background-image-horizon: linear-gradient(
    to bottom,
    var(--color-horizon-cobalt),
    var(--color-horizon-rose)
  );

  --tracking-plot: 0.08em;
  --sweep-duration: 200ms;
  --ease-sweep: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Superficies del navegador: lo que no dibujamos también lleva el mundo. */
@layer base {
  :root {
    color-scheme: dark;
  }
  html,
  body {
    background-color: var(--color-cyc-black);
    color: var(--color-day);
  }
  ::selection {
    background-color: var(--color-horizon-rose);
    color: var(--color-cyc-black);
  }
  input,
  textarea {
    caret-color: var(--color-horizon-rose);
    accent-color: var(--color-horizon-cobalt);
  }
  :focus-visible {
    outline: 2px solid var(--color-horizon-rose);
    outline-offset: 2px;
  }
}

/* Filo de horizonte de 3 px (activo / en curso). Lo pide el contrato
   (FIRST VIEWPORT); el piso de calidad lo veta solo como default. */
@utility horizon-edge-l {
  position: relative;
  &::before {
    content: "";
    position: absolute;
    inset-block: 0;
    left: 0;
    width: 3px;
    background-image: var(--background-image-horizon);
  }
}
@utility horizon-edge-t {
  position: relative;
  &::before {
    content: "";
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 3px;
    /* Mismos dos colores, tendidos a lo largo del filo: en 3 px de alto un
       degradado vertical sería un solo color. */
    background-image: linear-gradient(
      to right,
      var(--color-horizon-cobalt),
      var(--color-horizon-rose)
    );
  }
}

/* Barrido de amanecer: la mitad blanca del degradado duro sube desde abajo.
   --sweep-pos evita depender del orden de las dos utilidades en el CSS. */
@utility dawn-sweep {
  --sweep-pos: 0 0;
  background-color: var(--color-cyc-black);
  background-image: linear-gradient(to top, var(--color-day) 50%, transparent 50%);
  background-size: 100% 200%;
  background-position: var(--sweep-pos);
  transition:
    background-position var(--sweep-duration) var(--ease-sweep),
    color var(--sweep-duration) var(--ease-sweep),
    border-color var(--sweep-duration) var(--ease-sweep);
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
@utility dawn-sweep-day {
  --sweep-pos: 0 100%;
  color: var(--color-cyc-black);
}
```

Notas de Tailwind v4:

- `--background-image-horizon` produce `bg-horizon`; `--tracking-plot`
  produce `tracking-plot`; `--ease-sweep` produce `ease-sweep`.
  `--sweep-duration` no tiene namespace de utilidad; se consume por `var()`
  dentro de `dawn-sweep` (Tailwind emite las variables de `@theme` que el CSS
  referencia). Tarea explícita: comprobar en `dist/assets/*.css` que
  `.dawn-sweep` resolvió `--sweep-duration`; si no, mover ese token a
  `:root` dentro de `@layer base` (sigue siendo token, no número mágico).
- `@utility` con `&::before` y `@media` anidados está soportado en v4.
- `divide-blackout`, `marker:text-dawn-rose`, `text-day/60`,
  `disabled:bg-blackout`, `motion-reduce:*`, `group-open:*` son variantes
  estándar de v4 sobre los tokens.

### 2.3 Cómo se usan (vocabulario único de controles, R6)

| Tratamiento | Clases | Dónde |
|---|---|---|
| Primario | `bg-horizon text-day font-bold` | Guardar serie, Reintentar, Entrar, Volver a Hoy |
| Secundario (noche) | `border-2 border-day bg-transparent text-day font-bold` | ‹ › (banda y header), Agregar serie, Ver historial, Desmarcar todo, unidad no activa |
| Día / seleccionado | `bg-day text-cyc-black border-2 border-cyc-black font-bold` | ✓ Guardada, unidad activa, caja de checklist marcada |
| Deshabilitado (relleno) | `disabled:bg-blackout disabled:text-day/60 disabled:border-blackout disabled:cursor-not-allowed` | Flechas en el borde del plan, Entrando…, Desmarcar todo sin marcados |
| Guardando… | `bg-blackout text-day/90 border-blackout` (deshabilitado pero legible) | Botón de la fila en `saving` |
| Contorno heredado | `border-2 border-current text-current`, `disabled:opacity-40` en −/+ | Stepper |

Base común de todo control: `min-h-11 rounded-sm px-4 text-base
transition-colors duration-150 motion-reduce:transition-none`.

## 3. Barrido de amanecer — técnica

```
noche                                   día
┌──────────────┐  --sweep-pos: 0 0      ┌──────────────┐  --sweep-pos: 0 100%
│ transparente │  (mitad superior de    │    blanco    │  (mitad inferior de
│  (ve negro)  │   la imagen 200 %)     │              │   la imagen 200 %)
└──────────────┘                        └──────────────┘
          ← transition background-position 200 ms ease-sweep →
             la mitad blanca ENTRA desde abajo y sube hasta cubrir
```

- La imagen es `linear-gradient(to top, day 50%, transparent 50%)` a
  `background-size: 100% 200%`: **no es un degradado visible** (borde duro),
  es una máscara de posición; el único degradado visible sigue siendo el
  horizonte (R3).
- `color` y `border-color` transicionan con la misma duración: el texto pasa
  de blanco a tinta mientras sube la luz.
- Reduced motion: `transition: none` dentro de la propia utilidad → corte.
- Un elemento que **monta** ya con `dawn-sweep-day` no anima (no hay estado
  previo del que transicionar). Un elemento que **cambia** de `dawn-sweep` a
  `dawn-sweep dawn-sweep-day` sí. Exactamente lo que pide R17.
- Lo usan: `SetRow` (saved), `ChecklistItem` (checked), `EatingWindow`
  (dentro), `ExerciseCard` (phase day; latente en 14 salvo open item C).

## 4. Máquina de estados visual de `SetRow`

`SetRowStatus` (`lib/logging.ts`, sin cambios): `editable | saving | saved |
error`. `SetRow` recibe además `active?: boolean` (default `false`).

| status | `data-status` | `<li>` | Botón (texto sin cambios) | Steppers | Mensaje |
|---|---|---|---|---|---|
| `editable` | `editable` | `dawn-sweep border-y border-blackout` (+ `horizon-edge-l` si `active`) | "Guardar serie" · primario · habilitado | habilitados, contorno blanco | — |
| `saving` | `saving` | idem | "Guardando…" · `bg-blackout text-day/90` · `disabled` | `disabled` (−/+ a 40 %) | — |
| `saved` | `saved` | `dawn-sweep dawn-sweep-day border-y border-blackout` (nunca `active`) | "✓ Guardada" · día/seleccionado · `disabled` | `disabled`, contorno **negro** heredado, valor legible | — |
| `error` | `error` | `dawn-sweep border-2 border-cue-fault` (+ `horizon-edge-l` si `active`) | "Guardar serie" · primario · habilitado | habilitados | `<p role="alert" class="text-base font-semibold text-cue-fault">` |

Reglas:

- `busy = saving || saved` sigue gobernando `disabled` (código existente).
- `active` lo calcula `LoggingSection`:
  `rows.find(r => r.status === "editable" || r.status === "error")?.setNumber`.
  Solo una fila lleva el filo; una fila `saved` nunca.
- El `<p>` "Anterior: …" se **mantiene como un solo elemento con nodos de
  texto directos** (`Anterior:{" "}{valor}`), porque `getByText("Anterior:
  22.5 kg × 10")` de RTL solo mira nodos de texto directos. Se estiliza el
  `<p>` entero (`text-base tabular-nums`), no partes.
- Orden DOM del `<li>` (sin cambios): cabecera (`<h3>Serie N</h3>` +
  `<p>Anterior</p>`), steppers, `role="alert"` opcional, botón.
- Transición `editable → saving → saved`: la clase `dawn-sweep-day` aparece en
  el render de `saved`; el CSS hace el barrido.

Estados del `Stepper` (sin cambio de lógica): valor como botón
(`min-h-11 min-w-24 border-2 border-current text-3xl font-extrabold
tabular-nums`), −/+ (`min-h-11 min-w-11 border-2 border-current text-xl
font-bold disabled:opacity-40`), input de borrador con las mismas medidas y
`border-horizon-rose`. Como usan `currentColor`, en una fila de día heredan
la tinta negra sin prop extra.

## 5. Mapa componente por componente

Convenciones de la tabla: **Cambia** = clases/estructura visual; **Se
conserva** = clases afirmadas por tests, roles, textos, orden DOM. Ningún
componente hace fetching; ningún handler cambia.

### 5.1 Shell y globales

| Archivo | Cambia | Se conserva | R |
|---|---|---|---|
| `components/AppHeader.tsx` | `<header class="flex min-h-11 items-center justify-between border-b border-blackout bg-cyc-black px-4">`; brand `<span class="text-xs font-bold uppercase tracking-plot text-day">Rutinas Gym</span>`; botón `min-h-11 px-2 text-base text-day/90 underline-offset-4 hover:underline focus-visible:underline` | texto "Rutinas Gym", botón "Cerrar sesión" con `min-h-11`, `signOut` | R7 |
| `components/BottomNav.tsx` | `<nav class="fixed inset-x-0 bottom-0 z-10 border-t border-blackout bg-cyc-black pb-[env(safe-area-inset-bottom)]">`; link activo `horizon-edge-t text-day`, inactivo `text-day/60`; base `flex min-h-11 items-center justify-center py-2 text-base font-bold transition-colors duration-150 motion-reduce:transition-none` | `aria-label`, `TABS`, `aria-current`, `<li class="flex-1">`, `min-h-11`, `fixed bottom-0 pb-[…]` | R8 |
| `components/ProtectedRoute.tsx`, `components/PublicOnly.tsx` | — | todo | R27 |
| `components/LoadingScreen.tsx` | `<main class="flex min-h-dvh flex-col items-center justify-center bg-cyc-black p-6 text-day">`; `<p role="status" class="text-lg text-day/60 animate-pulse motion-reduce:animate-none">` | `role="status"`, "Cargando…" | R12, R27 |
| `components/ConfigError.tsx` | fondo `bg-cyc-black text-day`; párrafos `text-day/90` / `text-day/60`; `<code class="font-mono text-dawn-rose">` | `<h1>`, textos | R27 |

### 5.2 Hoy

| Archivo | Cambia | Se conserva | R |
|---|---|---|---|
| `screens/TodayScreen.tsx` | `<main class="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cyc-black pb-24 text-day">` (sin `p-4`/`gap-4`). Banda del día: `<section class="bg-horizon min-h-24 px-4 py-3">` con `grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-3`: columna central (enmienda 1) `<h1 class="text-xs font-bold uppercase tracking-plot">Hoy</h1>` + separador `·` (`aria-hidden`) + `<p class="text-xs font-bold uppercase tracking-plot tabular-nums">{formatDateEs(selectedDate)}</p>` en una misma línea, y debajo el título del día como `<h2 class="text-[22px] leading-7 font-bold text-day">` (texto protagonista de la banda); el `<nav aria-label="Navegación de días">` aporta ‹ (col 1) y › (col 3) como `min-h-11 min-w-11 rounded-sm border-2 border-day text-xl font-bold text-day disabled:…blackout`. Cuando `plan === null` no hay nav y la banda solo tiene `<h1>` + fecha. Cuerpo: `renderBody()` igual, **sin** la franja nocturna del título (enmienda 1: el `<h2>` vive en la banda y no se duplica; cuando no hay título —carga, error, sin plan, día sin rutina o descanso— la banda se queda en su línea de kicker y el estado lo dice el cuerpo con el vocabulario de R12); `<ul class="divide-y divide-blackout">`; estados vacío/carga/error con las clases de R12 dentro de `px-4` | `<h1>Hoy</h1>` visible con su rol (lo usa `login()` del E2E), `aria-label`s de las flechas, `disabled`, `min-h-11 min-w-11`, `pb-24`, textos de estados, `<h2>` del día en el árbol accesible, `ExerciseCard` por `<li>` | R9, R10, R12 |
| `components/ExerciseCard.tsx` | props nuevas `order?: number`, `phase?: "night" \| "dawn" \| "day"` (default `"night"`); `<Link data-phase={phase} class="flex min-h-11 items-center gap-3 px-4 py-2 text-day transition-colors duration-150 motion-reduce:transition-none [phase]">` con `[night] = "bg-cyc-black"`, `[dawn] = "bg-cyc-black horizon-edge-l"`, `[day] = "dawn-sweep dawn-sweep-day"`; `order` → `<span class="w-6 text-xs font-bold uppercase tracking-plot tabular-nums text-day/60">{String(order).padStart(2,"0")}</span>` (omitido si `order` es `undefined`; en día hereda tinta con `text-current/60`… usar `opacity-60` para no duplicar tokens); `<img class="h-14 w-14 shrink-0 rounded-sm bg-blackout object-cover">`; nombre `truncate text-base font-semibold`; meta `ml-auto shrink-0 text-lg font-bold tabular-nums` con el texto `{target_sets} × {target_reps}` intacto | `to`, `alt`, `width/height/loading`, `min-h-11`, textos | R10, R11 |

`TodayScreen` pasa `order={index + 1}`; **no** pasa `phase` (open item C-1).

### 5.3 Ejercicio y registro

| Archivo | Cambia | Se conserva | R |
|---|---|---|---|
| `screens/ExerciseScreen.tsx` | `<main>` como Hoy (sin `p-4`, con `pb-24`); `<header class="flex items-center gap-3 border-b border-blackout px-4 py-2">` con el `<Link aria-label="Volver">` secundario `min-h-11 min-w-11` y `<h1 class="text-2xl font-bold leading-tight">`; `<article class="flex flex-col gap-4 px-4 pt-4">`; `TargetBadge` → `<p class="text-center text-3xl font-extrabold tabular-nums text-day">` + `<span class="text-lg font-normal text-day/60">`; chips `rounded-sm border border-day/40 px-3 py-1.5 text-sm text-day/90`; notas `border-2 border-dawn-rose bg-cyc-black p-3 text-base text-day/90`; "Ver historial" secundario `w-full`; `Attribution` `text-day/60`, link `min-h-11 underline underline-offset-4`; estados por R12 | roles, `aria-label="Volver"`, `min-h-11 min-w-11` del back, `min-h-11` del link de atribución y de Reintentar/Volver a Hoy, `pb-24`, orden media → metas → chips → notas → Instrucciones → `LoggingSection` → Ver historial → atribución | R12, R13, R14 |
| `components/ExerciseMedia.tsx` | `bg-slate-800` → `bg-blackout`; `rounded-xl` → `rounded-md`; GIF `duration-300` → `duration-200 motion-reduce:transition-none` | `data-testid`, `relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden`, `opacity-0`/`opacity-100`, `alt`, handlers | R13 |
| `components/InstructionSteps.tsx` | `<ol class="flex list-decimal flex-col gap-2 pl-6 text-base leading-relaxed text-day/90 marker:font-bold marker:text-dawn-rose">`; vacío `text-day/60` | `list-decimal`, textos | R14 |
| `components/LoggingSection.tsx` | `<h2 class="text-lg font-bold">`; `<ul class="flex flex-col gap-px -mx-4">` (bandas de borde a borde; `SetRow` lleva `px-4`); cálculo de `activeSetNumber` y prop `active`; "Agregar serie" secundario `min-h-11 w-full`; estados por R12 | heading, `role="status"`/`"alert"`, Reintentar `min-h-11`, `addRow`, orden | R12, R15 |
| `components/UnitToggle.tsx` | activo = día/seleccionado, inactivo = secundario; ambos `min-h-11 min-w-11 rounded-sm px-4 text-base font-bold` | `role="group"`, `aria-label`, `aria-pressed`, `min-h-11 min-w-11` | R15 |
| `components/SetRow.tsx` | prop `active?: boolean`; `<li data-status data-active class=…>` según §4; `<h3 class="text-base font-bold">`; `<p class="text-base tabular-nums">` (Anterior, un solo elemento); botón según §4 `min-h-11 w-full rounded-sm text-base font-bold` | `<h3>Serie N</h3>`, texto "Anterior: …", `role="alert"`, textos del botón, `disabled` por `busy`, `min-h-11`, `w-full`, `flex flex-col gap-3` | R16, R17 |
| `components/Stepper.tsx` | `buttonClass = "flex min-h-11 min-w-11 items-center justify-center rounded-sm border-2 border-current text-xl font-bold transition-colors duration-150 motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed"`; valor `min-h-11 min-w-24 rounded-sm border-2 border-current text-3xl font-extrabold tabular-nums`; input `min-h-11 min-w-24 rounded-sm border-2 border-horizon-rose bg-transparent text-center text-3xl font-extrabold tabular-nums outline-none`; contenedor `flex items-center gap-2` (separación entre − y +) | `aria-label`s, `inputMode`, `autoFocus`, commit, `min-h-11`/`min-w-11` | R18 |

### 5.4 Historial

| Archivo | Cambia | Se conserva | R |
|---|---|---|---|
| `screens/HistoryScreen.tsx` | `<main>`/`<header>` como Ejercicio; `<section class="flex flex-col gap-px">`; `sessions.map((s, i) => <SessionCard … latest={i === 0} />)`; estados por R12 | roles, textos, `aria-label="Volver"`, `min-h-11 min-w-11`, `pb-24`, `groupByDate` | R12, R13, R19 |
| `components/SessionCard.tsx` | prop `latest?: boolean`; `<article data-latest class="flex flex-col gap-2 px-4 py-3 text-cyc-black [latest ? "bg-day horizon-edge-l" : "bg-day-wash"]">`; `<h2 class="text-base font-bold">`; `<li class="text-lg font-semibold tabular-nums">` (texto "Serie N — X kg × Y" como nodos directos) | `<article>`, `<h2>` con `formatDateEs(date,{year:true})`, `<ul>`/`<li>` textos, `unit` | R19 |

Variante si el humano rechaza el día blanco (open item A): `[latest ?
"bg-cyc-black horizon-edge-l" : "bg-cyc-black"]` + `border-y border-blackout
text-day`. Mismo DOM, mismos tests.

### 5.5 Dieta

| Archivo | Cambia | Se conserva | R |
|---|---|---|---|
| `screens/DietScreen.tsx` | `<main>` sin `p-4`, con `pb-24`; `<h1 class="border-b border-blackout px-4 py-3 text-2xl font-bold">`; `plan.name` → `<p class="px-4 text-xs font-bold uppercase tracking-plot text-day/60">`; secciones con `px-4`; `<h2>` `text-lg font-bold`; estados por R12 | orden de secciones, `aria-labelledby`, `OfflineBanner` bajo el `<h1>`, `pb-24`, textos | R12, R20 |
| `components/OfflineBanner.tsx` | `<p role="status" class="bg-blackout px-4 py-2 text-sm text-day/90">` | `role="status"`, textos | R20 |
| `components/MacroSummary.tsx` | `<dl class="grid grid-cols-4 gap-px">`; tile `flex flex-col items-center border border-blackout bg-cyc-black px-1 py-3 text-center`; `<dt class="text-xs font-bold uppercase tracking-plot text-day/60">`; `<dd>` valor `text-2xl font-extrabold tabular-nums text-day` + unidad `text-xs text-day/60` | `aria-label`, `grid-cols-4`, 4 `dt`/`dd`, textos | R21 |
| `components/EatingWindow.tsx` | `tone` → tabla de fases: `antes` → `data-phase="night"` `bg-cyc-black border-2 border-day text-day`; `dentro` → `"day"` `dawn-sweep dawn-sweep-day horizon-edge-l`; `despues` → `"blackout"` `bg-blackout text-day/90`; `sin_ventana` → `"none"` `bg-cyc-black border border-blackout text-day/60`; `<section … class="px-4 py-3 [tone]">`; `<h2 class="text-base font-bold">`; línea 2 `text-sm` | `aria-labelledby="ventana"`, `describeState`, textos exactos | R22 |
| `components/MealCard.tsx` | `<article class="flex flex-col gap-2 border-b border-blackout py-3">`; `<h3 class="text-lg font-bold leading-tight text-day">`; macro `text-sm text-day/60`; `<ul class="list-disc pl-5 text-base text-day/90 marker:text-dawn-rose">`; notas `text-sm text-day/60` | `heading`, `macroParts`, `<ul>/<li>`, notas | R23 |
| `components/SupplementList.tsx` | `<li class="flex gap-3 border-b border-blackout py-3">`; ✓ → `<span role="img" aria-label="Recomendado" class="flex size-6 shrink-0 items-center justify-center bg-day text-sm font-bold text-cyc-black">`; ✕ → `text-lg font-bold leading-none text-cue-fault`; nombre `font-bold text-day`; líneas `text-sm text-day/60`; `<h3>` de grupo kicker `text-day/60`; `<h2>` `text-lg font-bold` | `aria-labelledby`, `role="img"` + `aria-label`, grupos, `doseLine` | R23 |
| `components/CollapsibleSection.tsx` | `<details class="group border-y border-blackout bg-cyc-black">`; `<summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-base font-bold text-day select-none marker:hidden [&::-webkit-details-marker]:hidden">`; chevron `text-day/60 transition-transform duration-150 motion-reduce:transition-none group-open:rotate-90`; cuerpo `px-4 pb-4` | `<details>` cerrado, `<summary>` `min-h-11`, `aria-hidden` del chevron | R24 |
| `components/Markdown.tsx` | contenedor `text-base text-day/90 [&_strong]:text-day [&_strong]:font-bold [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-plot [&_th]:text-day/60 [&_tr]:border-blackout …` (resto de variantes igual) | `Table` con `overflow-x-auto`, `remarkGfm`, sin `rehype-raw` | R24 |
| `components/Checklist.tsx` | contador `text-xs font-bold uppercase tracking-plot text-day/60`; "Desmarcar todo" secundario `min-h-11 rounded-sm border-2 border-day px-4 text-sm font-bold text-day disabled:…blackout`; `<h3>` de categoría kicker; `<ul class="divide-y divide-blackout">` | `aria-label`, `aria-live`, `disabled={done === 0}`, `min-h-11` | R25 |
| `components/ChecklistItem.tsx` | `<li class={"dawn-sweep" + (checked ? " dawn-sweep-day" : "")}>`; botón `flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left`; caja `flex size-6 shrink-0 items-center justify-center rounded-sm border-2 border-current text-sm font-bold` + (checked ? `bg-day text-cyc-black border-cyc-black` : ``); label `<span>` **último** con `checked ? "line-through opacity-60" : "text-day/90"` | `role="checkbox"`, `aria-checked`, `min-h-11 w-full`, `line-through`, `checklistLabel`, orden caja → label | R25 |

### 5.6 Login

| Archivo | Cambia | Se conserva | R |
|---|---|---|---|
| `screens/LoginScreen.tsx` | `<main class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cyc-black p-6 text-day">`; `<h1 class="text-2xl font-bold">`; labels `text-xs font-bold uppercase tracking-plot text-day/90`; inputs `min-h-11 rounded-sm border-2 border-day/60 bg-cyc-black px-3 text-base text-day outline-none focus:border-horizon-rose`; error `text-base font-semibold text-cue-fault`; botón primario `min-h-11 rounded-sm px-4 text-base font-bold disabled:…blackout` | `htmlFor`/`id`, `autoComplete`, `required`, `role="alert"`, "Entrar"/"Entrando…", `min-h-11` en inputs y botón | R26 |

## 6. Contraste (valores calculados, R29)

| Par | Ratio | Uso permitido |
|---|---|---|
| `day` sobre `cyc-black` | 20.4:1 | numerales (≥ 7:1 ✓), títulos |
| `day/90` sobre `cyc-black` | 16.3:1 | cuerpo |
| `day/60` sobre `cyc-black` | 7.4:1 | secundario, kickers |
| `day/40` sobre `cyc-black` | 3.6:1 | solo bordes (`border-day/40`), nunca texto |
| `dawn-rose` sobre `cyc-black` | 13.1:1 | marcadores, bordes |
| `horizon-rose` sobre `cyc-black` | 7.7:1 | foco, bordes; nunca fondo de texto < 24 px |
| `horizon-cobalt` sobre `cyc-black` | 2.8:1 | nunca texto; solo relleno bajo texto blanco |
| `cue-fault` sobre `cyc-black` | 4.5:1 | texto ≥ `text-base font-semibold`, siempre con texto |
| `day` sobre `horizon-cobalt` | 7.2:1 | texto en la mitad superior de la banda |
| `day` sobre punto medio del horizonte | 5.0:1 | texto centrado en controles de 44 px |
| `day` sobre `horizon-rose` | 2.65:1 | **prohibido** (de ahí la regla de colocación) |
| `cyc-black` sobre `day` / `day-wash` | 20.4:1 / 19.4:1 | tinta de día |
| `cyc-black/60` sobre `day` | 5.7:1 | secundario en día |
| `day/90` sobre `blackout` | 9.0:1 | "Guardando…", OfflineBanner, ventana cerrada |
| `day/60` sobre `blackout` | 3.4:1 | solo controles deshabilitados |

## 7. Preservación de los asserts estructurales (R31)

| Assert (archivo:línea) | Elemento | Cómo se preserva |
|---|---|---|
| `min-h-11` en botones/links/inputs (Today 196/271, Exercise 187/245/272, History 169/190, Login 39–41, AppHeader 21, UnitToggle 64, Stepper 72–74, ExerciseCard 56, LoggingSection 124, SetRow 94, Checklist 129, ChecklistItem 86, CollapsibleSection 30, DietScreen 168, BottomNav 42) | los mismos | base común de controles (§2.3) incluye `min-h-11`; nunca se sustituye por `h-11` |
| `min-w-11` (Today 272, Exercise 273, History 191, UnitToggle 65, Stepper 72–73) | flechas, back, unidad, −/+ | idem |
| `flex-1` (BottomNav 43) | `<li>` | intacto |
| `fixed`, `bottom-0`, `pb-[env(safe-area-inset-bottom)]` (BottomNav 51) | `<nav>` | intactos |
| `pb-24` (Today 284, Exercise 284, History 251, Diet 261) | `<main>` | intacto; se elimina `p-4` pero no `pb-24` |
| `line-through` (ChecklistItem 49/55; e2e diet-checklists 166 sobre `span.last()`) | label `<span>` | el label sigue siendo el **último** `<span>` del botón |
| `w-full` (ChecklistItem 87) | botón checkbox | intacto |
| `aspect-square`, `max-w-[240px]` (ExerciseMedia 16–17, Exercise 96) | caja media | intactos |
| `opacity-0`/`opacity-100` (ExerciseMedia 34/38) | GIF | intactos |
| `bg-slate-800` (ExerciseMedia 62) | caja media | **único cambio autorizado** → `bg-blackout` |
| `list-decimal` (InstructionSteps 11) | `<ol>` | intacto |
| `grid-cols-4` (MacroSummary 48) | `<dl>` | intacto |
| `overflow-x-auto` (Markdown 34) | wrapper de tabla | intacto |
| `getByText("Anterior: 22.5 kg × 10")`, `"Serie 1 — 40 kg × 5"`, `"4 × 8-12"` | `<p>`, `<li>`, `<span>` | texto como nodos directos del mismo elemento; sin `<span>` intermedios |
| `getByRole("heading", { name: "Hoy" })` (helpers.login, History 146) | `<h1>` | sigue siendo `<h1>` visible dentro de la banda |
| `headings[0].closest("article")` (History 107) | `SessionCard` | sigue `<article>` con `<h2>` |
| `role="status"`/`"alert"` con textos | estados | copy intacto |

## 8. Props de presentación nuevas

```ts
// components/ExerciseCard.tsx
interface ExerciseCardProps {
  planExercise: PlanExerciseWithExercise;
  /** Número de orden en el plan (1-based) para el kicker "01"; omitido si undefined. */
  order?: number;
  /** Fase visual de la banda; en 14 TodayScreen no la pasa (open item C-1). */
  phase?: "night" | "dawn" | "day";   // default "night"
}
// components/SetRow.tsx
interface SetRowProps { …; /** Primera fila editable/error: lleva el filo de horizonte. */ active?: boolean }
// components/SessionCard.tsx
interface SessionCardProps { …; /** Sesión más reciente: bg-day + filo. */ latest?: boolean }
```

Ninguna prop nueva es obligatoria; ningún test existente cambia por ellas.

## 9. Manifest, `index.html`, PWA

- `vite.config.ts` → `theme_color: "#050505"`, `background_color: "#050505"`
  (solo esas dos líneas y el comentario del ícono, que sigue describiendo el
  PNG existente).
- `index.html` → `<meta name="theme-color" content="#050505" />`. Se mantiene
  `apple-mobile-web-app-status-bar-style="black-translucent"` (la barra de
  estado se pinta sobre el `html` negro).
- **Precache:** `globPatterns` intacto; lo único que cambia en `dist/` son
  los hashes de `index-*.css` / `index-*.js` (contenido nuevo) — sin archivos
  nuevos. Sin cambio en `runtimeCaching` ni en `navigateFallback`.
- **Bytes:** el CSS crece por las utilidades nuevas (`@utility` + variantes
  `/60`, `/90`, `motion-reduce:`); el JS cambia solo por cadenas de clases.
  Medir `dist/assets/index-*.css` antes y después y registrarlo (R30).

## 10. Dependencias y env

Ninguna. `package.json`, `pnpm-lock.yaml`, `.env.example` intactos.

## 11. Test approach

**Inspección estática — `src/theme.test.ts` (nuevo, R1, R2, R3, R4, R6, R28,
R30):** lee con `node:fs` desde `process.cwd()`:
- `src/index.css` contiene los 8 tokens con sus hex (case-insensitive),
  `--background-image-horizon`, `--tracking-plot`, `--sweep-duration: 200ms`,
  `--ease-sweep`, `@utility horizon-edge-l|horizon-edge-t|dawn-sweep|dawn-sweep-day`,
  `prefers-reduced-motion`, `::selection`, `:focus-visible`, `color-scheme:
  dark`; **no** contiene `@font-face`, `@import url(`, ni `--font-`.
- Recorre `src/**/*.tsx` (`readdirSync(…, { recursive: true })`, excluyendo
  `*.test.tsx`) y afirma que ningún archivo contiene:
  `/\b(bg|text|border|from|to|via|ring|outline|divide|marker|placeholder|decoration|fill|stroke|accent|caret|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/`,
  `/#[0-9a-f]{3,8}\b/i` fuera de comentarios, `/\bstyle=\{\{/`,
  `/\brounded-(lg|xl|2xl|3xl|full)\b/`, `/\bshadow-/`, `/\bbackdrop-/`,
  `/\bbg-(linear|gradient|radial|conic)/`, `/\bbg-clip-text\b/`.
- `index.html` contiene `content="#050505"` y no `#0f172a`; `vite.config.ts`
  contiene `theme_color: "#050505"` y `background_color: "#050505"`.
- `package.json` no cambió sus `dependencies`/`devDependencies` respecto a
  una lista fija de nombres (snapshot en el test).

**Componentes (RTL) — aserciones añadidas a los tests existentes o nuevos
`describe("14 ciclorama")`:**
- `AppHeader`: brand con `uppercase`/`tracking-plot`; botón `min-h-11` (R7).
- `BottomNav`: activo tiene `horizon-edge-t`, inactivo no; `aria-current`
  intacto (R8).
- `TodayScreen`: `<h1>Hoy</h1>` dentro de un contenedor con `bg-horizon`, a
  tamaño de kicker (enmienda 1); fecha con `tracking-plot` en la misma línea;
  flechas `border-2`; `ExerciseCard` recibe
  `order` ("01", "02" en el DOM); `<h2>` del día presente **en la banda**,
  a 22 px, y ausente cuando no hay título; loading tiene
  `animate-pulse` y `motion-reduce:animate-none`; alert + Reintentar con
  `bg-horizon` (R9, R10, R12).
- `ExerciseCard`: `data-phase` default `night`; `phase="dawn"` →
  `horizon-edge-l`; `phase="day"` → `dawn-sweep-day`; sin `order` no hay
  kicker; texto "4 × 8-12" intacto (R10, R11).
- `ExerciseMedia`: `bg-blackout` (línea 62 editada) (R13).
- `ExerciseScreen`: back `border-2`; TargetBadge `tabular-nums`; chips sin
  `rounded-full`; notas `border-dawn-rose` (R13, R14).
- `Stepper`: −/+ `border-current`, valor `tabular-nums` y `min-w-24`; valor
  deshabilitado **sin** `opacity-40`; −/+ deshabilitados con `opacity-40`
  (R18).
- `SetRow`: tabla de §4 — para cada status: `data-status`, presencia/ausencia
  de `dawn-sweep-day`, `border-cue-fault`, `bg-horizon` en el botón (editable
  y error), `bg-blackout` en saving, `bg-day` en saved; `active` → `horizon-edge-l`
  solo cuando `status !== "saved"`; "Anterior: …" `getByText` intacto (R16).
- `LoggingSection`: tras `Guardar serie` resuelto, la `<li>` de la serie tiene
  `dawn-sweep-day` y `data-status="saved"`; el filo pasa a la siguiente fila
  editable (`data-active="true"` en una sola `<li>`); filas montadas como
  saved ya tienen `dawn-sweep-day` (R15, R16, R17).
- `UnitToggle`: pressed tiene `bg-day`, el otro `border-day` (R15).
- `SessionCard`: `latest` → `bg-day` + `horizon-edge-l` + `data-latest`;
  no latest → `bg-day-wash`; `HistoryScreen` pasa `latest` solo al primero
  (R19).
- `MacroSummary`: `dd` valor `tabular-nums`; `grid-cols-4` (R21).
- `EatingWindow`: `data-phase` por `kind` (4 casos) y clases de fase; textos
  intactos (R22).
- `MealCard`, `SupplementList`: ✓ con `bg-day`, ✕ con `text-cue-fault`;
  `aria-label`s (R23).
- `CollapsibleSection`: chevron `motion-reduce:transition-none`; `Markdown`:
  wrapper `overflow-x-auto` (R24).
- `Checklist`/`ChecklistItem`: `<li>` con `dawn-sweep`; checked →
  `dawn-sweep-day` + label `line-through` y es el último `span`; "Desmarcar
  todo" deshabilitado conserva `min-h-11` (R25).
- `LoginScreen`: inputs `border-2`, botón `bg-horizon`, pending →
  `disabled` (R26). `ConfigError`/`LoadingScreen`: `bg-cyc-black`,
  `motion-reduce:animate-none` (R27).
- `App.test`/`App.dieta.test`: sin cambios (R31).

**E2E (Playwright):**
- Suites existentes verdes sin cambios (R31).
- `e2e/pwa.spec.ts`: añadir `expect(manifest.theme_color).toBe("#050505")` y
  `expect(manifest.background_color).toBe("#050505")` (R28).
- `e2e/review-capture.spec.ts` (nuevo; `test.skip(process.env.CAPTURE !==
  "1")` y `test.skip(MISSING_CREDENTIALS)`): dos `describe` con
  `test.use({ viewport })` (390×844 y 1440×900); `page.emulateMedia({
  reducedMotion: "no-preference" })`; `login(page)`; si `waitForToday` da 0,
  pulsa "Día siguiente" hasta 7 veces hasta encontrar un día con cards;
  `page.screenshot({ path: ".impeccable/review/<name>.png", fullPage: true,
  animations: "disabled" })`; `openExerciseCard(page, 0)`, espera
  `exercise-media` y "Registro de series", captura
  `<name>-ejercicio.png`. **No escribe** (sin `snapshotLogs`/`saveButton`).
  (R33)

**Coverage:** umbral vigente del repo (80 % líneas/funciones/statements/
branches global, `vite.config.ts`); ≥ 80 % líneas en cada módulo tocado
(todos ya están cubiertos; las ramas nuevas de fase se cubren con los casos
de arriba).

## 12. Adaptaciones citadas (para el finish reviewer)

- **Filo de 3 px** (`horizon-edge-*`): el piso lo veta como default; lo pide
  literalmente el FIRST VIEWPORT del contrato ("filo de horizonte de 3 px").
- **Números de orden 01…**: el piso los veta salvo que la secuencia informe;
  aquí es el orden de ejecución del plan (contrato: "número tabular 01…").
- **Glifos ‹ › − + ✓ ✕ › 💤 como texto**: copy congelado y nombres accesibles
  afirmados por tests (`"✓ Guardada"`, `"Día de descanso"`); sin sistema de
  íconos (sin bytes nuevos, R30).
- **`<h1>Hoy</h1>` a tamaño de kicker dentro de la banda** (enmienda 1 del
  spec, autorizada por el humano tras el fix 4 del finish review): el E2E
  (`login()`) y los tests dependen del heading "Hoy", así que conserva texto y
  rol, pero el protagonista de la banda pasa a ser el título del día (22 px,
  `<h2>`), que es lo que cambia al navegar con ‹ ›. El kicker "HOY · LUN 14
  SEP" comparte línea y queda **encima** del `<h2>`: es la única excepción al
  veto "kicker sobre heading", y se acepta porque el `<h1>` sigue siendo el
  heading de la pantalla y el kicker es su propio texto, no una etiqueta ajena.
- **Tiles de macros** (número grande + etiqueta): lo exige 10 R6 (RF-D2) y el
  test `grid-cols-4`.
- **Filo superior con los dos colores en horizontal**: en 3 px de alto un
  degradado vertical es un solo color; mismos dos tokens, mismo orden
  cobalto → rosa.

## 13. Open items

Ver `requirements.md` §Open items: **A** Historial en día blanco, **B** Dieta
con fases literales, **C** fase por ejercicio en Hoy (C-1 recomendada:
`phase` latente, sin consulta), **D** tipografía sin webfont, **E** glifos
como texto (aviso). Sin cambios al contrato entre repos ni a `solution_design
§3`: no hay open item de esquema.
