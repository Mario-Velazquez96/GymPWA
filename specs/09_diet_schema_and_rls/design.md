# Design — 09_diet_schema_and_rls

**Source:** client_requirement_dieta §6 (DDL), §7 (upload-diet.mjs), §8 criterio 9; solution_design §3.2 (regla "un solo plan active"), §3.6; `supabase/migrations/001_schema.sql` y `002_rls.sql` (estilo a calcar); `scripts/check-rls.mjs`; docs/architecture.md "Data access & security"

## Approach

Capa **schema + RLS**, dos archivos SQL numerados que se aplican una sola vez
en orden (003 → 004), con el mismo estilo y encabezados que 001/002. El DDL de
§6 se copia **verbatim** (contrato con el repo `Gym`) y se le añade una sola
pieza estructural: el índice único parcial que hace cumplir "un plan `active`
por usuario". Las policies son la copia exacta del patrón de `002_rls.sql`
(`select to authenticated`, hijas vía `exists` al padre) y **no existe ninguna
policy de escritura**: como las tablas tienen RLS habilitado y ninguna policy
permisiva de `insert`/`update`/`delete`, Postgres rechaza cualquier escritura
del rol `authenticated` con `42501`; la service key del repo `Gym`
(`service_role`) pasa por alto RLS y es la única vía de escritura.

En este repo solo se añaden los tipos TS (adición pura a `types.ts`), la
extensión del script de verificación y la documentación. Cero código de app.

## Schema (`supabase/migrations/003_diet_schema.sql`)

```sql
-- 003_diet_schema.sql — Tablas del plan de dieta (contrato PWA ↔ Gym, 3er contrato).
-- Fuente: project-documents/client_requirement_dieta.md §6 (SQL copiado VERBATIM)
--         + índice único parcial "un solo plan active por usuario" (spec 09, R2).
-- Migración de una sola vez (no idempotente): aplicar UNA vez, después de
-- 002_rls.sql y antes de 004_diet_rls.sql.

-- §6 diet_plans — plan de dieta mensual generado por el agente
create table diet_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id),
  name           text not null,              -- "Recomposición — Septiembre 2026"
  goal           text,                       -- contexto que originó el plan (InBody, actividad)
  start_date     date not null,
  end_date       date not null,
  status         text not null default 'active' check (status in ('active','archived')),
  kcal_objetivo  int not null,
  proteina_g     int not null,
  carbohidrato_g int not null,
  grasa_g        int not null,
  ventana_inicio time,                       -- null = sin ventana de ayuno
  ventana_fin    time,
  created_at     timestamptz not null default now()
);

-- Un solo plan `active` por usuario (R2). Más estricto que `plans` (§3.2 solo
-- lo enuncia): upload-diet.mjs debe archivar el anterior ANTES de insertar.
create unique index diet_plans_one_active_per_user
  on diet_plans (user_id) where status = 'active';

-- §6 diet_meals — comidas del plan, en orden del día
create table diet_meals (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  position      int not null,                 -- orden dentro del día
  title         text not null,                -- "Desayuno fuerte"
  hora          time,                         -- 10:00
  kcal          int,
  proteina_g    int,
  items         text[] not null default '{}', -- componentes con porción, uno por renglón
  notes         text,
  unique (diet_plan_id, position)
);

-- §6 diet_checklist_items — meal prep y lista de súper (listas que se tachan)
create table diet_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  kind          text not null check (kind in ('meal_prep','super')),
  position      int not null,
  categoria     text,                         -- "Proteínas", "Despensa"… (agrupa la lista de súper)
  item          text not null,                -- "Pechuga de pollo"
  cantidad      text,                         -- "1.6 kg" — texto, no número: hay "4 latas" y "al gusto"
  unique (diet_plan_id, kind, position)
);

-- §6 diet_supplements — suplementos (recomendado = false → "no vale la pena")
create table diet_supplements (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  position      int not null,
  nombre        text not null,                -- "Creatina monohidratada"
  dosis         text,                         -- "5 g"
  momento       text,                         -- "Diario, con el café de las 7:00"
  nota          text,                         -- porqué o advertencia
  recomendado   boolean not null default true,-- false = la lista de lo que NO vale la pena
  unique (diet_plan_id, position)
);

-- §6 diet_sections — bloques informativos en Markdown
create table diet_sections (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  position      int not null,
  kind          text not null check (kind in ('reglas','rotacion','libre')),
  title         text not null,
  body_md       text not null,                -- Markdown
  unique (diet_plan_id, position)
);

-- Índices por diet_plan_id (R3): los `unique (diet_plan_id, …)` anteriores ya
-- crean un btree con diet_plan_id como columna inicial, que es el que usan el
-- join anidado de la PWA y las policies de 004. No se añade ninguno más.
```

