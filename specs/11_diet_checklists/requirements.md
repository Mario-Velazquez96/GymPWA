# Requirements — 11_diet_checklists

**Feature:** Listas tachables en la pantalla Dieta: "Qué cocinar" (meal prep, con la rotación de la semana debajo) y "Lista de súper" agrupada por categoría, con tachado persistido en el dispositivo
**Source:** client_requirement_dieta RF-D5, RF-D6, §6 (`diet_checklist_items` + nota "el tachado vive en `localStorage`"), §8 criterios 4 y 5; docs/architecture.md (layering, "writes only to `workout_logs`"); docs/conventions.md (UX de gym, español); specs/09_diet_schema_and_rls (tipos `DietChecklistItem`, `DietSection`); specs/10_diet_screen (`DietScreen`, `DietPlanFull`, `CollapsibleSection`, `Markdown`, orden de secciones); specs/08_weight_units + `src/lib/units.ts` / `src/hooks/useExerciseUnit.ts` (modelo de persistencia local robusta)
**Depends on:** 10_diet_screen

## Purpose

Que Mario use la sección Dieta **con las manos ocupadas**: el domingo, en la
cocina, va tachando las preparaciones del meal prep y consulta debajo la
rotación de la semana; entre semana, en el pasillo del súper, va tachando
productos agrupados por categoría para no ir y venir. Cada renglón se tacha
con un toque, el estado sobrevive a cerrar y reabrir la app, y un botón
"Desmarcar todo" deja la lista limpia para la semana siguiente. El estado es
del **dispositivo** (`localStorage`), no del plan: **nada se escribe en
Supabase**, no hay migraciones, no cambia `services/diet.ts` (10 ya carga
`diet_checklist_items`) y no entra ninguna dependencia. La disponibilidad
offline del plan (snapshot) es de 12; aquí solo se garantiza que el tachado
no necesita red.

## In scope

- **Módulo puro** `src/lib/checklist.ts`: `ChecklistKind`,
  `CHECKLIST_STORAGE_PREFIX`, `checklistStorageKey(planId, kind)`,
  `readChecked(planId, kind): Set<string>`, `writeChecked(planId, kind, ids)`,
  `selectChecklist(items, kind)`, `groupByCategoria(items)`,
  `OTROS_LABEL = "Otros"`, tipo `ChecklistGroup`.
- **Hook** `src/hooks/useChecklist.ts(planId, kind)` → `{ checked, toggle,
  clearAll }`.
- **Componentes** `src/components/Checklist.tsx` y
  `src/components/ChecklistItem.tsx` (presentacionales, sin fetching).
- **Modificado** `src/screens/DietScreen.tsx` (única pantalla tocada): dos
  `CollapsibleSection` nuevas —"Qué cocinar" (meal prep + secciones
  `rotacion`) y "Lista de súper"— entre "Suplementos" y "Más del plan";
  `rotacion` deja de listarse entre las colapsables genéricas del final.
- **Tests:** unit (`lib/checklist.test.ts`), hook (`useChecklist.test.tsx`),
  componente (`Checklist.test.tsx`, `ChecklistItem.test.tsx`, extensión de
  `DietScreen.test.tsx`), E2E `e2e/diet-checklists.spec.ts` (solo lectura de
  Supabase; escribe únicamente en el `localStorage` del navegador de prueba).
- Texto de UI en español; touch targets ≥ 44px.

## Out of scope

- Cualquier escritura a Supabase (el tachado **no** es dato del plan, §6);
  cualquier migración SQL, policy RLS o cambio de tipos de fila (09).
- Cambios a `src/services/diet.ts`, `src/hooks/useDietPlan.ts`,
  `src/lib/diet.ts`, `CollapsibleSection`, `Markdown`, `BottomNav` (10).
- Snapshot offline del plan, indicador "sin conexión", comportamiento sin red
  al refrescar sesión (→ `12_diet_offline`). Cambios al service worker.
- Sincronizar el tachado entre dispositivos o entre pestañas (`storage`
  event); limpiar claves de planes archivados (no se leen y pesan bytes).
- Persistir el estado abierto/cerrado de las secciones colapsables (ver open
  item B).
- Editar, reordenar o añadir renglones desde la app; cantidades numéricas o
  catálogo de alimentos (§4).
- Ventana de alimentación, comidas, suplementos, Markdown (10) — no se tocan.

## Requirements (EARS)

**R1 (Ubiquitous):** `lib/checklist.ts#checklistStorageKey(planId, kind)`
shall return exactly `gym:diet:check:<planId>:<kind>` (prefix
`CHECKLIST_STORAGE_PREFIX = "gym:diet:check:"`), and `writeChecked` shall
store under that key a JSON **array of `diet_checklist_items.id`** (uuid
strings) — e.g. `["8f1c…","2ab0…"]`, `[]` when nothing is checked; no other
shape and no other key shall be written.

