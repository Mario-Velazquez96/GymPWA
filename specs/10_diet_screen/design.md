# Design — 10_diet_screen

**Source:** requirements.md de esta feature; client_requirement_dieta RF-D1–RF-D4, RF-D7–RF-D9, §8; specs/09_diet_schema_and_rls/design.md (tablas, tipos); `src/services/plans.ts` (patrón `Result<T>`), `src/hooks/usePlanDay.ts` (patrón del hook), `src/lib/utils.ts`, `src/components/ProtectedRoute.tsx`, `e2e/helpers.ts`

## Approach

Segunda "rebanada" de lectura de la app, calcada de 03: **tipos → service →
hook → pantalla → componentes**, todo de solo lectura. Tres ideas gobiernan el
diseño:

1. **Una sola consulta anidada.** `getActiveDietPlan()` trae el plan `active`
   con sus cuatro hijas embebidas en un viaje (PostgREST resource embedding);
   el orden por `position` se resuelve en el cliente. 11 y 12 consumen el
   mismo `DietPlanFull` sin tocar el service.
2. **La hora es un input puro.** `getWindowState(plan, meals, nowMinutes)` no
   lee el reloj: recibe minutos desde medianoche. El reloj vive en
   `nowLocalHM()` (zona fija `America/Mexico_City`) y en el hook
   `useNowMinutes` que lo refresca cada 60 s. Así la tabla de casos del
   criterio 2 se prueba con números, sin fake timers ni TZ del runner.
3. **Navegación mínima y central.** `BottomNav` se monta una vez en
   `ProtectedRoute` (que ya inyecta `AppHeader`), así que ninguna pantalla
   sabe de la nav; solo reservan `pb-24`.

Capas tocadas: **UI + services** (sin schema/RLS: 09; sin SW: 12).

## Routing & navigation

### `src/App.tsx`

```tsx
const DietScreen = lazy(() => import("@/screens/DietScreen"));   // code-split
…
<Route path="/dieta" element={
  <ProtectedRoute>
    <Suspense fallback={<LoadingScreen />}>
      <DietScreen />
    </Suspense>
  </ProtectedRoute>
} />
```

`React.lazy` mantiene el bundle de Hoy (camino del gym con datos móviles)
igual que hoy: el renderizador de Markdown solo se descarga al entrar a
`/dieta`, y como `globPatterns: ["**/*.{js,…}"]` el chunk queda **precacheado
por el shell** en la build de producción (lo aprovecha 12). `LoadingScreen` ya
existe (02).

### `src/components/BottomNav.tsx` (nuevo)

```tsx
import { Link, useLocation } from "react-router-dom";

const TABS = [
  { to: "/", label: "Hoy", isActive: (p: string) => !p.startsWith("/dieta") },
  { to: "/dieta", label: "Dieta", isActive: (p: string) => p.startsWith("/dieta") },
] as const;

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Navegación principal"
         className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={to} className="flex-1">
              <Link to={to} aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center justify-center text-base font-semibold
                                ${active ? "text-sky-400 border-t-2 border-sky-400" : "text-slate-400"}`}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- "Hoy" activa en `/`, `/ejercicio/*`, `/historial/*` (todo lo que no es
  dieta): Ejercicio e Historial son contextuales a Hoy (R2).
- `<Link>` de React Router → navegación client-side (R3).
- `index.html`: `<meta name="viewport" content="width=device-width,
  initial-scale=1.0, viewport-fit=cover">` para que `env(safe-area-inset-
  bottom)` tenga valor en iPhone (sin `viewport-fit=cover` es 0 y la barra
  queda bajo el indicador de inicio en modo standalone).

### `src/components/ProtectedRoute.tsx`

```tsx
return (<><AppHeader />{children}<BottomNav /></>);
```

### Padding inferior

`TodayScreen`, `ExerciseScreen`, `HistoryScreen` y `DietScreen`: `<main
className="… p-4 pb-24 …">` (R3). Único cambio en las tres pantallas
existentes (R20).