Notas de diseño:

- **Índice único parcial (R2).** `create unique index … where status =
  'active'` es la forma estándar en Postgres de expresar "a lo sumo uno activo
  por usuario"; los planes `archived` no cuentan. No se aplica retroactivamente
  a `plans` (fuera de alcance, sería un cambio al contrato de §3).
- **Sin índice extra en hijas (R3).** `unique (diet_plan_id, position)` y
  `unique (diet_plan_id, kind, position)` son índices btree con `diet_plan_id`
  como primera columna; sirven para `where diet_plan_id = $1` (la consulta
  anidada de 10 y el `exists` de las policies). Un `create index on diet_meals
  (diet_plan_id)` sería redundante y costaría escritura sin ganar lectura.
- **`time` sin zona.** PostgREST devuelve `"10:00:00"`; la hora es "de reloj de
  pared" en `America/Mexico_City` por convención del contrato (RF-D3). La UI
  (10) recorta a `"HH:MM"`.
- **Ventanas que cruzan medianoche** (`ventana_inicio > ventana_fin`) no se
  contemplan ni en el DDL ni en la UI; lo valida `upload-diet.mjs`.

## RLS (`supabase/migrations/004_diet_rls.sql`)

```sql
-- 004_diet_rls.sql — RLS de SOLO LECTURA en las cinco tablas de dieta.
-- Fuente: specs/09_diet_schema_and_rls/design.md (calcado de 002_rls.sql).
-- Aplicar DESPUÉS de 003_diet_schema.sql. Migración de una sola vez.
--
-- Sin policies de insert/update/delete: la PWA no puede escribir estas tablas
-- (criterio 9 de client_requirement_dieta §8); la service key del repo Gym
-- (upload-diet.mjs) pasa por alto RLS y es la única vía de escritura.

alter table diet_plans           enable row level security;
alter table diet_meals           enable row level security;
alter table diet_checklist_items enable row level security;
alter table diet_supplements     enable row level security;
alter table diet_sections        enable row level security;

create policy diet_plans_select on diet_plans
  for select to authenticated using (user_id = auth.uid());

create policy diet_meals_select on diet_meals
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_meals.diet_plan_id and p.user_id = auth.uid()));

create policy diet_checklist_items_select on diet_checklist_items
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_checklist_items.diet_plan_id and p.user_id = auth.uid()));

create policy diet_supplements_select on diet_supplements
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_supplements.diet_plan_id and p.user_id = auth.uid()));

create policy diet_sections_select on diet_sections
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_sections.diet_plan_id and p.user_id = auth.uid()));
```

Semántica de denegación (idéntica a 01): RLS **filtra** en `select` (anon o
usuario ajeno → `[]`, nunca error, R8/R11) y **rechaza** en escritura (sin
policy permisiva → `42501`, R9/R10). En `INSERT`, Postgres evalúa las policies
RLS antes de `ExecConstraints` y de los triggers de FK, por eso el probe de R10
con un `diet_plan_id` aleatorio obtiene `42501` y no `23503`: si llegara a
verse un `23503`, RLS habría dejado pasar la fila y el check debe fallar.

## Types (`src/lib/types.ts`, adición)

```ts
/* ── Plan de dieta (specs/09) — espejan supabase/migrations/003_diet_schema.sql.
   `time` llega de PostgREST como "HH:MM:SS"; la UI recorta a "HH:MM".
   Contrato entre repos (client_requirement_dieta §6): NO cambiar formas sin
   abrir un open item para el humano. Solo lectura desde la app. ── */

/** §6 diet_plans — plan de dieta mensual (solo lectura; lo sube el repo Gym). */
export interface DietPlan {
  id: string;
  user_id: string;
  name: string;
  goal: string | null;
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD"
  status: "active" | "archived";
  kcal_objetivo: number;
  proteina_g: number;
  carbohidrato_g: number;
  grasa_g: number;
  ventana_inicio: string | null; // "HH:MM:SS"; null = sin ventana de ayuno
  ventana_fin: string | null; // "HH:MM:SS"
  created_at: string;
}

/** §6 diet_meals — una comida del plan, en orden del día. */
export interface DietMeal {
  id: string;
  diet_plan_id: string;
  position: number;
  title: string;
  hora: string | null; // "HH:MM:SS"
  kcal: number | null;
  proteina_g: number | null;
  items: string[]; // componentes con porción, uno por renglón
  notes: string | null;
}

/** §6 diet_checklist_items — renglón de meal prep o de lista de súper. */
export interface DietChecklistItem {
  id: string;
  diet_plan_id: string;
  kind: "meal_prep" | "super";
  position: number;
  categoria: string | null; // agrupa la lista de súper
  item: string;
  cantidad: string | null; // texto libre: "1.6 kg", "4 latas", "al gusto"
}

/** §6 diet_supplements — suplemento con dosis/momento; recomendado=false = "no vale la pena". */
export interface DietSupplement {
  id: string;
  diet_plan_id: string;
  position: number;
  nombre: string;
  dosis: string | null;
  momento: string | null;
  nota: string | null;
  recomendado: boolean;
}

/** §6 diet_sections — bloque informativo en Markdown. */
export interface DietSection {
  id: string;
  diet_plan_id: string;
  position: number;
  kind: "reglas" | "rotacion" | "libre";
  title: string;
  body_md: string;
}
```