**R2 (Event-driven):** When the user taps an unchecked row, the system shall
mark it checked (`aria-checked="true"`, text struck through and dimmed) and
persist the updated id set via `writeChecked`; when the user taps a checked
row, the system shall unmark it (`aria-checked="false"`, normal text) and
persist the updated set. Each tap toggles **only** that item.

**R3 (Event-driven):** When `DietScreen` mounts with an active plan (app
reopened, page reloaded, or navigated Hoy → Dieta), the system shall restore
the checked state of each list from `readChecked(plan.id, kind)`, so that a
row checked before the reload is shown checked after it (§8 criterio 4).

**R4 (Unwanted behavior):** If the stored value for a key is absent, is not
valid JSON, is valid JSON but not an array, or is an array containing
non-string entries, then `readChecked` shall return an empty `Set` (for the
first three cases) or a `Set` of only the string entries (last case), never
throw, and log details only via the DEV-only debug channel.

**R5 (Unwanted behavior):** If `localStorage` is unavailable or throws on
access, `getItem` or `setItem` (private mode, blocked site data, quota), then
`readChecked` shall return an empty `Set`, `writeChecked` shall return without
propagating, no error shall surface to the user, and the in-memory state of
`useChecklist` shall keep toggling normally for the rest of the session
(state simply does not survive a reload) — same posture as 08 R13.

**R6 (Event-driven):** When the user taps "Desmarcar todo" of a list, the
system shall unmark every item of **that** list (all rows
`aria-checked="false"`), persist `[]` under that list's key, and leave the
other list's state and key untouched.

**R7 (State-driven):** While no item currently displayed in a list is checked
(count of `items.filter(i => checked.has(i.id))` is 0), that list's
"Desmarcar todo" button shall carry the `disabled` attribute (still visible,
visually dimmed); while at least one displayed item is checked it shall be
enabled. Ids in storage that do not match any displayed item shall not
enable the button.

**R8 (Ubiquitous):** Each row (`ChecklistItem`) shall be a single
`<button type="button" role="checkbox" aria-checked="true|false">` that
spans the full row width, is ≥ 44px tall (`min-h-11`), is operable by
keyboard (Enter/Space) and screen reader, and whose accessible name is
`"<item> · <cantidad>"` when `cantidad` is non-empty and `"<item>"` when
`cantidad` is `null`/blank; the checked state shall be visible both by a mark
in the leading box and by `line-through` + dimmed text on the label.

**R9 (Event-driven):** When the plan has `diet_checklist_items` with `kind =
'meal_prep'`, `DietScreen` shall render a `CollapsibleSection` titled
"Qué cocinar" containing a `Checklist` with those items in ascending
`position` order (the order in which it is convenient to cook, §8
criterio 5), ungrouped.

**R10 (Event-driven):** When the plan has `diet_checklist_items` with `kind =
'super'`, `DietScreen` shall render a `CollapsibleSection` titled "Lista de
súper" containing a `Checklist` grouped by `categoria` via
`groupByCategoria`: groups ordered by the **first appearance** of each
`categoria` in ascending `position`; items inside a group in ascending
`position`; items whose `categoria` is `null` or blank collected in a final
group labelled "Otros" regardless of their `position`; each group with a
`<h3>` heading of its label — except when the **only** group is "Otros", in
which case no heading is shown. Category equality is exact string equality
after `trim()`.

**R11 (Event-driven):** When the plan has `diet_sections` with `kind =
'rotacion'`, `DietScreen` shall render each of them, in ascending `position`,
**inside** the "Qué cocinar" section **below** the meal-prep `Checklist`, as
a direct block (`<h3>{title}</h3>` followed by `<Markdown source={body_md}
/>`), and shall **exclude** them from the trailing "Más del plan" list of
generic collapsibles — a deliberate change to 10 R14/R19, which showed
`rotacion` as a generic collapsible provisionally (10 open item D).

**R12 (Ubiquitous):** The `DietScreen` body order shall be: `MacroSummary` →
`EatingWindow` → "Comidas" → "Suplementos" → "Qué cocinar" → "Lista de súper"
→ "Más del plan" (only `reglas`/`libre` sections). Both checklist
`<details>` shall be **closed by default** and their open state shall not be
persisted anywhere (native `<details>` behaviour only), so they never get in
the way of the daily macros/meals check.

**R13 (Unwanted behavior):** If the plan has no `meal_prep` items **and** no
`rotacion` section, then "Qué cocinar" shall be omitted entirely; if it has
no `meal_prep` items but has a `rotacion` section, "Qué cocinar" shall render
the rotación block only (no empty list, no "Desmarcar todo"); if the plan has
no `super` items, "Lista de súper" shall be omitted entirely; if no
`reglas`/`libre` section remains after excluding `rotacion`, "Más del plan"
shall be omitted.

**R14 (State-driven):** While a plan with id A is displayed, the checked ids
shall be read from and written to A's key only; when a different active plan
B is loaded (new month), the lists shall start from B's key (empty unless
previously used) and A's key shall be left untouched — no cleanup, no
migration of state between plans.

