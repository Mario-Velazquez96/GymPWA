# review — 11_diet_checklists

**Veredicto: APPROVE** (0 hallazgos bloqueantes · 6 menores/contexto)
**Revisor:** reviewer (solo lectura sobre código; solo se ejecutaron verificaciones)
**Fecha:** 2026-09-11
**Implementación:** `progress/impl_11_diet_checklists.md`
**Spec:** `specs/11_diet_checklists/{requirements,design,tasks}.md` (R1–R18)

La feature puede marcarse `done` en `feature_list.json`. Quedan pendientes del
humano (sección 8) que **no** bloquean el cierre porque dependen de que 09 esté
aplicado en vivo.

## 1. Verificaciones ejecutadas

### `./init.sh` — 3 corridas consecutivas, las 3 exit 0

| Corrida | typecheck | lint | test + coverage | build |
|---|---|---|---|---|
| 1 | ✔ | ✔ | 46 archivos · 667 tests passed | ✔ 16 entradas precache (653.82 KiB) |
| 2 | ✔ | ✔ | 46 archivos · 667 tests passed | ✔ idéntico |
| 3 | ✔ | ✔ | 46 archivos · 667 tests passed | ✔ idéntico |

Sin tests intermitentes: mismo recuento las tres veces. El flake que apareció en
10 no se reprodujo.

### Cobertura de los módulos cambiados (reporte de v8)

| Módulo | Líneas | Umbral del spec |
|---|---|---|
| `src/lib/checklist.ts` | 100 % (branches 95.45 — solo la rama `import.meta.env.DEV`) | ≥ 90 % ✔ |
| `src/hooks/useChecklist.ts` | 100 % (ausente de la tabla = 100 % en las 4 métricas) | ≥ 80 % ✔ |
| `src/components/Checklist.tsx` | 100 % | ≥ 80 % ✔ |
| `src/components/ChecklistItem.tsx` | 100 % | ≥ 80 % ✔ |
| `src/screens/DietScreen.tsx` | 100 % | ≥ 80 % ✔ |

Global: 98.56 % líneas / 92.81 % branches / 100 % funciones — umbral global
(80 %) intacto. Coincide con lo declarado por el implementer.

### Playwright

`npx playwright test e2e/diet-checklists.spec.ts e2e/diet.spec.ts e2e/smoke.spec.ts`
→ **3 passed · 2 skipped · 0 failed** (coincide con el informe).

Los 2 skipped son los dos tests nuevos de 11. El skip es **explícito y honesto,
no un test que pase en falso**: con `--reporter=json` ambos resultados traen
`status: "skipped"` y las anotaciones

```
estado observado en /dieta = error
skip = /dieta resolvió en estado de error (las tablas diet_* de 09 aún no están
       aplicadas en el proyecto en vivo) — este spec necesita un plan de dieta activo
```

Las credenciales E2E sí están en `.env.local` (`E2E_EMAIL`, `E2E_PASSWORD`,
`VITE_SUPABASE_*`), así que no es el skip por credenciales: es el skip por estado
de datos, tomado tras observar la pantalla real.

### `e2e/today.spec.ts` — afirmación del implementer verificada y cierta

- Con timeout por defecto: falla a los **30.0 s** (`Test timeout of 30000ms
  exceeded`, esperando la resolución del día en el recorrido de navegación).
- Con `--timeout=180000`: **pasa en 34.7 s** (suite 36.7 s).

**No es regresión de 11.** 11 no toca `TodayScreen.tsx` (mtime 06:39) ni
`e2e/today.spec.ts` (mtime 2026-08-31); todo lo escrito en la sesión de 11 es
≥ 07:24 (ver §4). Es un test que se acerca al límite conforme avanza el mes del
plan. `e2e/logging.spec.ts` y `e2e/history.spec.ts` siguen rojos por el bug
preexistente de kg/lb, ya registrado como `13_fix_lb_prefill_validation`.

## 2. Trazabilidad R → evidencia (verificada leyendo cada test)

