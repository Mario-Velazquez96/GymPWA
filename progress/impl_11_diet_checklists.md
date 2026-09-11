# impl — 11_diet_checklists

**Feature:** listas tachables de la pantalla Dieta — "Qué cocinar" (meal prep +
rotación de la semana) y "Lista de súper" (agrupada por categoría), con el
tachado persistido en el dispositivo.
**Spec:** `specs/11_diet_checklists/{requirements,design,tasks}.md` (aprobado;
open items A–E resueltos por el humano con la opción recomendada).
**Estado:** implementación completa, `tasks.md` con **todas** las tareas en
`[x]` (0 pendientes). **No** se marca la feature como `done` — falta el review.

## Decisiones aplicadas (open items A–E)

- **A.** La rotación (`diet_sections.kind = 'rotacion'`) se renderiza como
  bloque directo (`<h3>` + `Markdown`) **dentro** de "Qué cocinar", debajo de
  la lista de meal prep. No es un `<details>` anidado.
- **B.** El estado abierto/cerrado de las dos listas **no** se persiste: es el
  estado nativo del `<details>` de `CollapsibleSection` (10), cerrado por
  defecto.
- **C.** Agrupación por `categoria` con **igualdad exacta tras `trim()`**; ni
  mayúsculas ni acentos se normalizan (hay un test que lo fija como decisión
  consciente y avisa al repo `Gym`).
- **D.** "Más del plan" se **omite** si, tras excluir `rotacion`, no queda
  ninguna sección.
- **E.** El contador "<n> de <m> marcados" **se mantiene**.

## Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/lib/checklist.ts` | Módulo puro: `ChecklistKind`, `CHECKLIST_STORAGE_PREFIX`, `checklistStorageKey`, `readChecked`/`writeChecked` (try/catch en **todo** acceso a `localStorage`), `selectChecklist`, `checklistLabel`, `OTROS_LABEL`, `ChecklistGroup`, `groupByCategoria` |
| `src/lib/checklist.test.ts` | 36 casos: clave exacta, round-trip con raw exacto, corrupción, storage hostil, filtro/orden, tabla completa de agrupación + inspección R15 |
| `src/hooks/useChecklist.ts` | Hook `(planId, kind) → { checked, toggle, clearAll }`; estado perezoso, re-lectura **durante el render** al cambiar de plan, escritura best-effort en el callback |
| `src/hooks/useChecklist.test.tsx` | 12 casos con `renderHook` |
| `src/components/ChecklistItem.tsx` | `<li>` + `<button type="button" role="checkbox" aria-checked>` a ancho completo, `min-h-11`, caja `aria-hidden`, label con `line-through` |
| `src/components/ChecklistItem.test.tsx` | Rol, nombre accesible, teclado, clases táctiles |
| `src/components/Checklist.tsx` | `<section aria-label>` con contador `aria-live`, "Desmarcar todo" (`disabled`) y renglones planos o agrupados |
| `src/components/Checklist.test.tsx` | Orden, contador, `disabled`, grupos, "Otros" al final, lista vacía |
| `e2e/diet-checklists.spec.ts` | E2E del criterio 4 (tachar → recargar → sigue tachado → "Desmarcar todo" → recargar) y del criterio 5 (grupos, rotación bajo el meal prep) |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/screens/DietScreen.tsx` | Dos `useChecklist` antes de los early returns; cálculo de `mealPrep` / `superItems` / `rotacion` / `otrasSecciones`; dos `CollapsibleSection` nuevas entre "Suplementos" y "Más del plan"; "Más del plan" solo con las secciones que **no** son `rotacion` y solo si queda alguna |
| `src/screens/DietScreen.test.tsx` | +18 casos de 11 y **dos aserciones de 10 actualizadas** (ver Desviaciones) |
| `specs/11_diet_checklists/tasks.md` | Tareas marcadas `[x]` |

### Intactos (verificado por `find -newermt` y por inspección)

`src/services/diet.ts`, `src/hooks/useDietPlan.ts`, `src/lib/diet.ts`,
`src/components/{CollapsibleSection,Markdown,MacroSummary,EatingWindow,MealCard,SupplementList,BottomNav}.tsx`,
`src/lib/types.ts`, `supabase/migrations/`, `vite.config.ts`, `.env.example`,
`package.json` / `pnpm-lock.yaml`. **Cero dependencias nuevas, cero env vars
nuevas, cero migraciones, cero escrituras a Supabase.**

## Mapa R → test

| R | Qué exige | Test que lo cubre |
|---|---|---|
| R1 | Clave `gym:diet:check:<planId>:<kind>` y array JSON de ids | `lib/checklist.test.ts` → "compone exactamente gym:diet:check…", "el round-trip conserva los ids y el raw es un array JSON exacto", "no escribe ninguna otra clave" |
| R2 | Un toque marca/desmarca y persiste | `ChecklistItem.test.tsx` ("tocar la fila llama onToggle…"), `useChecklist.test.tsx` ("marca, persiste, desmarca…"), `DietScreen.test.tsx` ("tocar un renglón lo marca y lo guarda en la clave del plan"), `e2e/diet-checklists.spec.ts` step "R2/R17" |
| R3 | Al montar se restaura el tachado | `useChecklist.test.tsx` ("arranca con los ids ya guardados"), `DietScreen.test.tsx` ("al volver a montar la pantalla el renglón sigue tachado"), e2e step "R3: tras recargar la app…" |
| R4 | Valor ausente/corrupto/no-array/entradas no-string | `lib/checklist.test.ts` → describe "readChecked — valores corruptos"; `useChecklist.test.tsx` ("con un valor corrupto arranca vacío") |
| R5 | `localStorage` inaccesible o que lanza | `lib/checklist.test.ts` → describe "almacenamiento hostil" (4 casos: `getItem`, `setItem`, `undefined`, getter que lanza); `useChecklist.test.tsx` → describe "almacenamiento bloqueado" (sigue tachando en memoria) |
| R6 | "Desmarcar todo" limpia **su** lista y persiste `[]` | `Checklist.test.tsx` ("al tocarlo llama onClearAll"), `useChecklist.test.tsx` ("vacía el estado y persiste \"[]\"", "no toca la otra lista"), `DietScreen.test.tsx` ("'Desmarcar todo' limpia SU lista y deja intacta la otra"), e2e step "R6/R7" |
| R7 | `disabled` mientras nada visible esté marcado | `Checklist.test.tsx` (3 casos: vacío, id ajeno, id presente), `DietScreen.test.tsx` ("muestra el contador… y el botón deshabilitado al abrir"), e2e step "R7/R17" |
| R8 | Fila = checkbox ≥44px, nombre `<item> · <cantidad>` | `ChecklistItem.test.tsx` (rol + `aria-checked`, nombre con y sin cantidad, `min-h-11`/`w-full`, Enter/Space), `lib/checklist.test.ts` no aplica; `DietScreen.test.tsx` ("cada renglón cuelga de su grupo y muestra la cantidad") |
| R9 | Meal prep en orden de `position`, sin agrupar | `lib/checklist.test.ts` (`selectChecklist`), `Checklist.test.tsx` ("pinta un checkbox por renglón, en el orden recibido"), `DietScreen.test.tsx` ("pinta la sección cerrada, con el meal prep en orden de position") |
| R10 | Súper agrupado por `categoria`, "Otros" al final | `lib/checklist.test.ts` → describe `groupByCategoria` (7 casos), `Checklist.test.tsx` (h3 en orden, único grupo null sin h3), `DietScreen.test.tsx` ("arranca cerrada y agrupa por categoría…"), e2e step "R10" |
| R11 | Rotación dentro de "Qué cocinar", tras el último renglón, fuera de "Más del plan" | `DietScreen.test.tsx` (3 casos: `closest("details")` + `compareDocumentPosition`, tabla sin pipes crudos, ausente de "Más del plan"), e2e step "R11" |
| R12 | Orden del cuerpo y `<details>` cerrados | `DietScreen.test.tsx` ("respeta el orden Suplementos → Qué cocinar → Lista de súper → Más del plan", `details.open === false` en ambas), e2e step "R12" |
| R13 | Omisiones (sin meal prep, sin rotación, sin súper, sin otras secciones) | `DietScreen.test.tsx` → describe "omisiones de las listas" (5 casos, incluido "sin plan no se pinta ninguna lista ni se escribe ninguna clave") |
| R14 | Estado por plan; plan nuevo arranca limpio | `lib/checklist.test.ts` ("dos planes distintos no se pisan"), `useChecklist.test.tsx` (2 casos de `rerender`), `DietScreen.test.tsx` ("un plan nuevo arranca limpio y no toca la clave del anterior") |
| R15 | Cero escrituras a Supabase, cero deps/env/SW | `lib/checklist.test.ts` → describe "11 no abre ninguna superficie de escritura" (sin `@/lib/supabase` ni `@/services/` en los 4 módulos nuevos; `services/diet.ts` sin `insert/update/delete/upsert/rpc`; un único `setItem`, con la clave del prefijo) + `find -newermt` de cierre |
| R16 | Español y ≥44px | `Checklist.test.tsx` ("es táctil (≥ 44px)", textos "Desmarcar todo"/"n de m marcados"/"Otros"), `ChecklistItem.test.tsx` (`min-h-11`, `w-full`), `CollapsibleSection.test.tsx` de 10 (summary `min-h-11`) |
| R17 | Contador "<n> de <m> marcados" | `Checklist.test.tsx` (3 casos), `DietScreen.test.tsx` ("0 de 6" / "1 de 6"), e2e steps "R7/R17" y "R2/R17" |
| R18 | Las suites de 10 siguen pasando | Suite completa verde (667 tests, 46 archivos); ver Desviaciones para las dos aserciones de 10 que 11 sustituye a propósito |

## Verificación

### `./init.sh` (full) — **VERDE, 3 corridas consecutivas**

```
install → typecheck → lint → test (coverage) → build      ×3, exit = 0 las tres
Test Files  46 passed (46)
Tests      667 passed (667)          (571 de 10 + 96 nuevos)
build      ✓ built in ~0.6 s · precache 16 entradas (653.82 KiB)
```

Se corrió **dos veces seguidas** (más una tercera para capturar cobertura) por
el antecedente de no determinismo de 10: mismo resultado las tres, sin tests
intermitentes.

### Cobertura (módulos cambiados)

| Módulo | Líneas | Umbral del spec |
|---|---|---|
| `src/lib/checklist.ts` | **100 %** (branches 95.45 — solo la rama `import.meta.env.DEV` del log) | ≥ 90 % ✔ |
| `src/hooks/useChecklist.ts` | **100 %** | ≥ 80 % ✔ |
| `src/components/Checklist.tsx` | **100 %** | ≥ 80 % ✔ |
| `src/components/ChecklistItem.tsx` | **100 %** | ≥ 80 % ✔ |
| `src/screens/DietScreen.tsx` | **100 %** | ≥ 80 % ✔ |

Global: 98.56 % líneas / 92.81 % branches / 100 % funciones — umbral global
(80 %) intacto. (El reporter omite de la tabla los archivos al 100 %; por eso
solo `checklist.ts` aparece listado, por su branch del log de DEV.)

### E2E

`npx playwright test diet-checklists.spec.ts diet.spec.ts smoke.spec.ts auth.spec.ts`
→ **5 passed, 2 skipped, 0 failed.**

Los 2 skipped son los dos tests nuevos de `e2e/diet-checklists.spec.ts`. **Se
saltaron de verdad, no pasaron**: el estado observado en `/dieta` fue
`"error"` (anotación `estado observado en /dieta: error`) y el mensaje del
skip, verificado leyendo el reporte JSON, es:

> `/dieta resolvió en estado de error (las tablas diet_* de 09 aún no están
> aplicadas en el proyecto en vivo) — este spec necesita un plan de dieta
> activo`

Es el comportamiento pedido: sin plan activo o en estado de error, el spec se
salta con mensaje explícito. El segundo nivel de skip ("El plan activo no
tiene lista de súper…") existe pero **no se ha ejercitado todavía**.

**Suite E2E completa** (`npx playwright test`): 11 passed · 2 skipped ·
3 failed. Los 3 fallos son **ajenos a 11** y ninguno empeora:

| Spec | Estado | Causa |
|---|---|---|
| `e2e/logging.spec.ts` | falla (igual que antes) | bug preexistente de kg/lb → `13_fix_lb_prefill_validation`. No se tocó. |
| `e2e/history.spec.ts` | falla (igual que antes) | el mismo bug. No se tocó. |
| `e2e/today.spec.ts` | falla por **timeout de 30 s** | el test recorre el plan real día a día en las dos direcciones; con el plan activo (2026-08-29 → 2026-09-27) el recorrido tarda **~35 s**. Re-ejecutado con `--timeout=180000` **pasa en 34.9 s**. No es regresión de 11 (11 no toca `TodayScreen` ni sus helpers): es un test que se ha ido acercando al límite conforme avanza el mes. Se deja anotado para el humano/leader; **no se tocó**. |

`src/screens/TodayScreen.tsx` y `e2e/today.spec.ts` no se modificaron en esta
sesión (verificado con `find -newermt`).

## Desviaciones del spec (para el reviewer)

1. **Dos aserciones de 10 en `DietScreen.test.tsx` tuvieron que cambiar**, pese
   a que R18 pedía no tocarlas. Son contradicciones directas del propio spec de
   11, no laxitud:
   - `"no renderiza los diet_checklist_items, aunque vengan cargados (R19)"`
     afirmaba exactamente lo contrario de 11 R9. Se reemplazó por
     `"renderiza los diet_checklist_items cargados dentro de su lista (11 R9)"`,
     con un comentario que explica la sustitución.
   - `"las secciones se renderizan cerradas y con el Markdown interpretado"`
     tomaba `container.querySelector("details")` (el **primer** `<details>`),
     que ahora es "Qué cocinar" y ya no "Reglas del plan". Se cambió el
     selector por un helper `detailsFor(title)`; **la aserción sigue siendo la
     misma** (cerrado + Markdown interpretado + sin `**`).
   Ninguna otra aserción de 10 se modificó y las 571 pruebas previas siguen
   pasando.
2. **`checklistLabel` vive en `src/lib/checklist.ts`, no en
   `ChecklistItem.tsx`** (el design la ponía ahí). Exportar una función no-
   componente desde un archivo de componente dispara el warning
   `react-refresh/only-export-components` de ESLint, y `pnpm lint` debe quedar
   sin ruido. Como es una función pura sobre un tipo de fila, su sitio natural
   es el módulo puro; `ChecklistItem` la importa. Comportamiento idéntico.
3. **Verificación de cierre con `find -newermt` en vez de `git diff --stat`**:
   el árbol de trabajo ya traía sin commitear todo 09/10 (`package.json`,
   `src/services/diet.ts` untracked, etc.), así que un `git diff` contra `HEAD`
   no distingue lo mío de lo de 10. La lista de archivos tocados en esta sesión
   es exactamente: los 9 nuevos de la tabla + `DietScreen.tsx` +
   `DietScreen.test.tsx` + `specs/11_diet_checklists/tasks.md`.

## Pendientes (cuando 09 esté aplicado en vivo)

1. **Aplicar `supabase/migrations/003_diet_schema.sql` y `004_diet_rls.sql`** al
   proyecto Supabase (pendiente del humano desde 09) y que el repo `Gym` suba
   un plan de dieta real. Hasta entonces `/dieta` resuelve en estado de error y
   **el E2E de 11 nunca se ha ejecutado de verdad**: su flujo (tachar →
   recargar → "Desmarcar todo" → recargar) está escrito y compila, pero solo
   se ha visto tomar la rama del skip. Volver a correr
   `npx playwright test diet-checklists.spec.ts` en cuanto haya plan.
2. **Checklist manual en el iPhone (no auto-verificable, para Mario):**
   - En la cocina: abrir "Qué cocinar", tachar tres renglones con el pulgar,
     cerrar la app desde el selector de apps, reabrir → siguen tachados.
   - En el súper: abrir "Lista de súper", comprobar que los grupos
     ("Proteínas", "Despensa", …, "Otros" al final) ayudan a recorrer pasillos;
     tachar caminando; "Desmarcar todo" al terminar deja "0 de N marcados".
   - En modo avión: las listas se siguen tachando (adelanto del criterio 7; el
     plan en sí lo hará offline 12).
   - En Safari privado / con datos de sitio bloqueados: la app abre, se puede
     tachar durante la sesión y **no** aparece ningún error (solo no sobrevive
     a la recarga).
3. **Sugerencia al repo `Gym`** (open item C): que `upload-diet.mjs` valide y
   normalice `categoria` (mayúsculas/acentos consistentes); si no, dos grafías
   producen dos grupos. No es cambio de contrato, no bloquea nada.
4. **`e2e/today.spec.ts` roza el timeout de 30 s** (ver arriba). Decisión del
   humano/leader: subir el timeout de ese test o acotar el recorrido. Fuera del
   alcance de 11.

## Cierre tras el review (APPROVE, 6 menores)

`progress/review_11_diet_checklists.md`: **APPROVE**, 0 bloqueantes, 6 menores.
Qué se hizo con cada uno:

| # | Menor | Acción |
|---|---|---|
| 1 | La casilla 7.2 de `tasks.md` dice "`./init.sh e2e` … verde" y la suite completa está en rojo por 3 fallos ajenos | **Aplicado.** Se añadió bajo esa tarea una nota con el resultado real: los 2 specs de 11 se ejecutan y **se saltan**; `logging`/`history` fallan por `13_fix_lb_prefill_validation` y `today` por el timeout de 30 s. Solo texto. |
| 2 | El E2E de 11 nunca se ha ejercitado de verdad (siempre toma el skip) | **No aplicable hoy:** depende de que el humano aplique 003/004 y de que el repo `Gym` suba un plan. Ya figura como pendiente 1. |
| 3 | Desviación literal de R18 (dos aserciones de 10 cambiadas) | **Nada que hacer:** el reviewer la acepta; está comentada en el código y declarada arriba como desviación 1. |
| 4 | R11 "en orden asc de `position`" sin test con varias secciones `rotacion` | **Aplicado.** `DietScreen.tsx` reaplica `sortByPosition` a las secciones `rotacion` (misma robustez que `selectChecklist`, sin depender solo del service) y `DietScreen.test.tsx` añade "con varias secciones de rotación las pinta en orden de position asc (R11)" con un fixture desordenado (position 5 antes que 3). |
| 5 | Key de grupo `group.categoria ?? "__otros"` podría colisionar | **Aplicado.** `Checklist.tsx` usa un helper `groupKey()`: `"otros"` para el grupo sin categoría y `` `cat:${categoria}` `` para el resto, así ninguna cadena real puede chocar. |
| 6 | `checklistLabel` vive en `lib/checklist.ts` y no en `ChecklistItem.tsx` como decía el design | **No aplicado a código** (el reviewer da por correcta la ubicación). Tampoco se edita `design.md`: es un artefacto aprobado por el humano y la divergencia ya queda anotada aquí (desviación 2) y en el review. Mover la función de vuelta reintroduciría el warning `react-refresh/only-export-components`. |

### Verificación tras los menores

`./init.sh` (full) **verde**: 46 archivos / **668 tests** (667 + el caso nuevo
de R11), cobertura sin cambios (100 % de líneas en los cinco módulos de la
feature), build OK. Prettier y ESLint limpios.

### Cierre de sesión (AGENTS.md §5)

- `feature_list.json`: `11_diet_checklists` → **`done`** (único cambio; 12 sigue
  en `spec_ready` y 13 en `pending`).
- Resumen de 11 añadido al final de `progress/history.md`, con el pendiente de
  volver a correr `e2e/diet-checklists.spec.ts` cuando 09 esté aplicado en vivo.
- `progress/current.md`: actualizada **solo** la sección "Feature in progress";
  "State", "Project reality", el bloque del bug de producción y
  "Notes / blockers" quedan íntegros.
- Repo limpio: sin temporales versionados, sin `console.log`, sin TODOs, sin
  archivos ajenos reformateados.