## Services

### `src/lib/types.ts` (adición)

```ts
/** Plan de dieta con sus hijas embebidas (consulta anidada de services/diet.ts, 10 R4). */
export interface DietPlanFull extends DietPlan {
  diet_meals: DietMeal[];               // orden: position asc
  diet_checklist_items: DietChecklistItem[]; // cargados para 11; 10 no los pinta
  diet_supplements: DietSupplement[];
  diet_sections: DietSection[];
}
```

### `src/services/diet.ts` (nuevo)

```ts
import { supabase } from "@/lib/supabase";
import type { DietPlanFull } from "@/lib/types";
import { sortByPosition } from "@/lib/diet";
import type { Result } from "@/services/plans";   // reutiliza el patrón (R4, R5)

/** Mensaje único de fallo de carga de la pantalla Dieta (R5, R18). */
export const DIET_ERROR_LOAD = "No se pudo cargar la dieta";

export const DIET_SELECT =
  "*, diet_meals(*), diet_checklist_items(*), diet_supplements(*), diet_sections(*)";

function debugDiet(...details: unknown[]): void {
  if (import.meta.env.DEV) console.debug("[diet]", ...details);
}

/**
 * Plan de dieta `active` del usuario con sus cuatro hijas en UNA consulta
 * anidada (RLS acota todo a auth.uid(); el índice único parcial de 09
 * garantiza a lo sumo una fila). `data: null` sin error = sin plan (R17).
 */
export async function getActiveDietPlan(): Promise<Result<DietPlanFull | null>> {
  if (supabase === null) {
    debugDiet("cliente supabase no configurado");
    return { data: null, error: DIET_ERROR_LOAD };
  }
  try {
    const { data, error } = await supabase
      .from("diet_plans")
      .select(DIET_SELECT)
      .eq("status", "active")
      .limit(1);
    if (error !== null) {
      debugDiet("getActiveDietPlan falló:", error);
      return { data: null, error: DIET_ERROR_LOAD };
    }
    const row = ((data ?? []) as DietPlanFull[])[0];
    if (row === undefined) return { data: null, error: null };
    return {
      data: {
        ...row,
        diet_meals: sortByPosition(row.diet_meals ?? []),
        diet_checklist_items: sortByPosition(row.diet_checklist_items ?? []),
        diet_supplements: sortByPosition(row.diet_supplements ?? []),
        diet_sections: sortByPosition(row.diet_sections ?? []),
      },
      error: null,
    };
  } catch (thrown: unknown) {
    debugDiet("getActiveDietPlan lanzó excepción:", thrown);
    return { data: null, error: DIET_ERROR_LOAD };
  }
}
```

**Decisión: orden en el cliente, no `.order("position", { referencedTable })`.**
Razones: (a) la cadena del builder queda `select → eq → limit`, idéntica a
`getActivePlan`, así el stub de test de `plans.test.ts` se reutiliza tal cual;
(b) evita cuatro llamadas `.order(...)` cuyo nombre de opción ha cambiado
entre versiones de supabase-js (`foreignTable` → `referencedTable`), una
dependencia de API que no aporta nada con ≤ 30 filas por plan; (c) el orden
queda garantizado por código unit-testeado (`sortByPosition` es estable:
desempata por `id` para que dos filas con la misma `position` —imposible por
el `unique`— no reordenen entre renders). Los `?? []` son defensivos: PostgREST
devuelve `[]` para embebidos vacíos, pero un `null` no debe romper la UI.

## Hooks

### `src/hooks/useDietPlan.ts` (nuevo)

Mismo esqueleto que `usePlanDay` (clave `#${attempt}`, bandera `active`,
`retry` que incrementa `attempt`), con una sola llamada:

```ts
export interface DietPlanState {
  loading: boolean;                 // R16
  error: string | null;             // R18
  plan: DietPlanFull | null;        // null + !loading + !error = sin plan (R17)
}
export function useDietPlan(): DietPlanState & { retry: () => void };
```

