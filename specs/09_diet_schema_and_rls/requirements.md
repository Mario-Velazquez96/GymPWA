# Requirements — 09_diet_schema_and_rls

**Feature:** Esquema SQL versionado + RLS de solo lectura para el plan de dieta (nuevo contrato entre repos)
**Source:** client_requirement_dieta §2 (el agente escribe, la PWA lee), §6 (modelo de datos), §7 (JSON y `upload-diet.mjs` del repo Gym), §8 criterio 9; solution_design §3 (convenciones del modelo), §3.6 (RLS); docs/architecture.md "Data access & security"
**Depends on:** 01_supabase_schema_and_rls

## Purpose

Crear, como SQL versionado en `supabase/migrations/`, las cinco tablas del plan
de dieta de client_requirement_dieta §6 (`diet_plans`, `diet_meals`,
`diet_checklist_items`, `diet_supplements`, `diet_sections`) y las políticas RLS
que las dejan **solo legibles** por su dueño desde la PWA: la escritura queda
reservada a la service key del repo `Gym` (`scripts/upload-diet.mjs`, por
construir allá). Es el **tercer contrato entre repos** (tras los IDs de
ejercicio y las tablas de §3): la PWA lo tipa en `src/lib/types.ts` y ningún
lado lo cambia sin avisar al otro. Esta feature no incluye ninguna pantalla ni
service: eso llega en `10_diet_screen`.

## In scope

- `supabase/migrations/003_diet_schema.sql`: las cinco tablas de §6 con sus
  `check`, `unique` y `on delete cascade` **tal cual**, más un índice único
  parcial que garantiza **un solo plan `active` por usuario**.
- `supabase/migrations/004_diet_rls.sql`: `enable row level security` en las
  cinco tablas + cinco policies `select to authenticated` calcadas de
  `002_rls.sql`; **cero policies de escritura**.
- `src/lib/types.ts`: tipos de fila `DietPlan`, `DietMeal`, `DietChecklistItem`,
  `DietSupplement`, `DietSection` espejando el SQL (adición pura; los tipos
  existentes no cambian).
- `scripts/check-rls.mjs` (script de verificación, no app code): el check anon
  cubre las 5 tablas nuevas; nuevos checks de que un `insert` autenticado en
  `diet_plans` (con el `user_id` propio) y en una tabla hija es **rechazado**
  por RLS; check de que el `select` autenticado responde 200.
- Documentación: anexo `### 3.7 Tablas de dieta` en
  `project-documents/solution_design.md` (DDL + nota de contrato) y
  actualización de `supabase/README.md` (orden de aplicación 003 → 004, checks
  nuevos).

## Out of scope

- Cualquier pantalla, componente, hook o service de dieta (→ `10_diet_screen`,
  `11_diet_checklists`, `12_diet_offline`).
- El JSON `dieta/YYYY-MM.json`, `scripts/upload-diet.mjs` y la skill del agente
  (pertenecen al repo `Gym`, §7). Aquí solo se documenta la dependencia.
- Policies de escritura de cualquier tipo sobre tablas de dieta (RF-D11
  "registro de peso semanal" es fase 2 y, en todo caso, sería otra tabla).
- Datos de prueba/seed de un plan de dieta: el primer plan real lo sube el
  repo `Gym`. Con datos reales en vivo, **ningún** script de este repo inserta
  filas en tablas de dieta.
- Checks adicionales al DDL de §6 (p. ej. `ventana_inicio < ventana_fin`,
  `kcal_objetivo > 0`): la validación semántica la hace `upload-diet.mjs` en el
  repo `Gym`; añadir constraints cambiaría el contrato (ver Open items).

## Requirements (EARS)

**R1 (Ubiquitous):** `supabase/migrations/003_diet_schema.sql` shall define the
tables `diet_plans`, `diet_meals`, `diet_checklist_items`, `diet_supplements`
and `diet_sections` with exactly the columns, types, defaults, `check`,
`unique` and `references … on delete cascade` clauses of
client_requirement_dieta §6 — no column added, renamed or retyped.

**R2 (Ubiquitous):** `diet_plans` shall carry a partial unique index
`diet_plans_one_active_per_user` on `(user_id) where status = 'active'`, so
that a second `active` plan for the same user is rejected by the database.

**R3 (Ubiquitous):** Every child table (`diet_meals`, `diet_checklist_items`,
`diet_supplements`, `diet_sections`) shall be indexed with `diet_plan_id` as
the leading column, satisfied by the btree index that each `unique
(diet_plan_id, …)` constraint of §6 creates — no duplicate index shall be
added.

**R4 (Ubiquitous):** `supabase/migrations/004_diet_rls.sql` shall enable RLS on
all five diet tables.

**R5 (Ubiquitous):** `diet_plans` shall have a select policy
`diet_plans_select` for the `authenticated` role with `using (user_id =
auth.uid())`.

**R6 (Ubiquitous):** `diet_meals`, `diet_checklist_items`, `diet_supplements`
and `diet_sections` shall each have a select policy for the `authenticated`
role that checks ownership through their parent: `exists (select 1 from
diet_plans p where p.id = <child>.diet_plan_id and p.user_id = auth.uid())`.