Se añaden al final del archivo; ningún tipo existente cambia (R12, R15). El
tipo compuesto `DietPlanFull` (plan + hijas embebidas) lo define
`10_diet_screen` junto con el service que lo consume.

## Verification script (`scripts/check-rls.mjs`, extensión)

Mismo archivo, mismas utilidades (`pass`/`fail`/`info`, `parseBody`,
`isMissingTable`, `signIn`), sin dependencias nuevas. Cambios:

```js
const CORE_TABLES = ['exercises', 'plans', 'plan_days', 'plan_exercises', 'workout_logs'];
const DIET_TABLES = ['diet_plans', 'diet_meals', 'diet_checklist_items',
                     'diet_supplements', 'diet_sections'];
const TABLES = [...CORE_TABLES, ...DIET_TABLES];   // check (a) cubre las 10 (R8)

function missingTableMsg(table) {
  const files = DIET_TABLES.includes(table)
    ? '003_diet_schema.sql y luego 004_diet_rls.sql'
    : '001_schema.sql y luego 002_rls.sql';
  return `${table}: la tabla no existe (aún no se aplican las migraciones — pega ${files} en el SQL Editor)`;
}

// (d) 09 R9 — insert en diet_plans con el user_id PROPIO debe ser rechazado.
async function checkDietPlanInsertRejected(url, anonKey, session) {
  POST `${url}/rest/v1/diet_plans` (headers con Bearer de la sesión, Prefer: return=representation)
  body: { user_id: session.userId, name: 'rls-probe (no debe existir)',
          start_date: '2000-01-01', end_date: '2000-01-31',
          kcal_objetivo: 1, proteina_g: 1, carbohidrato_g: 1, grasa_g: 1 }
  201            → FAIL 'el insert en diet_plans fue ACEPTADO — hay una policy de escritura que no debería existir';
                   NO hay cleanup posible desde aquí (tampoco hay policy de delete): el mensaje
                   indica borrar la fila con la service key desde el repo Gym.
  403 | 42501    → PASS
  tabla ausente  → FAIL missingTableMsg('diet_plans')
  otro           → FAIL 'respuesta inesperada (HTTP n)'
}

// (e) 09 R10 — insert en una hija (diet_meals) debe ser rechazado por RLS, no por FK.
async function checkDietChildInsertRejected(url, anonKey, session) {
  POST `${url}/rest/v1/diet_meals`
  body: { diet_plan_id: FOREIGN_USER_ID /* uuid cualquiera */, position: 1, title: 'rls-probe' }
  403 | 42501    → PASS
  23503 (FK)     → FAIL 'RLS dejó pasar la fila hasta el FK — falta bloquear el insert'
  201            → FAIL (igual que (d))
}

// (f) 09 R11 — select autenticado en las 5 tablas de dieta → 200 y array (0..n filas).
async function checkDietAuthenticatedSelect(url, anonKey, session) {
  for (const table of DIET_TABLES) GET `${url}/rest/v1/${table}?select=id&limit=1` con Bearer
    200 + Array → PASS `${table}: select autenticado OK (${n} fila(s) visibles)`
    otro        → FAIL
}

// main(): tras checkOwnInsert(...) añadir, en orden, (d), (e), (f).
```

Ningún probe puede crear una fila (R13): (d) y (e) esperan rechazo y (f) solo
lee. El script sigue sin imprimir valores de `.env.local`.

## Documentation

