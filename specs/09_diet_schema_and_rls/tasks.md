# Tasks — 09_diet_schema_and_rls

> Orden de implementación. Cada tarea cita el/los requisito(s) que satisface.
> Marca `[x]` al completarla. No empieces hasta que el humano apruebe el spec.
> ⚠️ Hay datos reales en vivo: ninguna tarea inserta, actualiza ni borra filas
> en ninguna tabla.

## 1. Decisiones previas

- [x] Resolver con el humano los open items: (1) aceptar el DDL de 003 como
      nuevo contrato para `upload-diet.mjs` del repo Gym, (2) índice único
      parcial "un plan active por usuario", (3) sin índice extra en hijas,
      (4) sin checks semánticos más allá de §6 (R1, R2, R3)

## 2. Migraciones

- [x] Escribir `supabase/migrations/003_diet_schema.sql`: encabezado al estilo
      de 001, las cinco tablas de client_requirement_dieta §6 copiadas
      **verbatim** (checks, uniques, `on delete cascade`) (R1)
- [x] Añadir en 003 el índice `diet_plans_one_active_per_user` on
      `diet_plans (user_id) where status = 'active'` con su comentario de
      "archivar antes de insertar", y el comentario que explica por qué no se
      crea índice extra por `diet_plan_id` en las hijas (R2, R3)
- [x] Escribir `supabase/migrations/004_diet_rls.sql`: `enable row level
      security` en las cinco tablas + las cinco policies `select to
      authenticated` del design (padre por `user_id = auth.uid()`, hijas vía
      `exists` a `diet_plans`); **ninguna** policy de escritura (R4, R5, R6, R7)

## 3. Tipos

- [x] Añadir a `src/lib/types.ts` las interfaces `DietPlan`, `DietMeal`,
      `DietChecklistItem`, `DietSupplement`, `DietSection` exactamente como en
      design.md (nullables, uniones literales, `time` como `"HH:MM:SS"`,
      `text[]` como `string[]`) sin tocar los tipos existentes (R12, R15)
- [x] **Test de tipos** `src/lib/types.test.ts` con `expectTypeOf`: un literal
      válido por interfaz, `status`/`kind` restringidos a sus uniones, `items`
      es `string[]`, `hora`/`ventana_inicio` son `string | null` (R12)

## 4. Script de verificación

- [x] Extender `scripts/check-rls.mjs`: `DIET_TABLES` sumadas al check (a);
      `missingTableMsg` distingue 003/004 de 001/002 (R8, R13)
- [x] Añadir check (d): `insert` autenticado en `diet_plans` con el `user_id`
      **propio** → PASS solo con 403/`42501`; 201 → FAIL con instrucción de
      borrar con la service key desde el repo Gym (R9, R13)
- [x] Añadir check (e): `insert` autenticado en `diet_meals` con un
      `diet_plan_id` aleatorio → PASS con 403/`42501`; `23503` o 201 → FAIL
      (R10, R13)
- [x] Añadir check (f): `select` autenticado en las 5 tablas de dieta → 200 y
      array de 0..n filas (R11, R13)

## 5. Documentación

- [x] Anexar `### 3.7 Tablas de dieta` a `project-documents/solution_design.md`
      con el DDL de 003, la regla "un plan active por usuario / archivar antes
      de insertar", la postura RLS y la nota de contrato (R14)
- [x] Actualizar `supabase/README.md`: filas 003/004 en la tabla de
      migraciones, mismo procedimiento de aplicación que 001/002, checks
      (d)/(e)/(f), listado esperado de `pg_policies` = 13 y check de contrato
      con las 5 tablas nuevas (R14)

## 6. Aplicación y verificación operacional

- [x] El humano aplica `003_diet_schema.sql` y luego `004_diet_rls.sql` en el
      SQL Editor (o `npx supabase db push`); registrar el resultado en
      `progress/impl_09_diet_schema_and_rls.md` (R1–R7)
- [x] Correr `node scripts/check-rls.mjs` contra el proyecto real: exit 0,
      PASS en (a) ×10, (b), (c), (d), (e), (f); pegar la salida en el progress
      file (R8, R9, R10, R11, R13)
- [~] Verificar en el SQL Editor `pg_policies` (13 policies; 5 `SELECT` sobre
      `diet_*`, ninguna de escritura) y `pg_indexes` (índice parcial presente;
      sin duplicados en hijas); pegar el listado en el progress file (R2, R3,
      R4–R7)
- [x] Verificar el contrato de columnas de las 5 tablas contra §6 vía
      `information_schema.columns` o el probe REST de 01 (R1)
- [x] Verificar por inspección (`git diff --stat`) que `package.json`,
      `.env.example`, `vite.config.ts` y `src/` (salvo `types.ts` + su test)
      quedaron sin cambios, y que no existe ningún `insert`/`update`/`delete`
      hacia tablas `diet_*` en `src/` (R15)
- [x] Correr `./init.sh quick` (typecheck + lint + test); verde sin regresiones
      (R12, R15)

## Verification

- **Comandos:** `./init.sh quick` (tipos + lint + unit); `node
  scripts/check-rls.mjs` (RLS en vivo, exit 0); queries `pg_policies` /
  `pg_indexes` / `information_schema.columns` del README en el SQL Editor.
- **Trazabilidad R → evidencia:**
  R1 → 003 verbatim + check de columnas; R2 → `pg_indexes` (índice parcial) +
  nota en §3.7; R3 → `pg_indexes` (sin duplicados) + comentario en 003;
  R4–R7 → `pg_policies` (13 policies, 5 `SELECT` en `diet_*`, 0 de escritura);
  R8 → check (a) ×10 PASS; R9 → check (d) PASS; R10 → check (e) PASS;
  R11 → check (f) PASS; R12 → `types.test.ts` + `pnpm typecheck`;
  R13 → salida completa del script sin ninguna fila creada; R14 → revisión del
  anexo §3.7 y del README; R15 → `git diff --stat` + `grep` de escrituras.
- **Datos en vivo intactos:** conteo de `plans` y `workout_logs` del usuario
  idéntico antes y después (el script solo lee y recibe rechazos).
- Sin cobertura aplicable (no hay lógica TS nueva); el umbral global del repo
  (80 %) se mantiene.

## Cierre operacional (2026-09-11)

El humano aplicó `003_diet_schema.sql` y `004_diet_rls.sql` en el SQL Editor.
Verificado desde el repo el mismo día:

- `node scripts/check-rls.mjs` → **exit 0, todos los checks PASARON**: (a) ×10
  tablas con 0 filas para anon, (b), (c) con cleanup, **(d)** insert en
  `diet_plans` con `user_id` propio **rechazado** (criterio 9 del
  requerimiento), **(e)** insert en `diet_meals` rechazado por RLS (`42501`)
  sin llegar al FK, **(f)** select autenticado 200 + array en las 5 tablas.
- **Contrato de columnas (R1)** verificado por probe REST autenticado
  (`?select=<todas las columnas>&limit=0`, 200 en las 5 tablas): 14 / 9 / 7 /
  8 / 6 columnas, exactamente las de `client_requirement_dieta.md` §6.
- `e2e/diet.spec.ts` → **2/2 pasa**. `e2e/diet-checklists.spec.ts` → sigue
  saltándose: ahora por **falta de plan de dieta**, no por tablas inexistentes.

Queda `[~]` la comprobación visual de `pg_policies` (13 esperadas) y
`pg_indexes` (índice parcial `diet_plans_one_active_per_user`) en el SQL
Editor: requiere el dashboard. Los checks (d) y (e) ya demuestran
**funcionalmente** que no hay policies de escritura sobre `diet_*`.