| R | Evidencia | ¿Lo ejercita de verdad? |
|---|---|---|
| R1 | `lib/checklist.test.ts`: "compone exactamente gym:diet:check:<planId>:<kind>"; round-trip que afirma el raw exacto `'["a","b"]'`; `Object.keys(localStorage)` == solo esa clave | Sí: cambiar prefijo, separador o shape rompe el test |
| R2 | `ChecklistItem.test.tsx` (click → `onToggle` exactamente 1×), `useChecklist.test.tsx` (marca/desmarca con raw tras cada llamada), `DietScreen.test.tsx` (toque → `'["s2"]'`) | Sí |
| R3 | `useChecklist.test.tsx` ("arranca con los ids ya guardados"), `DietScreen.test.tsx` (unmount + remount → sigue `aria-checked="true"`) | Sí |
| R4 | `lib/checklist.test.ts` describe "valores corruptos": `"{"`, `"{}"`, `"\"x\""`, `"42"`, `""` → Set vacío; `'[1,null,"a",{},true,"b"]'` → `Set{"a","b"}`; + `useChecklist.test.tsx` con valor corrupto | Sí, tabla completa |
| R5 | `lib/checklist.test.ts` describe "almacenamiento hostil": `getItem` que lanza, `setItem` que lanza, `localStorage` `undefined`, getter que lanza (con restauración); `useChecklist.test.tsx` describe "almacenamiento bloqueado" | Sí: los 4 caminos del design |
| R6 | `Checklist.test.tsx` (`onClearAll`), `useChecklist.test.tsx` (`"[]"` + otra lista intacta), `DietScreen.test.tsx` (súper `"[]"` y `meal_prep` sigue `'["m2"]'`) | Sí |
| R7 | `Checklist.test.tsx` (deshabilitado con set vacío, deshabilitado con id ajeno "fantasma", habilitado con id presente), `DietScreen.test.tsx` | Sí, incluido el id que no está en la lista |
| R8 | `ChecklistItem.test.tsx`: rol `checkbox`, `aria-checked`, nombre "<item> · <cantidad>", nombre sin cantidad (`null`, `""`, `"   "`), `line-through` solo si marcado, `min-h-11` + `w-full`, Enter y Space | Sí |
| R9 | `lib/checklist.test.ts` (`selectChecklist` filtra, ordena, no muta), `Checklist.test.tsx` (orden recibido), `DietScreen.test.tsx` con fixture desordenado a propósito | Sí |
| R10 | `lib/checklist.test.ts` (7 casos de `groupByCategoria`), `Checklist.test.tsx` (`<h3>` en orden de 1ª aparición, "Otros" último, único grupo null sin `<h3>`), `DietScreen.test.tsx` (4 grupos) | Sí |
| R11 | `DietScreen.test.tsx`: `heading.closest("details")` === "Qué cocinar", `compareDocumentPosition` tras el último checkbox, `<table>` sin `|` crudos, ausente de "Más del plan" | Sí (ver hallazgo menor 4) |
| R12 | `DietScreen.test.tsx`: orden DOM Suplementos → Qué cocinar → Lista de súper → Más del plan, y `details.open === false` en ambas | Sí |
| R13 | `DietScreen.test.tsx` describe "omisiones" (5 variantes, incluida "sin plan no se escribe ninguna clave") | Sí |
| R14 | `lib/checklist.test.ts` (planes independientes), `useChecklist.test.tsx` (2 casos de `rerender`), `DietScreen.test.tsx` (plan B limpio, clave de A intacta) | Sí |
| R15 | `lib/checklist.test.ts` describe "no abre superficie de escritura" (4 módulos sin `@/lib/supabase` ni `@/services/`; `services/diet.ts` sin `insert/update/delete/upsert/rpc`; un único `setItem`, con la clave del prefijo) + verificación propia (§4) | Sí |
| R16 | `Checklist.test.tsx` (`min-h-11` del botón, textos españoles), `ChecklistItem.test.tsx` (`min-h-11`/`w-full`), `CollapsibleSection.test.tsx` de 10 ("el `<summary>` mide al menos 44px") | Sí |
| R17 | `Checklist.test.tsx` (0/3, 2/3, id fantasma no infla el contador), `DietScreen.test.tsx` ("0 de 6" → "1 de 6") | Sí |
| R18 | Suite completa verde ×3 (667 tests) con las 571 previas | Sí, con la desviación documentada (hallazgo menor 3) |

**Ninguna R queda sin test.** No se encontró ninguna aserción vacía ni que
pasaría con el código roto: los casos clave afirman el raw exacto del
`localStorage`, el orden DOM con `compareDocumentPosition` y la pertenencia con
`closest("details")`.

## 3. Robustez de `localStorage` (el corazón de la feature)

Leído `src/lib/checklist.ts` contra el precedente `src/lib/units.ts`: mismo
rigor y un escalón más (units solo lee un string; checklist parsea JSON).

- `storage()` envuelve el **getter** `globalThis.localStorage` en `try/catch` →
  `null` (Safari privado con datos bloqueados lanza ahí). Idéntico a units.
- `readChecked`: todo el cuerpo en `try/catch`, así que cubre `getItem` que
  lanza, `JSON.parse` que lanza y cualquier otro fallo; `raw === null` → vacío;
  no-array → vacío; `filter((v): v is string => …)` descarta entradas no-string.
- `writeChecked`: `setItem` y `JSON.stringify([...ids])` dentro del `try` → una
  cuota excedida o un iterable hostil no propagan.