**R15 (Ubiquitous):** The feature shall perform **zero** writes to Supabase
and add **no** query: `src/services/diet.ts` shall remain byte-identical to
10, no file under `supabase/migrations/` shall change, `package.json`
dependencies, `.env.example` and the service-worker rules in
`vite.config.ts` shall be unchanged; `lib/checklist.ts` and `useChecklist`
shall touch only `localStorage`; `Checklist`/`ChecklistItem` shall receive
all data via props (no fetching, no `supabase` import).

**R16 (Ubiquitous):** All new user-facing text shall be Spanish ("Qué
cocinar", "Lista de súper", "Desmarcar todo", "Otros", "<n> de <m>
marcados"); every interactive element (rows, "Desmarcar todo", the
`<summary>` of both sections) shall be ≥ 44px tall.

**R17 (Ubiquitous):** Each `Checklist` shall show, next to "Desmarcar todo",
a live counter "<n> de <m> marcados" where `m` is the number of displayed
items and `n` the number of those currently checked (e.g. "3 de 12
marcados"), updated on every toggle and reset to "0 de 12 marcados" by
"Desmarcar todo".

**R18 (Ubiquitous):** The test suites of 10 shall keep passing; the only
permitted edits to `DietScreen.tsx` are inserting the two new sections in
the position of R12 and filtering `rotacion` out of "Más del plan" (plus
omitting that heading when empty, R13). No other 10 module shall change.

## Acceptance

Domingo en la cocina: Mario abre Dieta, toca "Qué cocinar", ve la lista de
preparaciones en el orden del plan ("1.6 kg · Pechuga: mitad asada en
fajitas, mitad deshebrada en tinga", …); toca un renglón y queda tachado; va
tachando conforme cocina; debajo, la tabla "Rotación de la semana" renderizada
sin `|` crudos. Cierra la app, la reabre: los renglones siguen tachados.
Al terminar toca "Desmarcar todo" (habilitado solo si hay algo marcado) y la
lista queda limpia para el próximo domingo; el contador vuelve a "0 de N
marcados". En el súper, sin datos, abre "Lista de súper": productos agrupados
por "Proteínas", "Despensa", "Frutas y verduras", "Suplementos" (y "Otros" al
final si hay renglones sin categoría), tacha caminando por los pasillos, y
al reabrir la app el tachado sigue ahí (criterio 4). Con el almacenamiento
bloqueado la app abre igual, se puede tachar durante la sesión y no aparece
ningún error. En la base de datos no aparece ninguna fila nueva ni cambia
ninguna existente (criterio 9 sigue vigente). Accesibilidad: cada renglón es
un `checkbox` con `aria-checked` y nombre "<item> · <cantidad>", operable con
teclado; las secciones son `<details>/<summary>` de 10; "Desmarcar todo"
deshabilitado se anuncia como tal; todo ≥ 44px.

## Open items

- **A. Rotación como bloque directo dentro de "Qué cocinar".** Se decide
  renderizar las secciones `rotacion` debajo de la lista de meal prep como
  bloque directo (`<h3>` + Markdown), **no** como un segundo `<details>`
  anidado ni abierto: RF-D5 la describe como parte de la tarea de cocina
  ("Debajo, la rotación"), un `<details>` dentro de otro exige un toque extra
  con las manos mojadas, y la tabla lunes–domingo es corta y ya scrollea en
  horizontal por 10 R15. Si "Qué cocinar" está cerrada, la rotación queda
  oculta con ella — se asume aceptable porque solo se consulta al cocinar.
  Alternativa: `CollapsibleSection` propia abierta por defecto.
- **B. Estado abierto/cerrado no persistido.** Las dos listas arrancan
  cerradas y su apertura es el estado nativo del `<details>` (se pierde al
  salir de `/dieta` o recargar). Si el humano prefiere que "recuerde" la
  apertura dentro de la sesión (Hoy ↔ Dieta), la alternativa es una clave en
  `sessionStorage` leída por `CollapsibleSection`; se deja fuera para no
  tocar 10.
- **C. Agrupación por `categoria` con igualdad exacta (tras `trim()`).** No se
  normalizan mayúsculas ni acentos: "Proteínas" y "proteinas" serían dos
  grupos. Se delega en `upload-diet.mjs` (repo `Gym`) escribir categorías
  consistentes — sugerencia para el humano: que el validador del JSON
  normalice. No es cambio de contrato.
- **D. "Más del plan" se omite si no queda ninguna sección** tras excluir
  `rotacion` (10 R14 no lo definía). Ajuste menor sobre 10; confirmar.
- **E. Contador "<n> de <m> marcados" (R17).** Añadido no pedido por el
  leader; útil en el súper para saber cuánto falta. Quitar si sobra.
- **Sin cambios al contrato entre repos.** Solo se leen tablas de 09; la
  persistencia por `id` uuid asume que un plan nuevo del repo `Gym` llega
  con `diet_plan_id` nuevo (archivar + insertar, 09), con lo que el estado
  viejo simplemente deja de leerse.
