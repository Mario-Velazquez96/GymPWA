# Requirements — 10_diet_screen

**Feature:** Pantalla "Dieta" (`/dieta`) de solo lectura + entrada en la navegación principal
**Source:** client_requirement_dieta RF-D1, RF-D2, RF-D3, RF-D4, RF-D7, RF-D8, RF-D9 y §8 criterios 1, 2, 3, 6, 8; solution_design §4.2 (UX de gym); docs/architecture.md (layering, PWA); specs/09_diet_schema_and_rls (tablas y tipos)
**Depends on:** 09_diet_schema_and_rls, 03_today_view

## Purpose

Que Mario consulte desde el iPhone el plan de dieta `active` que le subió el
agente: los cuatro macros del día de un vistazo, la ventana de alimentación
con su estado **ahora mismo** (dentro / fuera / cuánto falta / qué sigue), las
comidas en orden con su contenido, los suplementos (recomendados y "no vale la
pena") y las secciones informativas en Markdown, colapsadas. Añade la primera
**navegación principal** de la app (Hoy | Dieta). Todo es lectura: el service
solo hace `select`. Las listas tachables (meal prep, súper) y la
disponibilidad offline **no** están aquí (→ 11 y 12), aunque los
`diet_checklist_items` sí se cargan ya para que 11 no toque el service.

## In scope

- Ruta protegida `/dieta` en `src/App.tsx` → `src/screens/DietScreen.tsx`.
- **Navegación principal:** `src/components/BottomNav.tsx` (barra inferior
  fija con "Hoy" → `/` y "Dieta" → `/dieta`), montada en
  `src/components/ProtectedRoute.tsx` para todas las pantallas protegidas;
  padding inferior en `TodayScreen`, `ExerciseScreen`, `HistoryScreen` y
  `DietScreen`; `viewport-fit=cover` en `index.html`.
- Service `src/services/diet.ts`: `getActiveDietPlan()` con **una** consulta
  anidada; `DIET_ERROR_LOAD`. Tipo compuesto `DietPlanFull` en
  `src/lib/types.ts`.
- Hook `src/hooks/useDietPlan.ts` (loading/empty/error/data + `retry`) y hook
  `src/hooks/useNowMinutes.ts` (hora local recalculada cada 60 s).
- Lógica pura `src/lib/diet.ts`: `nowLocalHM`, `parseHM`, `formatHora`,
  `formatMinutes`, `sortByPosition`, `getWindowState`.
- Componentes: `MacroSummary`, `EatingWindow`, `MealCard`, `SupplementList`,
  `CollapsibleSection`, `Markdown`.
- Dependencia nueva (condicionada al open item B): `react-markdown` +
  `remark-gfm`.
- Tests: unit (`lib/diet`, `services/diet`), hook, componente (cada componente
  + `DietScreen` + `BottomNav` + `ProtectedRoute`), E2E `e2e/diet.spec.ts` de
  solo lectura.

## Out of scope

- Meal prep y lista de súper tachables, botón "Desmarcar todo", reubicación
  de la sección `rotacion` bajo el meal prep (→ `11_diet_checklists`). En 10
  los `diet_checklist_items` se cargan pero **no se renderizan**, y `rotacion`
  se muestra como una sección colapsable más.
- Snapshot offline / stale-while-revalidate / indicador sin conexión
  (→ `12_diet_offline`). Sin cambios al service worker.
- Cualquier escritura a Supabase; edición del plan; registro de comidas o de
  peso (RF-D11, fase 2).
- Pestaña "Historial" en la nav (no tiene ruta sin `exerciseId`) y cualquier
  rediseño de `AppHeader`.
- Cambios de esquema o RLS (todo llega en 09).
- Ventanas de alimentación que cruzan medianoche (`ventana_inicio >
  ventana_fin`): se asume que `upload-diet.mjs` las rechaza.

## Requirements (EARS)

**R1 (State-driven):** While the session is authenticated, the route `/dieta`
shall render `DietScreen` inside `ProtectedRoute` (with `AppHeader`); while
unauthenticated, navigating to `/dieta` shall redirect to `/login` exactly as
the other protected routes do.

**R2 (Ubiquitous):** Every protected screen (Hoy, Ejercicio, Historial, Dieta)
shall show `BottomNav`: a `<nav aria-label="Navegación principal">` fixed to
the bottom of the viewport with two links, "Hoy" (`/`) and "Dieta" (`/dieta`),
each ≥ 44px tall (`min-h-11`) and spanning half the width; the active link
shall carry `aria-current="page"` and a visible highlight, where "Hoy" is
active on `/`, `/ejercicio/*` and `/historial/*` and "Dieta" is active on
`/dieta` (and any `/dieta/*`). The nav shall pad its bottom with
`env(safe-area-inset-bottom)` for the iPhone home indicator.

**R3 (Event-driven):** When a `BottomNav` link is tapped, the system shall
navigate client-side to its route (no full reload), and the `<main>` of every
protected screen shall reserve bottom padding (`pb-24`) so no content is
hidden behind the bar.

**R4 (Ubiquitous):** `services/diet.ts#getActiveDietPlan()` shall issue
**exactly one** supabase-js query —
`from("diet_plans").select("*, diet_meals(*), diet_checklist_items(*),
diet_supplements(*), diet_sections(*)").eq("status", "active").limit(1)` — and
return `Result<DietPlanFull | null>` where each child array is sorted by
`position` ascending on the client (`sortByPosition`) and `data: null` with
`error: null` means "no active plan". No other query, and no
`insert`/`update`/`delete`/`upsert`/`rpc`, shall exist in the module.

**R5 (Unwanted behavior):** If the query returns an error, throws (network), or
`supabase === null`, then `getActiveDietPlan()` shall return `{ data: null,
error: "No se pudo cargar la dieta" }` (`DIET_ERROR_LOAD`), never the raw
message, logging details only via `console.debug` in DEV.

**R6 (Event-driven):** When `DietScreen` mounts with an active plan, the
system shall render, directly under the `<h1>Dieta</h1>`, `MacroSummary`: a
`<dl>` with four tiles labelled "Calorías", "Proteína", "Carbohidrato",
"Grasa" showing `kcal_objetivo` with unit "kcal" and the three gram values
with unit "g" (e.g. "2000 kcal", "160 g"), laid out so that all four are
inside the initial viewport of a 390×844 iPhone without scrolling.

**R7 (Ubiquitous):** The current time shall come from the device clock
expressed in the `America/Mexico_City` zone via
`Intl.DateTimeFormat(…, { timeZone: "America/Mexico_City", hourCycle: "h23" })`
(`lib/diet.ts#nowLocalHM(now?: Date)` → `"HH:MM"`), never from UTC getters.

**R8 (State-driven):** While the plan has both `ventana_inicio` and
`ventana_fin`, `EatingWindow` shall show "Ventana de alimentación
HH:MM–HH:MM" and the state computed by `getWindowState(plan, meals,
nowMinutes)` with these exact semantics (boundaries inclusive at the start,
exclusive at the end):
- `now < inicio` → kind `antes`: "Fuera de la ventana · faltan <min> para
  <título> (HH:MM)" using the first meal with `hora >= now`; if the plan has
  no timed meal, "faltan <min> para que abra la ventana" counting to
  `ventana_inicio`.
- `inicio <= now < fin` → kind `dentro`: "Dentro de la ventana · siguiente:
  <título> (HH:MM)" using the first meal with `hora >= now`; with no such
  meal, "Dentro de la ventana · no quedan comidas hoy; cierra a las HH:MM".
- `now >= fin` → kind `despues`: "Ventana cerrada · próxima comida mañana a
  las HH:MM (<título>)" using the earliest timed meal; with no timed meal,
  "Ventana cerrada · abre mañana a las HH:MM".
With the reference plan (10:00–18:00; Desayuno fuerte 10:00, Comida 14:00,
Cena ligera 17:00): 09:00 → `antes`, 60 min, Desayuno fuerte; 10:00 →
`dentro`, siguiente Desayuno fuerte; 17:30 → `dentro`, sin comidas restantes;
18:00 and 19:00 → `despues`, próxima Desayuno fuerte 10:00. Meals with
`hora = null` are ignored for the "next meal" computation.

**R9 (State-driven):** While `ventana_inicio` or `ventana_fin` is `null`,
`EatingWindow` shall show "Este plan no tiene ventana de ayuno" and
`getWindowState` shall return `{ kind: "sin_ventana" }` without reading the
clock.

**R10 (Event-driven):** When 60 seconds elapse while `DietScreen` is mounted,
the system shall recompute the window state from the current time
(`useNowMinutes`) **without** re-querying Supabase; the interval shall be
cleared on unmount.

**R11 (Ubiquitous):** `formatHora` shall map `"10:00:00"` → `"10:00"` (and
leave `"10:00"` unchanged); `formatMinutes` shall map `0..60` → `"<n> min"`
(60 → "60 min"), an exact number of hours above 60 → `"<h> h"` (120 → "2 h"),
and anything else → `"<h> h <m> min"` (90 → "1 h 30 min", 61 → "1 h 1 min").

**R12 (Event-driven):** When the plan has meals, the system shall render a
section headed "Comidas" with one `MealCard` per meal in `position` order:
heading "<title> · HH:MM" (title alone when `hora` is null), a line "<kcal>
kcal · <proteina_g> g proteína" (each part omitted when null), the `items` as
a `<ul>` with one `<li>` per entry, and `notes` when present. With zero meals
the section shall show "Este plan no tiene comidas".

**R13 (Event-driven):** When the plan has supplements, `SupplementList` shall
render two groups in `position` order — "Recomendados" (`recomendado = true`)
and "No vale la pena" (`recomendado = false`) — each item showing `nombre`,
"<dosis> · <momento>" (omitting null parts) and `nota`; each item shall carry
a visual mark plus an accessible label ("Recomendado" / "No recomendado");
an empty group shall be omitted entirely.

**R14 (Event-driven):** When the plan has sections, the system shall render
each `diet_sections` row in `position` order (all kinds: `reglas`, `rotacion`,
`libre`) as a `CollapsibleSection`: a native `<details>` **closed by
default** whose `<summary>` shows `title`, is ≥ 44px tall and toggles the
body on tap/Enter; the body renders `body_md` through `Markdown`.

**R15 (Ubiquitous):** `Markdown` shall render basic Markdown — bold, ordered
and unordered lists, and GFM tables — as semantic HTML so that no literal
`**`, `- ` or `|` syntax is visible; tables shall be wrapped in an
`overflow-x-auto` container; raw HTML in the source shall **not** be rendered
and no `dangerouslySetInnerHTML` shall be used.

**R16 (State-driven):** While the diet plan is loading, `DietScreen` shall
show "Cargando dieta…" with `role="status"` and no plan content.

**R17 (Unwanted behavior):** If the user has no plan with `status = 'active'`
(`data: null, error: null`), then `DietScreen` shall show "Aún no tienes un
plan de dieta asignado", the `BottomNav` shall remain visible, and **no**
`console.error` / `console.warn` / uncaught error shall be emitted
(client_requirement_dieta §8 criterio 8).

**R18 (Unwanted behavior):** If `getActiveDietPlan()` returns an error, then
`DietScreen` shall show "No se pudo cargar la dieta" with `role="alert"` and a
"Reintentar" button (≥ 44px) that re-runs the query.

**R19 (Ubiquitous):** The screen body order shall be: `MacroSummary` →
`EatingWindow` → "Comidas" → "Suplementos" → sections; `diet_checklist_items`
shall be present in `DietPlanFull` but shall **not** be rendered by 10.

**R20 (Ubiquitous):** All user-facing text shall be Spanish; no component
shall fetch data (data flows `services → hooks → screen → components`); no
`supabase.from` outside `src/services/`; the existing suites of 02–08 shall
keep passing with the nav added (only permitted edits: the `pb-24` class on
three `<main>` elements and `ProtectedRoute` rendering `BottomNav`).

**R21 (Ubiquitous):** The feature shall add no env var, no change to the
service worker precache/runtime-cache rules, no SQL migration, and no
dependency other than the Markdown renderer approved in open item B
(recommended: `react-markdown` + `remark-gfm`).

## Acceptance

Con el plan real activo que suba el repo `Gym`: al entrar a la app y tocar
"Dieta" en la barra inferior, Mario ve arriba los cuatro macros sin hacer
scroll; debajo, "Ventana de alimentación 10:00–18:00" con "Fuera de la
ventana · faltan 60 min para Desayuno fuerte (10:00)" a las 09:00 y "Ventana
cerrada · próxima comida mañana a las 10:00 (Desayuno fuerte)" a las 19:00
(criterio 2); las comidas en orden con título, hora, kcal, proteína, renglones
y notas; los suplementos separados en "Recomendados" / "No vale la pena" con
dosis y momento legibles (criterio 6); y las secciones cerradas, que al
abrirse muestran negritas, listas y tablas sin asteriscos (criterio 3). Todo
sin recargar la app (criterio 1). Sin plan activo: "Aún no tienes un plan de
dieta asignado" y consola limpia (criterio 8). Accesibilidad: la nav expone
`aria-current`, los tiles son un `<dl>`, las secciones son
`<details>/<summary>` operables por teclado, los suplementos llevan etiqueta
accesible de recomendación, y todos los controles miden ≥ 44px.

## Open items

- **A. Forma de la navegación principal (propuesta concreta, confirmar).** Hoy
  no existe nav: `/` es Hoy, Historial es contextual y `AppHeader` solo tiene
  título + "Cerrar sesión". Se propone lo mínimo: barra inferior fija
  `BottomNav` con dos pestañas "Hoy" y "Dieta" (≥ 44px, alcanzables con el
  pulgar, `aria-current`), montada en `ProtectedRoute` para no tocar cada
  pantalla más allá del padding inferior. Historial **no** se añade como
  pestaña. Alternativas si el humano prefiere: enlaces en `AppHeader` (menos
  alcanzables con el pulgar) o un segmented control bajo el header.
- **B. Renderizador de Markdown (recomendación: `react-markdown` +
  `remark-gfm`).** Opción segura: sin `dangerouslySetInnerHTML`, HTML crudo
  descartado por defecto, tablas GFM soportadas, ~35–45 kB gz que se aíslan en
  el chunk de `/dieta` (lazy) y se precachean con el shell. Alternativa sin
  dependencia: mini-renderizador propio (negritas, listas, tablas simples) en
  `Markdown.tsx` — menos bundle, más superficie de bugs con el Markdown que
  escriba el agente. La tarea de instalación queda condicionada a esta
  decisión.
- **C. Zona horaria fija vs. hora del dispositivo.** RF-D3 dice "hora del
  dispositivo (zona `America/Mexico_City`), igual que Hoy calcula el día";
  pero `todayLocalISO()` usa los getters locales de `Date` (zona del
  dispositivo), no `Intl`. Se especifica `nowLocalHM` con **zona fija
  `America/Mexico_City`** (cumple el texto de RF-D3 y hace los tests
  deterministas en cualquier TZ de CI); solo divergiría de Hoy si el iPhone
  saliera de esa zona. Confirmar, o cambiar a getters locales para calcar Hoy.
- **D. La sección `rotacion` se muestra en 10 como colapsable** (para no
  perderla); 11 la reubica bajo el meal prep. Confirmar que no molesta verla
  dos veces en el intervalo entre 10 y 11 (11 la quita de aquí).
