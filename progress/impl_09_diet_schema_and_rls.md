# Progreso — impl 09_diet_schema_and_rls

**Estado: código y docs COMPLETOS, `./init.sh` en verde — pendiente la acción
humana de aplicar `003`/`004` en el proyecto Supabase y re-correr
`node scripts/check-rls.mjs`.** Este repo solo tiene la anon key y no hay
Supabase CLI instalada ni enlazada (`which supabase` → nada; el flujo de 01 fue
"el humano pega el SQL en el SQL Editor"), así que las migraciones quedan listas
y documentadas, no aplicadas. Sin ese paso, los checks (d)/(e)/(f) y la parte
`diet_*` del check (a) reportan "la tabla no existe (aún no se aplican las
migraciones — pega 003_diet_schema.sql y luego 004_diet_rls.sql)", que es el
comportamiento diseñado (R13), no un fallo de RLS.

Open items del spec resueltos por el humano con la opción recomendada: DDL de
§6 como contrato para `upload-diet.mjs`; índice único parcial "un plan `active`
por usuario" **sí**; sin índices extra en hijas; sin checks semánticos extra.

## Qué se hizo (2026-09-10)

| Archivo | Cambio |
| --- | --- |
| `supabase/migrations/003_diet_schema.sql` (nuevo) | Las 5 tablas de `client_requirement_dieta.md` §6 copiadas **verbatim** (verificado con `diff` contra el bloque SQL del requirement, quitando comentarios: idéntico) + `create unique index diet_plans_one_active_per_user on diet_plans (user_id) where status = 'active'` con su comentario "archivar antes de insertar" + comentario de por qué no hay índice extra por `diet_plan_id` en las hijas (R1, R2, R3) |
| `supabase/migrations/004_diet_rls.sql` (nuevo) | `enable row level security` en las 5 tablas + 5 policies `for select to authenticated` calcadas de `002_rls.sql` (`diet_plans_select` por `user_id = auth.uid()`; las 4 hijas vía `exists (select 1 from diet_plans p …)`). **Cero** policies de insert/update/delete (R4–R7) |
| `src/lib/types.ts` | Adición pura al final: `DietPlan`, `DietMeal`, `DietChecklistItem`, `DietSupplement`, `DietSection`, exactamente como en `design.md`. Los tipos existentes no cambian (R12, R15) |
| `src/lib/types.test.ts` (nuevo) | 13 tests Vitest: un literal válido por interfaz (con conteo runtime de columnas 14/9/7/8/6 como guardia del contrato), `expectTypeOf` de `status`/`kind` a sus uniones, `items: string[]`, `hora`/`ventana_*` `string \| null`, macros `number`, `recomendado: boolean`, y tres negativos con `@ts-expect-error` (`'draft'`, `'otro'`, `'tips'` fuera de las uniones — si el tipo se relajara, `tsc` fallaría por directiva sin usar) (R12) |
| `scripts/check-rls.mjs` | `CORE_TABLES` + `DIET_TABLES` → `TABLES` (check (a) cubre 10 tablas); `missingTableMsg` indica 003/004 para `diet_*` y 001/002 para el resto; helpers `isRlsDenied` (reutilizado también en el check (b), sin cambiar su semántica) y `authHeaders`; nuevos checks **(d)** insert en `diet_plans` con `user_id` propio → PASS solo con 403/`42501`, 201 → FAIL con instrucción de borrar con la service key desde el repo Gym; **(e)** insert en `diet_meals` con `diet_plan_id` aleatorio → PASS con 403/`42501`, `23503` → FAIL "RLS dejó pasar la fila hasta el FK", 201 → FAIL; **(f)** select autenticado `?select=id&limit=1` en las 5 tablas → PASS con 200 + array. Ningún probe de dieta puede crear una fila; sin cleanup (R8–R11, R13) |
| `project-documents/solution_design.md` | Nuevo anexo `### 3.7 Tablas de dieta` antes de §4: DDL de 003 (con el índice parcial), reglas (un plan active + archivar antes de insertar, sin índices extra, sin checks semánticos, postura RLS, `time` como "HH:MM:SS" en `America/Mexico_City`, tachado en `localStorage`), nota de contrato entre repos (R14) |
| `supabase/README.md` | Filas 3 y 4 en la tabla de migraciones; pasos 4–5 en la Opción A (mismo mecanismo que 001/002); dependencia `upload-diet.mjs` del repo Gym; descripción de checks (a) ×10, (d), (e), (f); query de contrato con las 10 tablas; `pg_policies` esperado = **13**; query nueva de `pg_indexes` para `diet_%` (R14) |
| `specs/09_diet_schema_and_rls/tasks.md` | 14 tareas marcadas `[x]`; quedan `[ ]` las 4 de la sección 6 que dependen de aplicar las migraciones (ver abajo) |