### `src/hooks/useNowMinutes.ts` (nuevo)

```ts
/** Minutos desde medianoche en America/Mexico_City, refrescados cada `intervalMs` (R7, R10). */
export function useNowMinutes(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => parseHM(nowLocalHM()) ?? 0);
  useEffect(() => {
    const id = setInterval(() => setNow(parseHM(nowLocalHM()) ?? 0), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

Sin refetch: el plan viene de `useDietPlan`; solo cambia `now` (R10).

## `src/lib/diet.ts` — lógica pura (nuevo)

```ts
export const DIET_TIME_ZONE = "America/Mexico_City";

/** "HH:MM" actual en America/Mexico_City (R7). `now` inyectable para tests. */
export function nowLocalHM(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DIET_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}
// `hourCycle: "h23"` evita el "24:00" que algunos motores emiten con hour12:false.

/** "HH:MM" | "HH:MM:SS" → minutos desde medianoche; null si no parsea. */
export function parseHM(value: string | null): number | null;

/** "10:00:00" → "10:00"; "10:00" → "10:00" (R11). */
export function formatHora(time: string): string;            // time.slice(0, 5)

/** 0..60 → "n min"; múltiplo de 60 → "h h"; resto → "h h m min" (R11). */
export function formatMinutes(minutes: number): string;

/** Copia ordenada por position asc (desempate por id) — hijas de DietPlanFull (R4). */
export function sortByPosition<T extends { position: number; id: string }>(rows: T[]): T[];

export type WindowState =
  | { kind: "sin_ventana" }
  | { kind: "antes";   opensAt: string; minutesToNext: number; nextMeal: DietMeal | null }
  | { kind: "dentro";  closesAt: string; nextMeal: DietMeal | null }
  | { kind: "despues"; opensAt: string; nextMeal: DietMeal | null };

/** Estado de la ventana para `nowMinutes` (0..1439). Puro (R8, R9). */
export function getWindowState(
  plan: Pick<DietPlan, "ventana_inicio" | "ventana_fin">,
  meals: DietMeal[],
  nowMinutes: number,
): WindowState;
```

Algoritmo de `getWindowState`:

```
inicio = parseHM(plan.ventana_inicio); fin = parseHM(plan.ventana_fin)
if inicio === null || fin === null → { kind: "sin_ventana" }            (R9)
timed = meals.filter(hora !== null).map({ meal, at: parseHM(hora) })
             .filter(at !== null).sort(by at asc, then position asc)
if now < inicio  → next = timed.find(at >= now) ?? null
                   minutesToNext = (next?.at ?? inicio) - now
                   { kind: "antes", opensAt: formatHora(inicio), minutesToNext, nextMeal }
elif now < fin   → next = timed.find(at >= now) ?? null
                   { kind: "dentro", closesAt: formatHora(fin), nextMeal }
