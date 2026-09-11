# Tasks — 11_diet_checklists

> Orden de implementación. Cada tarea cita el/los requisito(s) que satisface.
> Marca `[x]` al completarla. No empieces hasta que el humano apruebe el spec
> y `10_diet_screen` esté `done` (11 se construye sobre `DietScreen`,
> `CollapsibleSection`, `Markdown` y `DietPlanFull` de 10). ⚠️ Datos reales
> en vivo: ningún test ni spec escribe en Supabase; el único almacenamiento
> que se toca es el `localStorage` del navegador de prueba.

## 1. Decisiones previas

- [x] Resolver con el humano los open items A (rotación como bloque directo
      dentro de "Qué cocinar"), B (apertura no persistida), C (agrupación por
      igualdad exacta), D ("Más del plan" omitido si queda vacío) y E
      (contador "n de m marcados") antes de tocar código (R10, R11, R12,
      R13, R17)

## 2. Núcleo puro (sin React)

- [x] Crear `src/lib/checklist.ts`: `ChecklistKind`,
      `CHECKLIST_STORAGE_PREFIX = "gym:diet:check:"`,
      `checklistStorageKey(planId, kind)`, `debugChecklist` solo en DEV,
      `storage()` con `try/catch` en el getter (R1, R5)
- [x] Añadir `readChecked(planId, kind): Set<string>` — sin clave / JSON
      inválido / no-array / storage que lanza → `Set` vacío; entradas
      no-string descartadas — y `writeChecked(planId, kind, ids)` que guarda
      `JSON.stringify([...ids])` best-effort sin propagar (R1, R3, R4, R5)
- [x] Añadir `selectChecklist(items, kind)` (filtro por `kind` +
      `sortByPosition` de `@/lib/diet`, sin mutar), `OTROS_LABEL`, tipo
      `ChecklistGroup` y `groupByCategoria(items)` (orden de primera
      aparición, `trim()`, null/blank → "Otros" al final) (R9, R10)
- [x] **Tests unitarios** `src/lib/checklist.test.ts`: clave exacta (R1);
      `readChecked`/`writeChecked` con todos los casos del design — ausente,
      `"{"`, `"{}"`, `"\"x\""`, `"42"`, `'[1,null,"a",{}]'` → `Set{"a"}`,
      round-trip con raw exacto `'["a","b"]'`, `[]` → `"[]"`, independencia
      por `kind` y por `planId`, `localStorage` `undefined`, getter que lanza,
      `getItem` que lanza, `setItem` que lanza — (R1, R3, R4, R5, R14);
      `selectChecklist` (filtro, orden, inmutabilidad) (R9); tabla completa
      de `groupByCategoria` incluido único grupo "Otros" y `[]` (R10)

## 3. Hook

- [x] Crear `src/hooks/useChecklist.ts` siguiendo `useExerciseUnit`: estado
      perezoso `{ key, checked }`, re-lectura **durante el render** al cambiar
      la clave, `toggle` y `clearAll` que actualizan estado y llaman
      `writeChecked` en el callback (nunca en el montaje ni dentro del
      updater) (R2, R3, R5, R6, R14)
- [x] **Tests de hook** `src/hooks/useChecklist.test.tsx` (`renderHook`,
      `localStorage.clear()` en `afterEach`): vacío sin clave; arranca con
      ids guardados; `toggle` añade/quita y el raw coincide tras cada
      llamada; `clearAll` → `"[]"`; `rerender` con otro `planId` relee y deja
      la clave vieja intacta; `setItem` que lanza → sigue cambiando en
      memoria sin lanzar; `meal_prep` y `super` no se pisan (R2, R3, R5, R6,
      R14)

## 4. Componentes presentacionales

- [x] Crear `src/components/ChecklistItem.tsx`: `<li>` con
      `<button type="button" role="checkbox" aria-checked>` a ancho completo,
      `min-h-11`, caja visual `aria-hidden`, label con `line-through` y
      atenuado cuando está marcado; exportar `checklistLabel(item)` → "<item>
      · <cantidad>" u "<item>" si `cantidad` es null/blank (R2, R8, R16)
- [x] Crear `src/components/Checklist.tsx`: `<section aria-label={title}>`,
      cabecera con contador "<n> de <m> marcados" (`aria-live="polite"`) y
      botón "Desmarcar todo" (`min-h-11`, `disabled` cuando ningún item
      visible está marcado); lista plana o, con `groupByCategoria`, grupos
      con `<h3>` (omitido si el único grupo es "Otros"); una `<ul>` por
      grupo con `ChecklistItem` (R6, R7, R9, R10, R16, R17)