Sin dependencias nuevas, sin env vars nuevas, sin cambios en `package.json`,
`.env.example` ni `vite.config.ts` (verificado con `git diff --quiet`). En
`src/` solo cambian `lib/types.ts` (+ `lib/types.test.ts`). `grep` de
`.insert/.update/.delete/.upsert(` en `src/` → único `from(...)` escritor sigue
siendo `workout_logs` en `services/logs.ts`; las únicas menciones a `diet_*`
en `src/` son los tipos y su test (R15).

## Verificación ejecutada

### `./init.sh` (full: install → typecheck → lint → test → build) → **verde**

- typecheck limpio (incluye `types.test.ts`: los `@ts-expect-error` se
  validan, `expectTypeOf` se comprueba en compilación).
- lint limpio.
- Vitest: **29 archivos, 418 tests OK** (antes 28/405). Cobertura global
  98.16 % líneas / 91.16 % ramas (umbral 80 %); `types.ts` no tiene código
  ejecutable, así que no aparece en el reporte.
- `vite build` OK: manifest + `sw.js` generados.
- Prettier: `types.ts` y `types.test.ts` conformes. `scripts/check-rls.mjs`
  **ya no era conforme en HEAD** (comillas simples en todo el archivo, desde
  01); se mantuvo su estilo para no reescribir líneas ajenas a esta feature.
  Lint no lo marca (eslint-config-prettier desactiva reglas de formato).

### `node scripts/check-rls.mjs` contra el proyecto real (antes de aplicar 003/004) → exit 1 (esperado)

```
[a] R7 (+09 R8) — anon sin sesión: select en cada tabla debe devolver 0 filas
  PASS  exercises: 0 filas, sin error
  PASS  plans: 0 filas, sin error
  PASS  plan_days: 0 filas, sin error
  PASS  plan_exercises: 0 filas, sin error
  PASS  workout_logs: 0 filas, sin error
  FAIL  diet_plans: la tabla no existe (aún no se aplican las migraciones — pega 003_diet_schema.sql y luego 004_diet_rls.sql en el SQL Editor)
  FAIL  diet_meals: … (ídem)
  FAIL  diet_checklist_items: … (ídem)
  FAIL  diet_supplements: … (ídem)
  FAIL  diet_sections: … (ídem)
[auth] PASS  Sesión iniciada con el usuario E2E
[b] R8 — PASS  insert con user_id ajeno rechazado (violación de policy RLS)
[c] R6 — PASS  insert con el user_id propio aceptado
         PASS  fila de prueba eliminada (cleanup)
[d] 09 R9  — FAIL  diet_plans: la tabla no existe (… 003/004 …)
[e] 09 R10 — FAIL  diet_meals: la tabla no existe (… 003/004 …)
[f] 09 R11 — FAIL  ×5: la tabla no existe (… 003/004 …)
Resultado: 12 check(s) FALLARON.
```

Lectura: los checks de 01 siguen intactos (a ×5, b, c PASS) y los 12 FAIL son
todos "tabla no existe" apuntando a 003/004 — el script distingue el caso
"migraciones sin aplicar" de un fallo real de RLS (R13). Nada se insertó en
tablas `diet_*` (no existen; PostgREST responde `PGRST205`).

> Nota sobre datos reales: el check (c) es **preexistente** (feature 01) y hace
> un insert + delete de una fila de prueba propia en `workout_logs` (ahora
> ejecutable porque `exercises` ya está sembrado). Cleanup PASS; el conteo de
> filas reales del usuario no cambia. Esta feature no añadió ningún probe que
> escriba.

## Pendiente del humano (tareas 6.1–6.4 de `tasks.md`)

Mismo mecanismo con el que se aplicaron 001/002 (ver
`progress/impl_01_supabase_schema_and_rls.md`):

1. Dashboard → **SQL Editor** → pegar el contenido completo de
   `supabase/migrations/003_diet_schema.sql` → **Run** (sin errores: 5
   `CREATE TABLE` + 1 `CREATE INDEX`).
2. Pegar el contenido completo de `supabase/migrations/004_diet_rls.sql` →
   **Run** (5 `ALTER TABLE` + 5 `CREATE POLICY`).