else             → { kind: "despues", opensAt: formatHora(inicio), nextMeal: timed[0] ?? null }
```

Tabla de casos (plan 10:00–18:00; comidas Desayuno fuerte 10:00, Comida
14:00, Cena ligera 17:00) — es la tabla que `diet.test.ts` afirma (R8):

| `now`  | kind          | detalle                                        | texto en `EatingWindow`                                             |
|--------|---------------|------------------------------------------------|---------------------------------------------------------------------|
| 00:00  | `antes`       | 600 min, Desayuno fuerte                        | "Fuera de la ventana · faltan 10 h para Desayuno fuerte (10:00)"     |
| 09:00  | `antes`       | 60 min, Desayuno fuerte                         | "… faltan 60 min para Desayuno fuerte (10:00)" (criterio 2)          |
| 09:59  | `antes`       | 1 min                                           | "… faltan 1 min para Desayuno fuerte (10:00)"                        |
| 10:00  | `dentro`      | siguiente Desayuno fuerte (límite inclusivo)    | "Dentro de la ventana · siguiente: Desayuno fuerte (10:00)"          |
| 10:01  | `dentro`      | siguiente Comida                                | "… siguiente: Comida (14:00)"                                        |
| 14:00  | `dentro`      | siguiente Comida                                |                                                                     |
| 17:30  | `dentro`      | sin comidas restantes                           | "Dentro de la ventana · no quedan comidas hoy; cierra a las 18:00"   |
| 18:00  | `despues`     | límite exclusivo → cerrada                      | "Ventana cerrada · próxima comida mañana a las 10:00 (Desayuno fuerte)" |
| 19:00  | `despues`     |                                                 | idem (criterio 2)                                                   |
| 23:59  | `despues`     |                                                 |                                                                     |
| 09:00, sin comidas | `antes` | 60 min, `nextMeal: null`                  | "… faltan 60 min para que abra la ventana"                           |
| 19:00, sin comidas | `despues` | `nextMeal: null`                        | "Ventana cerrada · abre mañana a las 10:00"                          |
| cualquiera, `ventana_inicio: null` | `sin_ventana` |                    | "Este plan no tiene ventana de ayuno"                                |
| 09:00, comida con `hora: null` primero | `antes` | la sin hora se ignora | Desayuno fuerte sigue siendo la siguiente                            |

`formatMinutes`: 0 → "0 min", 5 → "5 min", 59 → "59 min", 60 → "60 min",
61 → "1 h 1 min", 90 → "1 h 30 min", 120 → "2 h", 600 → "10 h" (R11).

## Screens / components

```
DietScreen  (src/screens/DietScreen.tsx)                       R6, R16–R19
  const { loading, error, plan, retry } = useDietPlan()
  const now = useNowMinutes()
  <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-slate-900 p-4 pb-24 text-slate-100">
    <h1>Dieta</h1>
    loading → <p role="status">Cargando dieta…</p>
    error   → <p role="alert">{error}</p> + <button min-h-11>Reintentar</button>
    !plan   → <p>Aún no tienes un plan de dieta asignado</p>
    plan    →
      <p className="text-sm text-slate-400">{plan.name}</p>
      <MacroSummary plan={plan} />                                 (R6)
      <EatingWindow plan={plan} state={getWindowState(plan, plan.diet_meals, now)} />  (R8, R9)
      <section aria-labelledby="comidas"><h2 id="comidas">Comidas</h2>
        plan.diet_meals.map(m => <MealCard meal={m} />) | "Este plan no tiene comidas"    (R12)
      <SupplementList supplements={plan.diet_supplements} />       (R13)
      <section aria-labelledby="secciones"><h2 id="secciones">Más del plan</h2>
        plan.diet_sections.map(s => <CollapsibleSection title={s.title}><Markdown source={s.body_md} /></CollapsibleSection>)  (R14, R15)