- Los detalles van a `debugChecklist`, que solo habla en `import.meta.env.DEV`;
  nada llega a la UI. Cero `console.log`.
- El hook acompaña: escritura **en el callback**, nunca en el montaje ni dentro
  del updater (Strict Mode), y re-lectura durante el render al cambiar de plan.

Cada uno de esos caminos tiene test propio (ver R4/R5 arriba).

## 4. Alcance (verificado de forma independiente, no por confianza)

El árbol trae 09/10 sin commitear, así que `git diff` no separa 11 de 10; se
acotó por ventana temporal de la sesión de 11 (`find -newermt`, archivos ≥ 07:24
del 2026-09-11) y por mtimes.

- **Tocados por 11:** `src/lib/checklist.ts(.test.ts)`,
  `src/hooks/useChecklist.ts(.test.tsx)`,
  `src/components/{Checklist,ChecklistItem}.tsx(.test.tsx)`,
  `src/screens/DietScreen.tsx`, `src/screens/DietScreen.test.tsx`,
  `e2e/diet-checklists.spec.ts`, `specs/11_diet_checklists/tasks.md`,
  `progress/impl_11_diet_checklists.md`. Nada más.
- **Intactos:** `src/services/diet.ts` (mtime 09-10 20:19), `src/lib/diet.ts`,
  `src/hooks/useDietPlan.ts`, `CollapsibleSection.tsx`, `Markdown.tsx`,
  `vite.config.ts` (07-20), `.env.example` (07-19), `package.json` (09-10 20:17),
  `supabase/migrations/**`, `TodayScreen.tsx`, `e2e/today.spec.ts`,
  `e2e/diet.spec.ts`. Los archivos de 10 retocados a las 07:07–07:17
  (`App.dieta.test.tsx`, `useNowMinutes.test.tsx`, `TodayScreen.test.tsx`) son
  anteriores a la sesión de 11 y pertenecen al cierre de 10.
- **Dependencias:** `git diff package.json` solo muestra `react-markdown` y
  `remark-gfm`, ambas de 10. Cero deps nuevas en 11, cero env vars, cero
  migraciones.
- **Cero escrituras a Supabase:** ningún módulo nuevo importa `@/lib/supabase`
  ni `@/services/`; el único `setItem` nuevo es el de `checklist.ts`; el E2E no
  usa los helpers de escritura ni pega a `/rest/v1/`. La única tabla que la app
  escribe sigue siendo `workout_logs`.
- **Sin reformateos ajenos:** el diff de 11 no arrastra archivos de 05–08 ni de
  10 salvo `DietScreen.tsx` / `DietScreen.test.tsx`.
- **Repo limpio:** sin temporales versionados (`coverage/`, `dist/`,
  `test-results/` están en `.gitignore`); sin `console.log`, `debugger`, `any`,
  `@ts-ignore` ni `TODO/FIXME` en lo nuevo; sin service key ni variables
  no-`VITE_` en ningún lado.

## 5. Accesibilidad y UX del brief

- Fila = un solo `<button type="button" role="checkbox" aria-checked>` con
  `w-full min-h-11`: toque en cualquier punto de la fila, ≥ 44px, Enter/Space
  nativos, caja visual `aria-hidden`. ✔
- `aria-checked` correcto en ambos estados, con `line-through` y texto atenuado
  al marcar. ✔
- "Desmarcar todo" con `disabled` nativo mientras ningún item **visible** esté
  marcado (un id viejo del storage no lo habilita), atenuado con
  `disabled:text-slate-600`. ✔
- Textos en español: "Qué cocinar", "Lista de súper", "Desmarcar todo", "Otros",
  "<n> de <m> marcados" (contador con `aria-live="polite"`). ✔
- Agrupación por categoría en orden de primera aparición, "Otros" al final y sin
  `<h3>` cuando el único grupo es "Otros". ✔
- Rotación como bloque directo (`<h3>` + `Markdown`) bajo el meal prep, dentro de
  "Qué cocinar" y fuera de "Más del plan" (open item A tal como se resolvió). ✔
- Ambas `<details>` cerradas por defecto y sin persistir la apertura (open item B). ✔

## 6. Tareas `[x]`: muestra amplia contra el código

Se comprobaron **las 12 tareas**, no solo las llamativas. Todas corresponden a
código real salvo el matiz de la 7.2 (hallazgo menor 1):

- **2.1–2.4** (núcleo puro + tests): todos los símbolos existen con la firma del
  design; la tabla de casos del design está completa en el test. ✔
- **3.1–3.2** (hook + 12 casos de `renderHook`): ✔, incluidos `rerender` de plan
  y almacenamiento bloqueado.