- [x] **Tests de componente** `ChecklistItem.test.tsx`: rol/`aria-checked`,
      nombre accesible con y sin `cantidad` (incluido `"  "`), click →
      `onToggle(id)`, clase `line-through` solo cuando está marcado,
      `min-h-11`/`w-full` (R2, R8, R16)
- [x] **Tests de componente** `Checklist.test.tsx`: orden de checkboxes =
      orden de `items` (R9); "Desmarcar todo" deshabilitado con set vacío y
      con un id ajeno a `items`, habilitado con un id presente, click →
      `onClearAll` (R6, R7); contador "0 de 3" / "2 de 3 marcados" (R17);
      modo agrupado: `<h3>` en orden de primera aparición, "Otros" último,
      sin `<h3>` con un único grupo null (R10); textos en español y
      `min-h-11` (R16)

## 5. Pantalla

- [x] Modificar `src/screens/DietScreen.tsx`: llamar `useChecklist(plan?.id
      ?? "", "meal_prep")` y `useChecklist(plan?.id ?? "", "super")` **antes**
      de los early returns; calcular `mealPrep`, `superItems`, `rotacion`,
      `otras`; insertar tras `SupplementList` la `CollapsibleSection`
      "Qué cocinar" (Checklist si hay items + bloques `<h3>` + `Markdown`
      por cada `rotacion`) y la `CollapsibleSection` "Lista de súper"
      (Checklist con `groupByCategoria`); "Más del plan" solo con `otras` y
      solo si `otras.length > 0`; ambos `<details>` sin `open` (R9, R10,
      R11, R12, R13, R14)
- [x] **Tests de pantalla** (extender `DietScreen.test.tsx` con el fixture
      del design): dos `<details>` cerrados; orden DOM Suplementos → Qué
      cocinar → Lista de súper → Más del plan (R12); meal prep en orden de
      `position` (R9); rotación dentro de "Qué cocinar" y después del último
      checkbox, ausente de "Más del plan", Markdown sin `|` crudo (R11);
      grupos de súper y "Otros" último (R10); click → `aria-checked` +
      clave/raw en `localStorage`; desmontar/montar → persiste (R2, R3);
      "Desmarcar todo" → todos `false`, raw `"[]"`, clave de `meal_prep`
      intacta (R6, R7); variantes de omisión (sin meal_prep+rotacion, sin
      super, meal_prep vacío con rotacion, solo rotacion en secciones)
      (R13); plan B tras marcar en A → limpio y A intacta (R14); las
      aserciones de 10 siguen tal cual (R18)
- [x] **Test de inspección** (`readFileSync`): `src/services/diet.ts` sin
      `insert(|update(|delete(|upsert(|rpc(` (ya existe en 10, se conserva);
      `lib/checklist.ts`, `hooks/useChecklist.ts`, `components/Checklist.tsx`
      y `components/ChecklistItem.tsx` no importan `@/lib/supabase` ni
      `@/services/` (R15)

## 6. E2E (sin escrituras a Supabase)

- [x] Crear `e2e/diet-checklists.spec.ts`: `test.skip` sin credenciales,
      viewport 390×844, login → "Dieta" → esperar resolución con reintento
      ≤ 3; **skip explícito con mensaje** si aparece "Aún no tienes un plan de
      dieta asignado" o si no existe el `<summary>` "Lista de súper"; flujo
      del criterio 4: abrir la lista → primer checkbox `false` y "Desmarcar
      todo" deshabilitado → click → `true` + `line-through` + "1 de N
      marcados" → `reload` → reabrir → mismo nombre accesible sigue `true` →
      "Desmarcar todo" → todos `false`, botón deshabilitado, "0 de N" →
      `reload` → sigue `false`; lectura del criterio 5 (`<h3>` en orden,
      "Otros" último, rotación bajo el meal prep si existe); `pageerror` y
      `console.error` vacíos; `afterEach` borra del `localStorage` del
      navegador las claves `gym:diet:check:*`. Ningún `fetch` a
      `/rest/v1/` desde el spec (R2, R3, R6, R7, R10, R11, R15, R17)

## 7. Cierre

- [x] Verificar por inspección (`git diff --stat`) que `src/services/diet.ts`,
      `supabase/migrations/`, `vite.config.ts`, `.env.example` y
      `package.json` quedaron **sin cambios**, y que fuera de
      `DietScreen.tsx` no se modificó ningún módulo de 10 (R15, R18)