```

| Componente (`src/components/`) | Props | Notas |
|---|---|---|
| `MacroSummary.tsx` | `plan: Pick<DietPlan, "kcal_objetivo" \| "proteina_g" \| "carbohidrato_g" \| "grasa_g">` | `<dl className="grid grid-cols-4 gap-2">` con 4 `<div>` (`<dt>` etiqueta pequeña, `<dd>` número grande `text-2xl font-bold` + unidad). Cuatro columnas caben en 358 px útiles con `text-2xl`; no hay scroll horizontal. Es el primer bloque tras el `<h1>` (R6, R19). |
| `EatingWindow.tsx` | `plan: Pick<DietPlan,"ventana_inicio"\|"ventana_fin">`, `state: WindowState` | `<section aria-labelledby="ventana">`, línea 1 "Ventana de alimentación 10:00–18:00" (o "Este plan no tiene ventana de ayuno"), línea 2 el texto de la tabla; color por estado (`dentro` verde, `antes`/`despues` ámbar). Presentacional: **no** lee el reloj (R8, R9). |
| `MealCard.tsx` | `meal: DietMeal` | `<article>` con `<h3>` "Desayuno fuerte · 10:00", línea "1050 kcal · 85 g proteína", `<ul className="list-disc pl-5">` de `items`, `<p>` de `notes` si existe (R12). |
| `SupplementList.tsx` | `supplements: DietSupplement[]` | `<section aria-labelledby="suplementos"><h2>Suplementos</h2>`; grupos `<h3>Recomendados</h3>` / `<h3>No vale la pena</h3>` (solo si tienen elementos); cada `<li>` con `<span role="img" aria-label="Recomendado">✓</span>` verde o `aria-label="No recomendado"` ✕ rojo + `nombre` en negrita, "5 g · Diario, con el café de las 7:00", `nota` en gris (R13). Si no hay suplementos, la sección se omite. |
| `CollapsibleSection.tsx` | `title: string`, `children` | `<details className="rounded-lg bg-slate-800"><summary className="min-h-11 flex items-center px-4 font-semibold cursor-pointer">{title}</summary><div className="px-4 pb-4">{children}</div></details>` sin `open` → cerrado por defecto; nativo = teclado/lector de pantalla gratis (R14). |
| `Markdown.tsx` | `source: string` | Ver abajo (R15). |

Ningún componente hace fetching; todo baja como props (R20).

### `Markdown.tsx` — opción recomendada (open item B)

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ source }: { source: string }) {
  return (
    <div className="text-slate-200 [&_strong]:font-semibold [&_strong]:text-slate-50
                    [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-2
                    [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:px-2 [&_th]:py-1
                    [&_td]:px-2 [&_td]:py-1 [&_tr]:border-b [&_tr]:border-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ table: ({ node, ...props }) => (
          <div className="overflow-x-auto"><table {...props} /></div>) }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
```

- `react-markdown` no usa `dangerouslySetInnerHTML`: construye elementos
  React desde el AST; el HTML crudo del texto se **descarta** por defecto
  (sin `rehype-raw`) → seguro aunque el agente pegue algo raro (R15).
- `remark-gfm` añade tablas, tachado y listas de tareas. Las tablas van
  envueltas en `overflow-x-auto` para la tabla lunes–domingo de `rotacion`.
- Tailwind v4 sin plugin typography: estilos vía variantes arbitrarias
  `[&_tag]:` en el contenedor, sin CSS global.
- Alternativa (si el humano rechaza la dependencia): `Markdown.tsx` con un
  parser propio de tres reglas (`**x**` → `<strong>`, líneas `- `/`1. ` →
  listas, bloques `|…|` → `<table>`), mismo contrato de props y mismos tests;
  el resto del diseño no cambia. El chunk de `/dieta` sería ~1 kB en vez de
  ~40 kB gz.

## Auth & security

`/dieta` va detrás de `ProtectedRoute` (guard = UX); RLS de 09 es la
autorización real: la consulta anidada solo devuelve filas cuyo plan es de
`auth.uid()`, y las hijas embebidas pasan por sus propias policies. **Cero
escrituras**: `services/diet.ts` solo tiene `select`; R4 lo fija y un test lo
afirma por inspección del módulo (`grep` de `insert|update|delete|upsert|rpc`
en `src/services/diet.ts` vacío). La única tabla escrita por la app sigue
siendo `workout_logs`. Sin service key, sin nuevas env vars.

## Validation

