# Design — 11_diet_checklists

**Source:** requirements.md de esta feature; client_requirement_dieta RF-D5, RF-D6, §6, §8 criterios 4 y 5; specs/10_diet_screen/design.md (árbol de `DietScreen`, `DietPlanFull`, `CollapsibleSection`, `Markdown`, `sortByPosition`); specs/09_diet_schema_and_rls/design.md (tipos `DietChecklistItem`, `DietSection`); `src/lib/units.ts` y `src/hooks/useExerciseUnit.ts` (08: storage seguro y hook de preferencia por id); `e2e/helpers.ts`

## Approach

Una idea gobierna el diseño, calcada de 08:

> **El tachado es estado del dispositivo, no del plan.** Vive en
> `localStorage` bajo una clave por `(plan.id, kind)`, se lee al montar y se
> escribe best-effort en cada toque. Supabase ni se entera.

Consecuencias:

1. **Sin service ni query nueva.** `getActiveDietPlan()` (10) ya trae
   `diet_checklist_items` ordenados por `position`; 11 solo los **filtra y
   agrupa** en el cliente con funciones puras. `services/diet.ts` queda
   byte-idéntico (R15).
2. **Módulo puro + hook + componentes presentacionales**, misma capa que
   `units.ts` / `useExerciseUnit` / `UnitToggle`: `lib/checklist.ts` no
   importa React ni supabase; `useChecklist` es el único que toca el
   `localStorage` desde React; `Checklist`/`ChecklistItem` reciben todo por
   props (docs/architecture.md layering).
3. **Robustez de storage idéntica a 08 R13:** `try/catch` en **todo** acceso
   (el getter de `globalThis.localStorage` lanza en Safari privado con datos
   bloqueados; `setItem` lanza por cuota), valor corrupto → vacío, escritura
   que nunca propaga (R4, R5).
4. **La pantalla compone, no calcula.** `DietScreen` llama a
   `selectChecklist` / `groupByCategoria` / `useChecklist` y baja props;
   toda la lógica es unit-testeable sin DOM.

Capas tocadas: **lib + hooks + components + screen**. Sin schema/RLS (09),
sin service (10), sin SW (12).

## Persistencia — `src/lib/checklist.ts` (nuevo, puro)

```ts
import type { DietChecklistItem } from "@/lib/types";
import { sortByPosition } from "@/lib/diet";

export type ChecklistKind = DietChecklistItem["kind"];        // "meal_prep" | "super"

/** Prefijo de la clave: `gym:diet:check:<planId>:<kind>` (R1). */
export const CHECKLIST_STORAGE_PREFIX = "gym:diet:check:";

export function checklistStorageKey(planId: string, kind: ChecklistKind): string {
  return `${CHECKLIST_STORAGE_PREFIX}${planId}:${kind}`;
}

/** Detalles solo en consola de desarrollo, nunca en la UI (R4, R5). */
function debugChecklist(...details: unknown[]): void {
  if (import.meta.env.DEV) console.debug("[checklist]", ...details);
}

/** `localStorage` o `null` si no existe o lanza al accederlo (R5). */
function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; }
  catch (thrown: unknown) { debugChecklist("localStorage no accesible:", thrown); return null; }
}

/**
 * Ids marcados de (plan, kind). Sin valor, JSON inválido, no-array o storage
 * que lanza → Set vacío; entradas no-string se descartan (R3, R4, R5).
 */
export function readChecked(planId: string, kind: ChecklistKind): Set<string> {
  try {
    const raw = storage()?.getItem(checklistStorageKey(planId, kind)) ?? null;
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) { debugChecklist("valor no es array:", raw); return new Set(); }
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch (thrown: unknown) {
    debugChecklist("lectura del tachado falló:", thrown);
    return new Set();
  }
}

/** Guarda el set como JSON array, best-effort: un fallo se traga (R1, R5). */
export function writeChecked(planId: string, kind: ChecklistKind, ids: Iterable<string>): void {
  try {
    storage()?.setItem(checklistStorageKey(planId, kind), JSON.stringify([...ids]));
  } catch (thrown: unknown) {
    debugChecklist("escritura del tachado falló:", thrown);
  }
}
```