- [x] Correr `./init.sh` (typecheck + lint + test con coverage + build) y
      `./init.sh e2e`; verde; confirmar cobertura ≥ 90 % en
      `src/lib/checklist.ts` y ≥ 80 % en `useChecklist.ts`, `Checklist.tsx`,
      `ChecklistItem.tsx` y `DietScreen.tsx` (todos)
      > Resultado real: `./init.sh` verde (3 corridas). En `./init.sh e2e`, los
      > dos specs de 11 se ejecutan y **se saltan** con mensaje (las tablas
      > `diet_*` de 09 no están aplicadas en vivo); la suite completa tiene 3
      > fallos **ajenos a 11**: `logging`/`history` por
      > `13_fix_lb_prefill_validation` y `today` por rozar el timeout de 30 s.
      > Detalle en `progress/impl_11_diet_checklists.md`.
- [x] Registrar el avance en `progress/impl_11_diet_checklists.md`
      (decisiones A–E, resultados de las corridas, si el E2E se saltó y por
      qué, checklist manual de iPhone: tachar con el pulgar en la cocina y
      en el súper, reabrir la app y ver el tachado, "Desmarcar todo";
      Safari privado / datos bloqueados → la app abre y tacha en sesión)

## Verification

- **Comandos:** `./init.sh` (instala, typecheck, lint, unit + coverage,
  build); `./init.sh e2e` o `pnpm e2e` (Playwright contra `pnpm preview`,
  con `.env.local`); `node scripts/check-rls.mjs` (confirma que las tablas
  `diet_*` siguen sin policies de escritura: nada de 11 depende de ello,
  pero es la evidencia de "cero escrituras").
- **Trazabilidad R → test:**
  R1 → `lib/checklist.test.ts` (clave exacta, raw exacto);
  R2 → `ChecklistItem.test.tsx` (click) + `useChecklist.test.tsx` (toggle +
  raw) + `DietScreen.test.tsx` + `e2e/diet-checklists.spec.ts`;
  R3 → `useChecklist.test.tsx` (arranca con ids guardados) +
  `DietScreen.test.tsx` (desmontar/montar) + e2e (`reload`);
  R4 → `lib/checklist.test.ts` (JSON inválido, no-array, entradas no-string);
  R5 → `lib/checklist.test.ts` (storage `undefined`, getter/`getItem`/
  `setItem` que lanzan) + `useChecklist.test.tsx` (sigue en memoria);
  R6 → `Checklist.test.tsx` (`onClearAll`) + `useChecklist.test.tsx`
  (`"[]"`) + `DietScreen.test.tsx` (otra lista intacta) + e2e;
  R7 → `Checklist.test.tsx` (`toBeDisabled` con set vacío / id ajeno;
  habilitado con id presente) + e2e;
  R8 → `ChecklistItem.test.tsx` (rol, `aria-checked`, nombre accesible,
  `line-through`, `min-h-11`, `w-full`);
  R9 → `lib/checklist.test.ts` (`selectChecklist`) + `Checklist.test.tsx`
  (orden) + `DietScreen.test.tsx` (orden de meal prep);
  R10 → `lib/checklist.test.ts` (tabla de `groupByCategoria`) +
  `Checklist.test.tsx` (`<h3>`, "Otros", único grupo) + `DietScreen.test.tsx`
  + e2e (lectura);
  R11 → `DietScreen.test.tsx` (rotación dentro de "Qué cocinar", tras el
  último checkbox, ausente de "Más del plan") + e2e (lectura);
  R12 → `DietScreen.test.tsx` (orden DOM, `<details>` sin `open`);
  R13 → `DietScreen.test.tsx` (variantes de omisión);
  R14 → `lib/checklist.test.ts` (independencia por `planId`) +
  `useChecklist.test.tsx` (`rerender` con otro plan) + `DietScreen.test.tsx`
  (plan B);
  R15 → test de inspección (sin imports de supabase/services; `diet.ts` sin
  escrituras) + `git diff --stat` del cierre + e2e sin `fetch` a `/rest/v1/`;
  R16 → `ChecklistItem.test.tsx` / `Checklist.test.tsx` (`min-h-11`, textos
  en español) + `CollapsibleSection` de 10 (summary `min-h-11`);
  R17 → `Checklist.test.tsx` (contador) + e2e ("1 de N" / "0 de N");
  R18 → suite de 10 verde sin modificar aserciones + `git diff --stat`.
- **Coverage:** ≥ 90 % líneas en `src/lib/checklist.ts`; ≥ 80 % en
  `src/hooks/useChecklist.ts`, `src/components/Checklist.tsx`,
  `src/components/ChecklistItem.tsx` y `src/screens/DietScreen.tsx`; umbral
  global (80 %) intacto.
- **Manual en el iPhone (registrar en el progress file):** con el plan real,
  tachar tres renglones del súper con el pulgar, cerrar la app desde el
  selector de apps, reabrir → siguen tachados; "Desmarcar todo" limpia; en
  modo avión las listas se siguen tachando (adelanto del criterio 7, que 12
  cierra con el snapshot del plan).