No hay entrada del usuario (solo lectura). Robustez de datos: `parseHM`
devuelve `null` ante `hora` mal formada (la comida se ignora en "siguiente
comida", no rompe la pantalla); campos nulos (`kcal`, `dosis`, `notes`) se
omiten sin dejar separadores huérfanos (" · " solo entre partes presentes);
hijas `null` se normalizan a `[]` en el service.

## PWA

Sin cambios en `vite.config.ts`: el chunk lazy de `/dieta` (pantalla +
renderizador) entra en `globPatterns` y se **precachea** como parte del shell
en producción; las respuestas de `/rest/v1/diet_*` **no** se cachean en el SW
(regla de `docs/architecture.md`; el snapshot a nivel app es de 12). Manifest
intacto.

## Dependencias y env

- **Nuevas (condicionadas a open item B):** `react-markdown` (^10) y
  `remark-gfm` (^4), `dependencies` de producción. Sin `@types` (ambas traen
  tipos). Sin `rehype-raw`.
- **Env vars:** ninguna nueva; `.env.example` intacto (R21).

## Test approach

**Unit — `src/lib/diet.test.ts`** (≥ 90 % líneas; es el corazón del criterio 2):
- `nowLocalHM(new Date("2026-09-10T15:00:00Z"))` → `"09:00"` (CDMX = UTC−6,
  sin horario de verano desde 2022) y `new Date("2026-09-11T05:59:00Z")` →
  `"23:59"` (no "24:xx", no cambia de día) (R7).
- `parseHM`: `"10:00:00"` → 600, `"10:00"` → 600, `"x"`/`null` → null.
- `formatHora`, `formatMinutes` con la tabla exacta de R11.
- `sortByPosition`: desordenado → ordenado, no muta la entrada, estable.
- `getWindowState`: **toda** la tabla de casos del design (00:00, 09:00,
  09:59, 10:00, 10:01, 14:00, 17:30, 18:00, 19:00, 23:59, sin comidas ×2,
  `ventana_inicio: null`, `ventana_fin: null`, comida con `hora: null`,
  comida con `hora` mal formada) (R8, R9).

**Unit — `src/services/diet.test.ts`** (mock del cliente como en
`plans.test.ts`, stub `select → eq → limit`):
- Llama `from("diet_plans")`, `select(DIET_SELECT)`, `eq("status","active")`,
  `limit(1)` **una sola vez** y devuelve las hijas ordenadas por `position`
  aunque lleguen desordenadas; `diet_checklist_items` presentes en el
  resultado (R4, R19).
- `data: []` → `{ data: null, error: null }` (R17).
- Error PostgREST → `DIET_ERROR_LOAD` sin el mensaje crudo; excepción de red →
  idem; `supabase === null` → idem sin llamar `from` (R5).
- Hijas `null` → `[]`.
- Inspección: el código fuente del módulo no contiene `insert(`, `update(`,
  `delete(`, `upsert(`, `rpc(` (R4) — test con `readFileSync` del archivo.

**Hooks (`renderHook`):**
- `useDietPlan`: loading → data; loading → error → `retry` vuelve a llamar al
  service; sin plan → `plan: null` sin error (R16, R17, R18).
- `useNowMinutes` con `vi.useFakeTimers` + `vi.setSystemTime`: valor inicial;
  avanza 60 s → recalcula; `unmount` → `clearInterval` llamado (R10).

**Component (RTL):**
- `MacroSummary`: 4 `<dt>` con las etiquetas y 4 `<dd>` con "2000 kcal",
  "160 g", "195 g", "65 g" (R6).
- `EatingWindow`: un caso por `kind` (+ variantes `nextMeal: null`) con el
  texto exacto de la tabla; `sin_ventana` (R8, R9).
- `MealCard`: con y sin `hora`, `kcal`, `proteina_g`, `notes`; `items` como
  `<li>` (R12).
- `SupplementList`: dos grupos con `aria-label` "Recomendado"/"No
  recomendado", partes nulas omitidas, grupo vacío ausente, lista vacía →
  sección ausente (R13).
- `CollapsibleSection`: `<details>` sin `open`; click en `<summary>` muestra
  el contenido; `summary` con `min-h-11` (R14).
- `Markdown`: `"**Proteína** primero"` → `<strong>` y sin `**` en el texto;
  lista → `<ul><li>`; tabla GFM → `<table>` dentro de `.overflow-x-auto` y sin
  `|` visibles; `<script>alert(1)</script>` → no hay `<script>` en el DOM
  (R15).
- `BottomNav` (con `MemoryRouter` en `/`, `/ejercicio/x`, `/historial/y`,
  `/dieta`): dos enlaces, `aria-current="page"` en el correcto, `min-h-11`,
  `aria-label` del `<nav>` (R2).
- `ProtectedRoute`: con sesión renderiza `BottomNav` además de `AppHeader`
  y los hijos (R2).
- `DietScreen` (mock de `useDietPlan` y de `useNowMinutes`): estados
  loading/error+retry/vacío/plan; **orden** de las secciones en el DOM
  (`compareDocumentPosition`); `diet_checklist_items` no se pintan; en el
  estado vacío `vi.spyOn(console, "error")`/`"warn"` no se llaman (R16–R19).
- `App`: `/dieta` renderiza `DietScreen` con sesión y redirige a `/login`
  sin sesión (R1).
- `TodayScreen`/`ExerciseScreen`/`HistoryScreen`: aserción de clase `pb-24`
  en `<main>` (R3); suites existentes siguen verdes (R20).

**E2E — `e2e/diet.spec.ts`** (nuevo, **solo lectura**, patrón de
`today.spec.ts`/`helpers.ts`: `test.skip` sin credenciales, tolera plan
presente o ausente, reintenta con "Reintentar" hasta 3 veces ante fallo
transitorio):
- `test.use({ viewport: { width: 390, height: 844 } })` (iPhone) para el
  criterio "sin scroll".
- Sin sesión: `page.goto("/dieta")` → URL termina en `/login` (R1).
- `login(page)` → `getByRole("navigation", { name: "Navegación principal" })`
  visible; link "Hoy" con `aria-current="page"`; click en "Dieta" → URL
  `/dieta`, `<h1>Dieta</h1>`, ahora "Dieta" tiene `aria-current` (R1, R2, R3).
- Recolectar `page.on("pageerror")` y `page.on("console")` tipo `error`
  (ignorando los `"Failed to load resource"` que emite el navegador ante un
  fallo de red transitorio que el spec resuelve con "Reintentar") desde el
  clic hasta que resuelva la pantalla → ambas listas vacías (R17).
- Camino **plan activo**: 4 `<dt>` visibles y `toBeInViewport()` en el
  `<dl>` sin hacer scroll (R6); `EatingWindow` muestra "Ventana de
  alimentación" o "no tiene ventana de ayuno" (R8/R9); si hay comidas, cada
  `<article>` tiene `<h3>` y `<ul>` (R12); si hay suplementos, los grupos
  presentes tienen `aria-label` (R13); si hay secciones, la primera está
  cerrada, se abre al hacer clic y su contenido no contiene `**` ni empieza
  renglones con `|` (R14, R15).
- Camino **sin plan**: texto "Aún no tienes un plan de dieta asignado" y la
  nav sigue visible (R17).
- El spec **no escribe nada** (no hay `snapshotLogs`/`deleteCreatedLogs`).

**Coverage:** ≥ 90 % líneas en `src/lib/diet.ts`; ≥ 80 % en
`src/services/diet.ts`, `src/hooks/useDietPlan.ts`,
`src/hooks/useNowMinutes.ts`, `src/screens/DietScreen.tsx` y cada componente
nuevo; umbral global del repo intacto.

## Open items / discrepancies

- **A. Navegación principal:** barra inferior fija con dos pestañas (Hoy |
  Dieta) montada en `ProtectedRoute`; Historial no es pestaña. Confirmar.
- **B. Markdown:** recomendación `react-markdown` + `remark-gfm` (seguro, sin
  `dangerouslySetInnerHTML`, tablas GFM, aislado en el chunk lazy de
  `/dieta`); alternativa mini-renderizador propio. La tarea "instalar
  dependencia" queda condicionada.
- **C. Zona horaria fija `America/Mexico_City`** en `nowLocalHM` frente a
  los getters locales de `Date` que usa `todayLocalISO()`; se recomienda la
  zona fija (RF-D3 literal + tests deterministas).
- **D. `rotacion` visible como colapsable** hasta que 11 la reubique.
- **Sin cambios al contrato entre repos**: la feature solo lee las tablas de
  09; no hay open item de esquema.