### Selección y agrupación (puras, R9, R10)

```ts
/** Items de un `kind`, copia ordenada por position asc (idempotente sobre la salida del service). */
export function selectChecklist(items: DietChecklistItem[], kind: ChecklistKind): DietChecklistItem[] {
  return sortByPosition(items.filter((i) => i.kind === kind));
}

export const OTROS_LABEL = "Otros";

export interface ChecklistGroup {
  categoria: string | null;   // null = grupo "Otros"
  label: string;              // categoria trimmed | OTROS_LABEL
  items: DietChecklistItem[]; // position asc
}

/**
 * Agrupa por `categoria` preservando el orden de PRIMERA aparición (la
 * entrada ya viene por position asc); null/blank → grupo final "Otros".
 * Igualdad exacta tras trim() (open item C). [] → [].
 */
export function groupByCategoria(items: DietChecklistItem[]): ChecklistGroup[] {
  const groups = new Map<string, ChecklistGroup>();   // Map conserva orden de inserción
  const otros: DietChecklistItem[] = [];
  for (const item of items) {
    const label = item.categoria?.trim() ?? "";
    if (label === "") { otros.push(item); continue; }
    const g = groups.get(label) ?? { categoria: label, label, items: [] };
    g.items.push(item);
    groups.set(label, g);
  }
  const result = [...groups.values()];
  if (otros.length > 0) result.push({ categoria: null, label: OTROS_LABEL, items: otros });
  return result;
}
```

Tabla de casos que `checklist.test.ts` afirma (R10):

| Entrada (position, categoria, item) | Salida (grupos → items) |
|---|---|
| (1,"Proteínas",Pollo) (2,"Despensa",Arroz) (3,"Proteínas",Huevo) (4,"Suplementos",Creatina) | Proteínas[Pollo,Huevo] · Despensa[Arroz] · Suplementos[Creatina] |
| (1,null,Sal) (2,"Proteínas",Pollo) | Proteínas[Pollo] · **Otros**[Sal] (null va al final aunque sea el primero) |
| (1,"  Despensa ",Arroz) (2,"Despensa",Frijol) | Despensa[Arroz,Frijol] (trim) |
| (1,"",Sal) (2,"   ",Aceite) | Otros[Sal,Aceite] (blank ≡ null) |
| (1,null,Sal) | Otros[Sal] — único grupo (la UI omite el `<h3>`) |
| `[]` | `[]` |

`readChecked`/`writeChecked` — casos (R1, R4, R5): sin clave → `Set{}`;
`"{"` → `Set{}`; `"{}"`/`"\"x\""`/`"42"` → `Set{}`; `'[1,null,"a",{}]'` →
`Set{"a"}`; round-trip `write(["a","b"])` → `read` = `Set{"a","b"}` y el raw
es exactamente `'["a","b"]'`; `write([])` → raw `"[]"`; claves de `kind`
distintos y de `planId` distintos son independientes; `localStorage`
`undefined` (`vi.stubGlobal`) → vacío / no lanza; getter que lanza
(`Object.defineProperty(globalThis, "localStorage", { get() { throw } })`)
→ vacío / no lanza; `getItem` que lanza (`vi.spyOn(Storage.prototype,
"getItem")`) → vacío; `setItem` que lanza → no propaga.

## Hook — `src/hooks/useChecklist.ts` (nuevo)

Mismo esqueleto que `useExerciseUnit` (estado perezoso, re-lectura al cambiar
el id **durante el render**, setter que persiste best-effort):