- **`project-documents/solution_design.md`** — anexar tras §3.6:

  ```markdown
  ### 3.7 Tablas de dieta (contrato PWA ↔ Gym, añadido 2026-09)

  Fuente: `client_requirement_dieta.md` §6. Migraciones
  `supabase/migrations/003_diet_schema.sql` y `004_diet_rls.sql` (repo PWA).
  <DDL de 003 tal cual, incluido el índice único parcial>

  Reglas:
  - **Un solo plan `active` por usuario**, reforzado por el índice
    `diet_plans_one_active_per_user`: `scripts/upload-diet.mjs` (repo Gym)
    archiva el plan anterior **antes** de insertar el nuevo.
  - RLS (`004_diet_rls.sql`): `select` solo donde el plan pertenece a
    `auth.uid()` (hijas vía `exists` al padre); **sin** policies de escritura.
    La PWA solo lee; el repo Gym escribe con la service key.
  - `time` se serializa como "HH:MM:SS" y se interpreta como hora local de
    `America/Mexico_City`. La ventana no cruza medianoche.
  - Este esquema es un contrato entre repos, igual que §3: la PWA lo tipa en
    `src/lib/types.ts` y no se cambia de un lado sin avisar al otro.
  ```

- **`supabase/README.md`** — añadir las filas 3 (`003_diet_schema.sql`, "5
  tablas de dieta + índice único parcial") y 4 (`004_diet_rls.sql`, "RLS + 5
  policies select") a la tabla de migraciones; mismo procedimiento (SQL Editor
  u `npx supabase db push`, ver `progress/impl_01_supabase_schema_and_rls.md`);
  describir los checks (d), (e), (f); actualizar el listado esperado de
  `pg_policies` a **13** policies y el check de contrato de
  `information_schema.columns` para incluir las 5 tablas.

## Auth & security

RLS es toda la autorización (la anon key es pública). Postura de las tablas de
dieta: lectura solo del dueño, escritura solo con service key (jamás presente
en este repo). No cambia nada de `workout_logs` ni de las tablas de §3. Este
repo no ejecuta la DDL: la aplica el humano vía dashboard/CLI (como 001/002).

## Validation

Solo a nivel de base y solo la que dicta §6 (`check` de `status` y `kind`,
`unique`, `not null`, FK con cascada). No se añaden constraints semánticos
(Open item 4): la validación del contenido (macros coherentes, fechas,
`kind` válidos, ventana) vive en `upload-diet.mjs` del repo `Gym`. La app no
escribe estas tablas, así que no hay validación de cliente.

## Test approach

No hay código de app que testear salvo los tipos. La verificación es
operacional + un test de tipos:

1. **Aplicar** 003 y luego 004 en el proyecto Supabase sin errores (R1–R7).
2. **`node scripts/check-rls.mjs`** (R8, R9, R10, R11, R13): exit 0 y PASS en
   (a) ×10 tablas, (b), (c), (d), (e), (f). Sin cleanup: nada se escribe.
3. **`pg_policies`** en el SQL Editor: 13 policies en `public`, 5 de ellas
   sobre tablas `diet_*`, todas `SELECT` (R4–R7). **`pg_indexes`**: existe
   `diet_plans_one_active_per_user` con `WHERE (status = 'active')` (R2) y no
   hay índices duplicados por `diet_plan_id` en las hijas (R3).
4. **Contrato de columnas (R1):** `information_schema.columns` para las 5
   tablas coincide con §6 (o, sin secret key, el mismo probe REST por
   `select=<lista de columnas>` que se usó en 01).
5. **Tipos (R12):** `src/lib/types.test.ts` con `expectTypeOf` de Vitest:
   literales de fila válidos por cada interfaz, `status`/`kind` restringidos a
   sus uniones, `items: string[]`, `hora: string | null`; `pnpm typecheck`
   limpio.
6. **R14/R15:** revisión del anexo §3.7 y del README; `git diff --stat`
   muestra cambios solo en `supabase/migrations/`, `src/lib/types.ts` (+ su
   test), `scripts/check-rls.mjs`, `supabase/README.md`,
   `project-documents/solution_design.md` y `progress/`; `package.json` y
   `.env.example` intactos.

Cobertura: no aplica (sin lógica TS nueva); `./init.sh quick` debe seguir en
verde sin regresiones.

## Open items / discrepancies

- **Nuevo contrato entre repos.** El repo `Gym` debe construir
  `scripts/upload-diet.mjs` contra el DDL de 003 y **archivar antes de
  insertar** por el índice único parcial. Cualquier cambio posterior de
  columnas o enumeraciones es open item.
- **Índice único parcial en `diet_plans`** (más estricto que `plans`) y
  **ausencia de índice extra en hijas**: decisiones de este spec sujetas a
  confirmación del humano.
- **Sin checks semánticos** más allá de §6 (ventana, macros positivos): se
  delega en `upload-diet.mjs`; añadirlos cambiaría el contrato.