- **4.1–4.4** (componentes + tests): ✔, incluido `checklistLabel` con `"  "`.
- **5.1–5.3** (pantalla + tests + test de inspección R15): ✔; los dos
  `useChecklist` están antes de los early returns; el test de inspección existe
  y afirma lo que dice.
- **6.1** (E2E): ✔ viewport 390×844, reintento ≤ 3, doble nivel de skip con
  mensaje, `afterEach` que borra solo `gym:diet:check:*`, comprobación de
  `pageerror` / `console.error`.
- **7.1** (inspección de cierre): cumplida en sustancia con método distinto
  (`find -newermt` en vez de `git diff --stat`), justificado y re-verificado aquí.
- **7.2**: ver hallazgo menor 1. **7.3** (progress file): ✔ y es honesto.

## 7. Hallazgos

### Bloqueantes: ninguno.

### Menores (no impiden cerrar 11)

1. **La tarea 7.2 dice "correr `./init.sh e2e` … verde" y eso no es literalmente
   cierto:** la suite E2E completa está en rojo (3 fallos: `logging` e `history`
   por el bug de kg/lb de `13_fix_lb_prefill_validation`, y `today` por el
   timeout de 30 s). El implementer lo documenta con precisión y ninguno de los
   tres fallos es de 11. Leer la casilla como "E2E de 11 ejecutado; suite
   completa con fallos ajenos documentados".
2. **El E2E propio de 11 nunca se ha ejercitado de verdad** (siempre toma la rama
   del skip mientras 003/004 no estén aplicadas en vivo). La trazabilidad se
   sostiene con Vitest para las 18 R, pero los criterios 4 y 5 del brief no se
   han visto en un navegador real. → Pendiente 1 del humano.
3. **Desviación literal de R18:** se cambiaron dos aserciones de 10 en
   `DietScreen.test.tsx`. Una afirmaba lo contrario de 11 R9 ("no renderiza los
   `diet_checklist_items`") y era contradicción directa del propio spec; la otra
   solo cambió el selector (`querySelector("details")` → `detailsFor(title)`)
   conservando la aserción. Ambas están comentadas en el código y declaradas en
   el progress file. Se acepta: el espíritu de R18 (no regresar 10 en silencio)
   se cumple y las 571 pruebas previas siguen pasando.
4. **R11 "en orden ascendente de `position`" con varias secciones `rotacion`** no
   tiene test directo (el fixture trae una sola). El orden lo garantiza
   `sortByPosition` en `services/diet.ts`, ya probado en 10. Gap teórico.
5. **Micro-nit sin impacto:** en `Checklist.tsx` la key del grupo es
   `group.categoria ?? "__otros"`; una categoría literal `"__otros"` conviviendo
   con renglones sin categoría produciría keys duplicadas de React. Irrelevante
   con los datos reales.
6. **`checklistLabel` vive en `lib/checklist.ts`, no en `ChecklistItem.tsx`**
   como decía el design. El cambio es correcto (evita
   `react-refresh/only-export-components` y es una función pura); se anota para
   que spec y código no diverjan en la lectura futura.

## 8. Pendientes del humano

1. **Aplicar `supabase/migrations/003_diet_schema.sql` y `004_diet_rls.sql`** al
   proyecto Supabase y subir un plan de dieta real desde el repo `Gym`. Después,
   volver a correr `npx playwright test e2e/diet-checklists.spec.ts` para que los
   dos tests de 11 se ejecuten de verdad (criterios 4 y 5).
2. **Checklist manual en el iPhone** (no auto-verificable): tachar con el pulgar
   en la cocina y en el súper, cerrar y reabrir la app → sigue tachado;
   "Desmarcar todo" limpia; en modo avión se puede tachar; en Safari privado con
   datos bloqueados la app abre, se tacha en sesión y no aparece ningún error.
3. **`e2e/today.spec.ts` roza el timeout de 30 s** (confirmado: falla a 30 s,
   pasa en 34.7 s con timeout mayor). Decidir si se sube el timeout de ese test o
   se acota el recorrido de días. Ajeno a 11.
4. **`13_fix_lb_prefill_validation`** sigue rojo en `logging` e `history`. Ajeno a 11.
5. **Sugerencia al repo `Gym`** (open item C): que `upload-diet.mjs` normalice
   `categoria` (mayúsculas/acentos), porque la agrupación usa igualdad exacta
   tras `trim()`. No es cambio de contrato.

## 9. Conclusión

**APPROVE.** La feature cumple el spec: las 18 requirements están trazadas a
tests que las ejercitan de verdad, la persistencia local es tan robusta como el
precedente de 08 (y un poco más), el alcance es exactamente el descrito (cero
Supabase, cero migraciones, cero dependencias, cero archivos ajenos tocados) y
`./init.sh` pasa entero tres veces seguidas. El leader puede marcar
`11_diet_checklists` como `done` en `feature_list.json`.