```ts
export interface ChecklistApi {
  checked: ReadonlySet<string>;
  toggle: (id: string) => void;
  clearAll: () => void;
}

interface ChecklistState { key: string; checked: ReadonlySet<string> }

export function useChecklist(planId: string, kind: ChecklistKind): ChecklistApi {
  const key = checklistStorageKey(planId, kind);
  const [state, setState] = useState<ChecklistState>(() => ({ key, checked: readChecked(planId, kind) }));

  // Plan distinto (nuevo mes) → releer SU clave; la anterior no se toca (R14).
  if (state.key !== key) setState({ key, checked: readChecked(planId, kind) });
  const checked = state.key === key ? state.checked : readChecked(planId, kind);

  const toggle = useCallback((id: string) => {
    const next = new Set(checked);
    if (!next.delete(id)) next.add(id);
    setState({ key, checked: next });
    writeChecked(planId, kind, next);          // best-effort (R2, R5)
  }, [checked, key, planId, kind]);

  const clearAll = useCallback(() => {
    setState({ key, checked: new Set() });
    writeChecked(planId, kind, []);            // persiste "[]" (R6)
  }, [key, planId, kind]);

  return { checked, toggle, clearAll };
}
```

- Se escribe **en el callback**, no dentro del updater de `setState` (Strict
  Mode ejecuta los updaters dos veces) ni en un `useEffect` (escribiría en el
  montaje lo que acaba de leer). Los toques son eventos discretos, así que la
  clausura sobre `checked` está siempre fresca, igual que en 08.
- **No se escribe al montar**: si el storage está bloqueado, nada cambia; si
  está sano, la lectura no genera escritura.
- Sin contexto global: `DietScreen` instancia dos hooks (`meal_prep` y
  `super`) con el mismo `plan.id`.

## Screens / components

### Árbol de `DietScreen` tras 11 (cambios marcados con ►)

```
DietScreen  (src/screens/DietScreen.tsx)                                   R9–R14
  const { loading, error, plan, retry } = useDietPlan()          (10, sin cambios)
  const now = useNowMinutes()                                    (10, sin cambios)
► const mealPrep = plan ? selectChecklist(plan.diet_checklist_items, "meal_prep") : []
► const superItems = plan ? selectChecklist(plan.diet_checklist_items, "super") : []
► const rotacion = plan ? plan.diet_sections.filter(s => s.kind === "rotacion") : []   // ya position asc
► const otras    = plan ? plan.diet_sections.filter(s => s.kind !== "rotacion") : []
► const mealPrepCheck = useChecklist(plan?.id ?? "", "meal_prep")   // hooks siempre en el mismo orden
► const superCheck    = useChecklist(plan?.id ?? "", "super")
  <main … pb-24>
    <h1>Dieta</h1>
    loading / error / !plan  → idénticos a 10 (R16–R18 de 10)
    plan →
      <MacroSummary />  <EatingWindow />  Comidas  <SupplementList />        (10)
►     {(mealPrep.length > 0 || rotacion.length > 0) &&                       (R9, R11, R13)
        <CollapsibleSection title="Qué cocinar">
          {mealPrep.length > 0 &&
            <Checklist title="Qué cocinar" items={mealPrep}
                       checked={mealPrepCheck.checked} onToggle={mealPrepCheck.toggle}
                       onClearAll={mealPrepCheck.clearAll} />}
          {rotacion.map(s => (
            <div key={s.id} className="mt-4">
              <h3 className="font-semibold">{s.title}</h3>
              <Markdown source={s.body_md} />
            </div>))}
        </CollapsibleSection>}
►     {superItems.length > 0 &&                                              (R10, R13)
        <CollapsibleSection title="Lista de súper">
          <Checklist title="Lista de súper" items={superItems} groupByCategoria
                     checked={superCheck.checked} onToggle={superCheck.toggle}
                     onClearAll={superCheck.clearAll} />
        </CollapsibleSection>}
►     {otras.length > 0 &&                                                   (R12, R13)
        <section aria-labelledby="secciones"><h2 id="secciones">Más del plan</h2>
          otras.map(s => <CollapsibleSection title={s.title}><Markdown source={s.body_md} /></CollapsibleSection>)
```

Los hooks `useChecklist` se llaman incondicionalmente (con `""` mientras no
hay plan) para respetar las reglas de hooks; con `planId = ""` leen la clave
`gym:diet:check::<kind>`, que nunca se escribe porque sin plan no se renderiza
ninguna lista. Los dos `useChecklist` se ejecutan **antes** de los early
returns de loading/error/vacío.

