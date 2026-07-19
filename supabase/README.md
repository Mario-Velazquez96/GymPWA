# supabase/ — Esquema y RLS (contrato entre repos)

Este directorio contiene el SQL versionado de la base de datos. **El repo Git es
la fuente de verdad**: nunca hagas cambios solo en el dashboard sin reflejarlos
aquí. El esquema de tablas es el **contrato con el repo `Gym`** (copiado
verbatim de `project-documents/solution_design.md` §3) — no lo modifiques sin
acuerdo explícito.

## Migraciones (aplicar EN ORDEN)

| Orden | Archivo                       | Contenido                                            |
| ----- | ----------------------------- | ---------------------------------------------------- |
| 1     | `migrations/001_schema.sql`   | 5 tablas + índice de `workout_logs` + 3 check constraints |
| 2     | `migrations/002_rls.sql`      | `enable row level security` en las 5 tablas + 8 policies |

Son migraciones de **una sola vez** (no idempotentes): aplicarlas dos veces da
error de "already exists", lo cual es esperado.

### Opción A — Dashboard (recomendada)

1. Abre el proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. Pega el contenido completo de `migrations/001_schema.sql` y ejecuta (**Run**).
3. Pega el contenido completo de `migrations/002_rls.sql` y ejecuta.
4. Ambas deben terminar sin errores.

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

## Verificación de RLS (denial checks — R7/R8)

Con las migraciones aplicadas, corre desde la raíz del repo:

```sh
node scripts/check-rls.mjs
```

El script lee `.env.local` (nunca imprime los valores) y verifica:

- **(a) R7:** un cliente anon **sin sesión** hace `select` en las 5 tablas →
  debe recibir **0 filas y ningún error** (RLS filtra, no falla).
- **(b) R8:** con sesión del usuario E2E, un insert en `workout_logs` con un
  `user_id` **ajeno** → debe ser **rechazado** (violación de la policy
  `with check`).
- **(c) R6:** un insert con el `user_id` **propio** → debe funcionar; la fila
  de prueba se borra al final (cleanup). Si el catálogo `exercises` está vacío
  (seed pendiente en el repo `Gym`), este check se marca como SKIP.

Imprime PASS/FAIL por check y sale con código ≠ 0 si algo falla. Si las tablas
todavía no existen, el script lo distingue con el mensaje "aún no se aplican
las migraciones" en lugar de reportarlo como fallo de RLS.

### Check de contrato (columnas vs. §3)

En el SQL Editor:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('exercises','plans','plan_days','plan_exercises','workout_logs')
order by table_name, ordinal_position;
```

El resultado debe coincidir columna por columna con
`project-documents/solution_design.md` §3.1–3.5.

### Listado de policies

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Debe listar exactamente las 8 policies de `migrations/002_rls.sql`
(1 select en cada tabla de solo lectura, 4 CRUD en `workout_logs`).
