# supabase/ — Esquema y RLS (contrato entre repos)

Este directorio contiene el SQL versionado de la base de datos. **El repo Git es
la fuente de verdad**: nunca hagas cambios solo en el dashboard sin reflejarlos
aquí. El esquema de tablas es el **contrato con el repo `Gym`** (copiado
verbatim de `project-documents/solution_design.md` §3 y, para la dieta, de
`client_requirement_dieta.md` §6 / `solution_design.md` §3.7) — no lo
modifiques sin acuerdo explícito.

## Migraciones (aplicar EN ORDEN)

| Orden | Archivo                            | Contenido                                                          |
| ----- | ---------------------------------- | ------------------------------------------------------------------ |
| 1     | `migrations/001_schema.sql`        | 5 tablas + índice de `workout_logs` + 3 check constraints          |
| 2     | `migrations/002_rls.sql`           | `enable row level security` en las 5 tablas + 8 policies          |
| 3     | `migrations/003_diet_schema.sql`   | 5 tablas de dieta (`diet_*`) + índice único parcial "un plan active por usuario" |
| 4     | `migrations/004_diet_rls.sql`      | `enable row level security` en las 5 tablas de dieta + 5 policies `select` (ninguna de escritura) |

Son migraciones de **una sola vez** (no idempotentes): aplicarlas dos veces da
error de "already exists", lo cual es esperado. 003 y 004 se aplican con el
mismo mecanismo que 001/002 (ver `progress/impl_01_supabase_schema_and_rls.md`)
y sobre un proyecto que ya tiene 001/002 aplicadas y datos reales: no tocan
ninguna tabla existente.

### Opción A — Dashboard (recomendada)

1. Abre el proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. Pega el contenido completo de `migrations/001_schema.sql` y ejecuta (**Run**).
3. Pega el contenido completo de `migrations/002_rls.sql` y ejecuta.
4. Pega el contenido completo de `migrations/003_diet_schema.sql` y ejecuta.
5. Pega el contenido completo de `migrations/004_diet_rls.sql` y ejecuta.
6. Todas deben terminar sin errores.

### Opción B — Supabase CLI

```sh
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

(La CLI aplica los archivos de `migrations/` en orden por nombre.)

> Nota: este repo solo tiene la **anon key** (pública). La DDL la ejecuta el
> humano vía dashboard/CLI; la service key vive exclusivamente en el repo `Gym`.

## Prerrequisitos y dependencias externas

- **Usuario de Mario (Auth):** se crea **manualmente** en el dashboard
  (Authentication → Users → *Add user*). Ya está creado; sus credenciales de
  prueba van en `.env.local` como `E2E_EMAIL` / `E2E_PASSWORD`.
- **Bucket `exercise-media` y seed de `exercises`:** pertenecen al **repo
  `Gym`** (usa la service key, que pasa por alto RLS). Aquí solo se documenta la
  dependencia — este repo no crea el bucket ni hace el seed.
- **Plan de dieta (`diet_*`):** lo escribe el repo `Gym` con
  `scripts/upload-diet.mjs` (service key) contra el DDL de
  `003_diet_schema.sql`. Como hay un índice único parcial de **un solo plan
  `active` por usuario**, ese script debe **archivar el plan anterior antes de
  insertar** el nuevo. Este repo nunca inserta filas en tablas de dieta.

## Verificación de RLS (denial checks)

Con las migraciones aplicadas, corre desde la raíz del repo:

```sh
node scripts/check-rls.mjs
```

El script lee `.env.local` (nunca imprime los valores) y verifica:

- **(a) 01 R7 / 09 R8:** un cliente anon **sin sesión** hace `select` en las
  10 tablas (5 de §3 + 5 `diet_*`) → debe recibir **0 filas y ningún error**
  (RLS filtra, no falla).
- **(b) 01 R8:** con sesión del usuario E2E, un insert en `workout_logs` con un
  `user_id` **ajeno** → debe ser **rechazado** (violación de la policy
  `with check`).
- **(c) 01 R6:** un insert con el `user_id` **propio** → debe funcionar; la fila
  de prueba se borra al final (cleanup). Si el catálogo `exercises` está vacío
  (seed pendiente en el repo `Gym`), este check se marca como SKIP.
- **(d) 09 R9:** con sesión, un insert en `diet_plans` **con el `user_id`
  propio** → debe ser **rechazado** (`403` / `42501`): no existe policy de
  escritura. Si fuera aceptado (201) es un FAIL y, como tampoco hay policy de
  delete, la fila se borra con la service key desde el repo `Gym`.
- **(e) 09 R10:** un insert en `diet_meals` con un `diet_plan_id` aleatorio →
  rechazado por RLS (`42501`), **no** por FK (`23503`): RLS deniega antes de
  llegar a cualquier constraint.
- **(f) 09 R11:** `select` autenticado en las 5 tablas `diet_*` → `200` y un
  array (vacío mientras no haya plan de dieta; solo filas propias después).

Imprime PASS/FAIL por check y sale con código ≠ 0 si algo falla. Si las tablas
todavía no existen, el script lo distingue con el mensaje "aún no se aplican
las migraciones" (indicando 001/002 o 003/004 según la tabla) en lugar de
reportarlo como fallo de RLS. Ningún check de dieta puede crear una fila: (d) y
(e) esperan rechazo y (f) solo lee; no hay cleanup que hacer.

### Check de contrato (columnas vs. §3 / §3.7)

En el SQL Editor:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('exercises','plans','plan_days','plan_exercises','workout_logs',
                     'diet_plans','diet_meals','diet_checklist_items','diet_supplements','diet_sections')
order by table_name, ordinal_position;
```

El resultado debe coincidir columna por columna con
`project-documents/solution_design.md` §3.1–3.5 y §3.7.

### Listado de policies

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Debe listar exactamente **13** policies: las 8 de `migrations/002_rls.sql`
(1 select en cada tabla de solo lectura, 4 CRUD en `workout_logs`) y las 5 de
`migrations/004_diet_rls.sql` (1 `SELECT` en cada tabla `diet_*`, **ninguna**
de `INSERT`/`UPDATE`/`DELETE`).

### Índices de dieta

```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename like 'diet_%'
order by tablename, indexname;
```

Debe existir `diet_plans_one_active_per_user` con `WHERE (status = 'active')`
y, en cada tabla hija, solo la PK y el índice del `unique (diet_plan_id, …)`
(sin índices duplicados por `diet_plan_id`).