**Cambio respecto a 10 (R11, R12):** 10 R14/R19 renderizaba *todas* las
`diet_sections` (incluida `rotacion`) como colapsables al final; 11 filtra
`rotacion` de ese bloque y la muestra bajo el meal prep. El `<h2>Más del
plan</h2>` se omite si no queda ninguna sección (R13, open item D).

**Decisión (open item A): rotación como bloque directo dentro de "Qué
cocinar".** Un `<details>` anidado exigiría un segundo toque en la cocina; la
tabla de 7 filas cabe y ya scrollea horizontalmente por 10 R15; RF-D5 la
define como parte de la misma tarea. Si "Qué cocinar" está cerrada, la
rotación queda dentro — es información de cocina, no de consulta diaria.

### `src/components/Checklist.tsx` (nuevo, presentacional)

```tsx
interface ChecklistProps {
  title: string;                       // nombre accesible del bloque (el <summary> de 10 muestra el visible)
  items: DietChecklistItem[];          // ya filtrados por kind y ordenados por position
  groupByCategoria?: boolean;          // súper: true (R10)
  checked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onClearAll: () => void;
}

export default function Checklist({ title, items, groupByCategoria: grouped = false, checked, onToggle, onClearAll }: ChecklistProps) {
  const total = items.length;
  const done = items.filter((i) => checked.has(i.id)).length;      // solo ids visibles (R7, R17)
  const groups: ChecklistGroup[] = grouped ? groupByCategoria(items) : [{ categoria: null, label: "", items }];
  const showHeadings = grouped && !(groups.length === 1 && groups[0]?.categoria === null);
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-400" aria-live="polite">{done} de {total} marcados</p>
        <button type="button" onClick={onClearAll} disabled={done === 0}
                className="min-h-11 rounded-lg px-4 text-sm font-semibold text-sky-400 disabled:text-slate-600">
          Desmarcar todo
        </button>
      </div>
      {groups.map((g) => (
        <div key={g.categoria ?? "__otros"}>
          {showHeadings && <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">{g.label}</h3>}
          <ul className="divide-y divide-slate-800">
            {g.items.map((item) => (
              <ChecklistItem key={item.id} item={item} checked={checked.has(item.id)} onToggle={onToggle} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- `groupByCategoria` es pura y barata (≤ 40 renglones); llamarla en el render
  no es fetching. Alternativa equivalente: que `DietScreen` pase `groups` ya
  calculados — se elige el flag para que ambas listas tengan la misma prop
  `items`.
- `disabled` nativo: RTL/Playwright lo afirman con `toBeDisabled()` (R7).
- El visible "Qué cocinar"/"Lista de súper" lo pone el `<summary>` del
  `CollapsibleSection` (10); `aria-label={title}` da nombre al `<section>`
  sin duplicar texto en pantalla.

### `src/components/ChecklistItem.tsx` (nuevo, presentacional)

```tsx
interface ChecklistItemProps {
  item: Pick<DietChecklistItem, "id" | "item" | "cantidad">;
  checked: boolean;
  onToggle: (id: string) => void;
}

export function checklistLabel(item: Pick<DietChecklistItem, "item" | "cantidad">): string {
  const cantidad = item.cantidad?.trim() ?? "";
  return cantidad === "" ? item.item : `${item.item} · ${cantidad}`;      // R8
}