**R7 (Ubiquitous):** None of the five diet tables shall have any
insert/update/delete policy — `pg_policies` shall list exactly five policies
for them, all with `cmd = 'SELECT'`. Writes happen only with the service key
from the `Gym` repo.

**R8 (Unwanted behavior):** If an unauthenticated (anon, no session) client
selects from any of the five diet tables, then the query shall return zero
rows and no error.

**R9 (Unwanted behavior):** If an authenticated user inserts into `diet_plans`
— even with their **own** `user_id` — then the insert shall be rejected with an
RLS policy violation (HTTP 403 / SQLSTATE `42501`) and no row shall be created
(client_requirement_dieta §8 criterio 9).

**R10 (Unwanted behavior):** If an authenticated user inserts into a child
table (probe: `diet_meals` with a random `diet_plan_id`), then the insert shall
be rejected with an RLS policy violation (`42501`), not with a foreign-key
error — proving RLS denies before any constraint is reached.

**R11 (State-driven):** While a user is authenticated, a `select` on each of
the five diet tables shall succeed (HTTP 200, JSON array) and return only rows
whose plan belongs to `auth.uid()` — including an empty array when the user has
no diet plan.

**R12 (Ubiquitous):** `src/lib/types.ts` shall export `DietPlan`, `DietMeal`,
`DietChecklistItem`, `DietSupplement` and `DietSection` mirroring the SQL
column by column: `uuid`/`text` → `string`, nullable → `| null`, `int` →
`number`, `boolean` → `boolean`, `date` → `"YYYY-MM-DD"` string, `timestamptz`
→ ISO string, `time` → string `"HH:MM:SS"` (as PostgREST serialises it; the UI
trims to `"HH:MM"`), `text[]` → `string[]`, and the `check` enumerations as
string-literal unions (`"active" | "archived"`, `"meal_prep" | "super"`,
`"reglas" | "rotacion" | "libre"`). Existing types shall not change.

**R13 (Ubiquitous):** `scripts/check-rls.mjs` shall cover the five diet tables
in its anon check (R8), add the checks for R9, R10 and R11, distinguish "table
does not exist yet (apply 003/004)" from a real RLS failure, and shall
**never** need cleanup because no probe can create a row.

**R14 (Ubiquitous):** `project-documents/solution_design.md` shall gain a
section `### 3.7 Tablas de dieta` with the DDL of 003, the one-active-per-user
rule, the RLS posture and the cross-repo contract note; `supabase/README.md`
shall document applying `003_diet_schema.sql` then `004_diet_rls.sql` (same
mechanism as 001/002) and the new checks.

**R15 (Ubiquitous):** The feature shall introduce no new dependency, no new
env var, no change to `src/` other than the type additions of R12, and no
code path that writes to any table — the app still writes only `workout_logs`.

## Acceptance

Los dos archivos SQL se aplican en orden (003 → 004) en el proyecto Supabase
sin errores. `node scripts/check-rls.mjs` termina con exit 0 y reporta PASS en:
anon → 0 filas en las 10 tablas; sesión E2E → `insert` en `diet_plans` con su
propio `user_id` rechazado (`42501`); `insert` en `diet_meals` rechazado
(`42501`); `select` autenticado en las 5 tablas → 200 con array. `pg_policies`
lista exactamente 13 policies en `public` (8 de 002 + 5 de 004), ninguna de
escritura sobre tablas de dieta. `pnpm typecheck` en verde con los cinco tipos
nuevos. Los datos reales en vivo (`plans`, `workout_logs`) quedan intactos: la
feature no inserta ni borra nada. El repo `Gym` puede después insertar un plan
con la service key (que ignora RLS) sin desajuste de columnas.

## Open items

1. **Nuevo contrato entre repos (bloqueante para el repo `Gym`, no para esta
   feature).** El DDL de 003 es la referencia contra la que el repo `Gym` debe
   escribir `scripts/upload-diet.mjs` (§7). Cualquier cambio posterior de
   columnas, checks o enumeraciones (`kind`, `status`) es un open item nuevo
   para el humano, igual que §3.
2. **Un solo plan `active` por usuario reforzado con índice (R2).** Es más
   estricto que `plans` (que solo lo dice en prosa, §3.2). Consecuencia
   operativa: `upload-diet.mjs` debe **archivar el plan anterior antes de
   insertar** el nuevo (en ese orden), o el insert falla con violación de
   índice único. Confirmar que el humano quiere esta garantía en la base.
3. **Sin índice adicional en las hijas (R3).** Los `unique (diet_plan_id, …)`
   de §6 ya crean el índice con `diet_plan_id` como columna inicial; añadir
   otro sería un duplicado. Confirmar.
4. **Sin checks semánticos extra.** El DDL se copia tal cual §6; no se añade
   `ventana_inicio < ventana_fin`, `ventana_inicio is null = ventana_fin is
   null` ni `kcal_objetivo > 0`. La validación vive en `upload-diet.mjs`. Si el
   humano prefiere el respaldo en la base, es una línea en 003 y una nota en
   §3.7, pero cambia el contrato.