3. Desde la raíz del repo: `node scripts/check-rls.mjs` → debe terminar con
   **exit 0** y PASS en (a) ×10, (b), (c), (d), (e), (f). Pegar la salida en
   este archivo.
4. En el SQL Editor, las tres queries del `supabase/README.md`:
   - `pg_policies` → **13** filas (8 de 002 + 5 `diet_*_select`, todas
     `cmd = 'SELECT'` en `diet_*`).
   - `pg_indexes where tablename like 'diet_%'` → existe
     `diet_plans_one_active_per_user` con `WHERE (status = 'active')`; en
     cada hija solo PK + el índice del `unique (diet_plan_id, …)`.
   - `information_schema.columns` para las 10 tablas → coincide con §3.1–3.5
     y §3.7. (Si el proyecto exige secret key para `information_schema`,
     como pasó en 01, vale el probe REST `select=<lista de columnas>` con la
     sesión E2E: 200 = columnas presentes.)
5. Marcar `[x]` las 4 tareas restantes de la sección 6 de `tasks.md` y anotar
   aquí los listados.

Ninguno de estos pasos toca `plans`, `workout_logs` ni ninguna tabla existente;
003/004 solo crean objetos nuevos. Son migraciones de una sola vez: si 003 se
ejecuta dos veces, da "already exists" (esperado).

## Trazabilidad R → evidencia

| Req | Evidencia |
| --- | --- |
| R1 | `003_diet_schema.sql` verbatim de §6 (diff local contra el requirement: idéntico salvo comentarios/índice); check de columnas en vivo → pendiente humano (paso 4) |
| R2 | `create unique index diet_plans_one_active_per_user … where status = 'active'` en 003 + nota en §3.7 y README; `pg_indexes` en vivo → pendiente humano |
| R3 | Comentario en 003 (sin índice extra) + query `pg_indexes` documentada; en vivo → pendiente humano |
| R4 | 5× `enable row level security` en `004_diet_rls.sql`; comportamiento observable en check (a) ×5 `diet_*` tras aplicar |
| R5 | Policy `diet_plans_select` (`user_id = auth.uid()`) en 004 |
| R6 | Policies `diet_meals_select`, `diet_checklist_items_select`, `diet_supplements_select`, `diet_sections_select` vía `exists` al padre en 004 |
| R7 | 004 no contiene ninguna policy de insert/update/delete; `pg_policies` = 13 documentado en README; en vivo → pendiente humano |
| R8 | check (a) de `check-rls.mjs` ahora itera 10 tablas (5 `diet_*` incluidas); en vivo → pendiente humano |
| R9 | check (d) `checkDietPlanInsertRejected` (PASS solo con 403/42501; 201 → FAIL sin cleanup posible, instrucción service key); en vivo → pendiente humano |
| R10 | check (e) `checkDietChildInsertRejected` (23503 → FAIL explícito "RLS dejó pasar la fila hasta el FK"); en vivo → pendiente humano |
| R11 | check (f) `checkDietAuthenticatedSelect` (200 + array, 0..n filas); en vivo → pendiente humano |
| R12 | `src/lib/types.test.ts` (13 tests, `expectTypeOf` + 3 `@ts-expect-error`) + `pnpm typecheck` limpio; tipos existentes sin diff |
| R13 | Salida del script arriba: `missingTableMsg` distingue 003/004 de 001/002; ningún probe de dieta escribe; checks de 01 sin regresión |
| R14 | Anexo §3.7 en `solution_design.md` (líneas 148–252) + `supabase/README.md` actualizado (orden 003→004, checks d/e/f, 13 policies, contrato ×10 tablas, `pg_indexes`) |
| R15 | `git diff --stat`: cambios solo en `supabase/migrations/`, `src/lib/types.ts` (+ test), `scripts/check-rls.mjs`, `supabase/README.md`, `solution_design.md`, `specs/09/tasks.md`, `progress/`; `package.json`/`.env.example`/`vite.config.ts` intactos; único `from(...)` escritor en `src/` = `workout_logs` |

## Desviaciones del spec

- Ninguna funcional. Detalle menor: `isRlsDenied` se extrajo como helper y el
  check (b) preexistente lo reutiliza (misma condición 403 / `42501`, sin
  cambio de comportamiento) para no triplicar la expresión.
- Las tareas 6.1–6.4 de `tasks.md` (aplicar migraciones, script en vivo,
  `pg_policies`/`pg_indexes`, contrato de columnas) requieren acceso al
  dashboard y quedan del humano, como en 01.