export default function ChecklistItem({ item, checked, onToggle }: ChecklistItemProps) {
  return (
    <li>
      <button type="button" role="checkbox" aria-checked={checked} onClick={() => onToggle(item.id)}
              className="flex min-h-11 w-full items-center gap-3 px-2 py-2 text-left">
        <span aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded border ${checked ? "border-sky-400 bg-sky-500 text-slate-950" : "border-slate-500"}`}>
          {checked ? "✓" : ""}
        </span>
        <span className={checked ? "text-slate-500 line-through" : "text-slate-100"}>
          {checklistLabel(item)}
        </span>
      </button>
    </li>
  );
}
```

- **`<button role="checkbox" aria-checked>`** (y no `<input
  type="checkbox">`): un solo elemento cubre toda la fila (toque en cualquier
  punto), Enter y Space lo activan de forma nativa, y `aria-checked` es
  explícito para RTL/Playwright (`getByRole("checkbox", { name })`). La caja
  visual es `aria-hidden`; el nombre accesible es el texto del label →
  "Pechuga de pollo · 1.6 kg" (R8).
- Sin `preventDefault`, sin gestos: un toque = un toggle.

### Flujo de datos

```
services/diet.ts ─getActiveDietPlan()─► useDietPlan ─► DietScreen
                                                          ├ selectChecklist(items,"meal_prep") ─► Checklist (ungrouped)
                                                          ├ selectChecklist(items,"super")     ─► Checklist (groupByCategoria)
                                                          ├ useChecklist(plan.id,"meal_prep") ─► checked/toggle/clearAll ─┐
                                                          ├ useChecklist(plan.id,"super")     ─► … ─────────────────────┤ props
                                                          └ diet_sections(kind="rotacion")    ─► <h3> + Markdown           │
localStorage  ◄─ readChecked / writeChecked (lib/checklist.ts) ◄─ useChecklist ◄────────────────────────────────────────┘
```

Ningún componente hace fetching; ninguna escritura sale del navegador (R15).

## Services

**Ninguna función nueva ni modificada.** `getActiveDietPlan()` (10) ya
devuelve `diet_checklist_items` y `diet_sections` ordenados por `position`;
`selectChecklist` reaplica `sortByPosition` de forma idempotente por
robustez (12 servirá el mismo `DietPlanFull` desde un snapshot). Un test de
inspección afirma que `src/services/diet.ts` no cambió respecto a 10 (R15).

## Schema / RLS

**Sin migración.** Las tablas de 09 no cambian; RLS sigue siendo solo
lectura y la PWA no intenta ninguna escritura. El tachado no es dato del plan
(client_requirement_dieta §6, nota). **No hay cambio al contrato entre
repos.**

## Auth & security

- `/dieta` sigue detrás de `ProtectedRoute`; RLS de 09 acota la lectura al
  dueño. 11 no añade superficie de escritura: la única tabla escrita por la
  app sigue siendo `workout_logs`.
- `localStorage` guarda solo uuids de `diet_checklist_items` bajo claves con
  el `plan.id`: sin tokens, sin datos personales, sin nada que un tercero
  pueda explotar; un valor manipulado a mano solo cambia qué renglones se ven
  tachados (R4 lo neutraliza si está corrupto).
- Sin service key, sin nuevas env vars (R15).

## Validation

No hay entrada de texto del usuario. Robustez de datos:
- `readChecked` valida forma (array de strings) y descarta el resto (R4).
- `cantidad` `null`/blank → sin separador huérfano (R8); `categoria`
  `null`/blank → "Otros" (R10).
- Ids en storage que ya no existen en el plan se ignoran en el contador y en
  el `disabled` (R7); no se limpian (fuera de alcance).
- Sin plan (`planId = ""`) no se renderiza lista alguna y nunca se escribe.

## PWA

**Sin cambios en `vite.config.ts`.** Los módulos nuevos entran en el chunk
lazy de `/dieta` ya precacheado con el shell (10). Nada de la API de Supabase
se cachea en el SW. El tachado funciona sin red por construcción
(`localStorage` únicamente), que es lo que 12 necesita para el criterio 7
("las listas se pueden seguir tachando" en modo avión).

## Dependencias y env

- **Dependencias nuevas:** ninguna. **Env vars nuevas:** ninguna;
  `.env.example` intacto (R15).

## Test approach

**Unit — `src/lib/checklist.test.ts`** (≥ 90 % líneas; es el corazón de los
criterios 4 y 5): `checklistStorageKey` exacta (R1); `readChecked`
/`writeChecked` con toda la lista de casos de la sección Persistencia
—ausente, JSON inválido, no-array, entradas no-string, round-trip con raw
exacto, `[]`, independencia por `kind` y por `planId`, `localStorage`
`undefined`, getter que lanza, `getItem` que lanza, `setItem` que lanza—
(R1, R3, R4, R5, R14); `selectChecklist` filtra por `kind`, ordena por
`position` y no muta la entrada (R9); `groupByCategoria` con la tabla de
casos (R10).

**Hook — `src/hooks/useChecklist.test.tsx`** (`renderHook`, `localStorage`
limpio en `afterEach`): arranca vacío sin clave; arranca con los ids
guardados; `toggle` añade y luego quita, y tras cada llamada el raw de la
clave es el JSON esperado (R2); `clearAll` vacía y escribe `"[]"` (R6);
cambiar `planId` en `rerender` relee la clave nueva y deja la vieja intacta
(R14); con `setItem` que lanza, `toggle` sigue cambiando `checked` en memoria
y no lanza (R5); claves `meal_prep` y `super` del mismo plan no se pisan (R6).

**Component (RTL):**
- `ChecklistItem`: `role="checkbox"` con `aria-checked` según prop; nombre
  accesible "Pechuga de pollo · 1.6 kg" y "Pechuga de pollo" con `cantidad:
  null` y con `cantidad: "  "`; click → `onToggle(id)`; marcado → label con
  clase `line-through`; no marcado → sin ella; `min-h-11` y `w-full` en el
  botón; `checklistLabel` exportada (R2, R8, R16).
- `Checklist`: renderiza N checkboxes en el orden de `items` (R9);
  "Desmarcar todo" `toBeDisabled()` con `checked` vacío y con un id que no
  está en `items`; habilitado con un id presente; click → `onClearAll` (R6,
  R7); contador "0 de 3 marcados" / "2 de 3 marcados" (R17); con
  `groupByCategoria` los `<h3>` aparecen en el orden de primera aparición,
  "Otros" al final, y con un único grupo null no hay `<h3>` (R10); `min-h-11`
  en el botón (R16); texto en español (R16).
- `DietScreen` (extensión del test de 10 con `useDietPlan`/`useNowMinutes`
  mockeados y `localStorage` real de jsdom): fixture con 3 `meal_prep`
  desordenados por `position`, 5 `super` en 3 categorías + 1 sin categoría,
  1 sección `rotacion` y 1 `reglas`:
  - hay dos `<details>` con `<summary>` "Qué cocinar" y "Lista de súper",
    ambos **sin** `open` (R12);
  - al abrir "Qué cocinar": los checkboxes salen en orden de `position`
    (R9); el `<h3>` de la rotación está **después** del último checkbox y
    **dentro** del mismo `<details>` (`compareDocumentPosition` +
    `closest("details")`) y su Markdown no contiene `|` crudo (R11);
  - "Más del plan" contiene solo "Reglas…" y no el título de la rotación
    (R11);
  - orden DOM: Suplementos → Qué cocinar → Lista de súper → Más del plan
    (R12);
  - al abrir "Lista de súper": `<h3>` en orden de primera aparición y
    "Otros" último (R10);
  - click en un checkbox → `aria-checked="true"` y `localStorage[
    gym:diet:check:<plan.id>:super]` = `'["<id>"]'`; desmontar y volver a
    montar → sigue `aria-checked="true"` (R2, R3); "Desmarcar todo" →
    todos `false` y raw `"[]"`, y la clave de `meal_prep` intacta (R6);
  - fixture sin `meal_prep` ni `rotacion` → no existe "Qué cocinar"; sin
    `super` → no existe "Lista de súper"; sin `meal_prep` pero con
    `rotacion` → "Qué cocinar" sin checkboxes ni "Desmarcar todo"; solo
    `rotacion` en `diet_sections` → no existe "Más del plan" (R13);
  - fixture con plan B (otro `id`) tras haber marcado en A → lista limpia y
    la clave de A conserva su valor (R14);
  - los tests de 10 sobre `DietScreen` siguen pasando sin modificar sus
    aserciones (R18).
- **Inspección (R15):** test con `readFileSync` que afirma que
  `src/services/diet.ts` no contiene `insert(|update(|delete(|upsert(|rpc(`
  (ya existe en 10; se mantiene) y que `src/lib/checklist.ts`,
  `src/hooks/useChecklist.ts`, `src/components/Checklist.tsx` y
  `src/components/ChecklistItem.tsx` no importan `@/lib/supabase` ni
  `@/services/`.

**E2E — `e2e/diet-checklists.spec.ts`** (nuevo; **no escribe en Supabase**;
sin `snapshotLogs`/`deleteCreatedLogs`; patrón de `e2e/diet.spec.ts` de 10 y
`helpers.ts`):
- `test.skip(MISSING_CREDENTIALS, SKIP_NO_CREDENTIALS)`; `test.use({
  viewport: { width: 390, height: 844 } })`.
- `login(page)` → click "Dieta" en la nav → esperar a que resuelva
  (`<dl>` de macros | "Aún no tienes un plan de dieta asignado" |
  "Reintentar", con hasta 3 reintentos como en 10).
- **Skip explícito** si no hay plan: `test.skip(await
  page.getByText("Aún no tienes un plan de dieta asignado").isVisible(),
  "No hay plan de dieta activo en la base — este spec necesita uno con lista
  de súper")`; y si no existe el `<summary>` "Lista de súper": `test.skip(…,
  "El plan activo no tiene lista de súper (diet_checklist_items kind=super)")`.
- Flujo (criterio 4): click en el `<summary>` "Lista de súper" → el primer
  `getByRole("checkbox")` dentro de ese `<details>` tiene
  `aria-checked="false"` y "Desmarcar todo" `toBeDisabled()` (R7) → click en
  el checkbox → `aria-checked="true"`, texto con `line-through`
  (`toHaveClass(/line-through/)` sobre el span) y contador "1 de N marcados"
  (R2, R17) → `page.reload()` → volver a abrir el `<details>` → el checkbox
  **con el mismo nombre accesible** sigue `aria-checked="true"` (R3) → click
  "Desmarcar todo" → `aria-checked="false"`, botón `toBeDisabled()`, contador
  "0 de N marcados" (R6, R7) → `page.reload()` → sigue `false` (persistió
  `[]`).
- Criterio 5 (lectura): si hay ≥ 2 `<h3>` en la lista, están en orden
  distinto de vacío y "Otros", si aparece, es el último (R10); si existe
  "Qué cocinar", abrirlo y comprobar que, de haber `<h3>` de rotación, está
  después del último checkbox (R11).
- Limpieza: en `afterEach`, `page.evaluate` borra las claves con prefijo
  `gym:diet:check:` del `localStorage` del navegador de prueba (higiene del
  contexto; no toca la base).
- Recolección de `pageerror` y `console` `error` durante el flujo → vacías.

**Coverage:** ≥ 90 % líneas en `src/lib/checklist.ts`; ≥ 80 % en
`src/hooks/useChecklist.ts`, `src/components/Checklist.tsx`,
`src/components/ChecklistItem.tsx` y `src/screens/DietScreen.tsx`; umbral
global (80 %) intacto.

## Open items / discrepancies

- **A. Rotación como bloque directo dentro de "Qué cocinar"** (no un
  `<details>` anidado ni una sección abierta aparte). Confirmar.
- **B. Apertura de las listas no persistida** (estado nativo del
  `<details>`); alternativa `sessionStorage` en `CollapsibleSection` si se
  quiere recordar dentro de la sesión.
- **C. Agrupación por igualdad exacta tras `trim()`**; sugerir al repo `Gym`
  normalizar `categoria` en `upload-diet.mjs`. Sin cambio de contrato.
- **D. "Más del plan" omitido cuando no queda ninguna sección** tras excluir
  `rotacion` — ajuste sobre 10 R14.
- **E. Contador "<n> de <m> marcados"** — añadido de este spec; quitar si
  sobra.
- **Sin cambios al contrato entre repos**: solo lectura de tablas de 09; el
  estado se indexa por `plan.id` + `diet_checklist_items.id`, así que un plan
  nuevo (archivar + insertar) arranca limpio por construcción.
