# Review — 09_diet_schema_and_rls

**Veredicto: APPROVE** (0 hallazgos bloqueantes, 4 menores no bloqueantes).
Fecha: 2026-09-10. Reviewer: solo lectura + ejecución de verificaciones.

El leader puede marcar la feature como `done`. Los pasos operacionales de la
sección "Pendientes del humano" (aplicar 003/004 y re-correr `check-rls.mjs`)
quedan como pendiente explícito en `progress/current.md`, igual que en 01.

## Qué se verificó (evidencia ejecutada, no solo leída)

| Verificación | Resultado |
| --- | --- |
| `./init.sh` (full) | **Verde.** typecheck limpio · lint limpio · Vitest 29 archivos / **418 tests OK** · cobertura 98.16 % líneas, 91.16 % ramas (umbral 80 %) · `vite build` OK con `manifest.webmanifest` + `sw.js` |
| `node scripts/check-rls.mjs` en vivo | Checks de 01 intactos: (a) ×5 tablas PASS, auth PASS, (b) PASS, (c) PASS + cleanup PASS. Los 12 FAIL restantes son todos "la tabla no existe (… pega 003_diet_schema.sql y luego 004_diet_rls.sql …)" → el script **distingue** "migraciones sin aplicar" de un fallo real de RLS (R13). Exit 1 esperado hasta que el humano aplique 003/004 |
| DDL verbatim (R1) | `diff` reproducido por el reviewer entre el bloque SQL de `client_requirement_dieta.md` §6 y `003_diet_schema.sql` (comentarios y espacios finales eliminados, índice parcial excluido): **IDENTICAL** |
| `003_diet_schema.sql` | 5 `create table`; checks de `status` (active/archived) y `kind` (meal_prep/super; reglas/rotacion/libre); 4 `unique (diet_plan_id, …)`; 4 `on delete cascade`; `create unique index diet_plans_one_active_per_user on diet_plans (user_id) where status = 'active'`. Sin `grant`, sin DML, sin índice duplicado en hijas (comentario R3 presente) |
| `004_diet_rls.sql` | `enable row level security` ×5; exactamente 5 `create policy … for select to authenticated`; padre `user_id = auth.uid()`, hijas `exists (select 1 from diet_plans p where p.id = <hija>.diet_plan_id and p.user_id = auth.uid())`. grep de insert/update/delete/grant/with check → solo el comentario de cabecera; **cero policies de escritura** |
| `001_schema.sql` / `002_rls.sql` | `git diff --quiet HEAD` → **sin cambios** |
| `package.json`, `pnpm-lock.yaml`, `.env.example`, `vite.config.ts` | `git diff --quiet HEAD` → **sin cambios** (R15: sin deps ni env vars nuevas) |
| `src/lib/types.ts` | Diff solo con líneas `+`; ninguna línea eliminada → tipos existentes intactos. Las 5 interfaces espejan el SQL columna a columna (nullabilidad, `string[]`, `time` como string, uniones literales) |
| `src/lib/types.test.ts` | 13 tests: conteo de columnas 14/9/7/8/6, `expectTypeOf` por columna, 3 `@ts-expect-error` negativos. `tsconfig.json` incluye `src` → `tsc` valida los `@ts-expect-error` y `expectTypeOf` en `pnpm typecheck` (si una unión se relajara, el typecheck fallaría por directiva sin usar) |
| Escrituras en `src/` | grep de `from("diet_…")` → nada. Único `.insert(` real: `src/services/logs.ts:170` → `workout_logs`. La app sigue escribiendo solo `workout_logs` |
| Secretos | grep -i de `service_role`, `service key`, `sb_secret`, `SUPABASE_SERVICE_KEY` → solo prosa/documentación (avisos "nunca aquí", tabla del repo Gym en solution_design §7). grep de prefijo JWT `eyJhbGciOi` y `sb_secret_` en todo el repo (excl. `.env.local`, gitignored) → nada |
| `console.log` / `TODO` / `FIXME` | Ninguno en `types.ts`, `types.test.ts`, 003, 004. Los `console.log` de `check-rls.mjs` son la salida del script (preexistente, por diseño) |
| Contrato Gym (§3, IDs "0001"–"1324") | Intacto: no se toca `exercises` ni §3.1–3.5. El nuevo contrato §3.7 queda documentado en `solution_design.md` y `supabase/README.md` |
| Docs (R14) | `solution_design.md` §3.7 con DDL completo + reglas (un active, archivar antes de insertar, sin índices extra, sin checks semánticos, RLS, `time`, contrato). `supabase/README.md`: filas 003/004, pasos 4–5 Opción A, checks (d)/(e)/(f), contrato ×10 tablas, `pg_policies` = 13, query `pg_indexes` |
| Repo limpio | `git status`: solo los archivos de la feature + `feature_list.json`/`progress/current.md` (leader). `.agents/` y `.codex/` ya estaban sin trackear **antes** de esta feature (git status inicial); no son de 09 |

## Trazabilidad R<n> → evidencia

| Req | Evidencia | Estado |
| --- | --- | --- |
| R1 | `diff` §6 vs 003 = IDENTICAL (reproducido por el reviewer); check de columnas en vivo (`information_schema.columns`) | Verificado estático; en vivo → humano |
| R2 | `create unique index diet_plans_one_active_per_user … where status = 'active'` en 003:27–28; `pg_indexes` en vivo | Verificado estático; en vivo → humano |
| R3 | 003 sin `create index` extra en hijas; comentario 003:80–82; `pg_indexes` en vivo | Verificado estático; en vivo → humano |
| R4 | 004:9–13, 5× `enable row level security` | Verificado estático |
| R5 | 004:15–16 `diet_plans_select` `using (user_id = auth.uid())` | Verificado estático |
| R6 | 004:18–36, 4 policies `exists` al padre | Verificado estático |
| R7 | 004 sin insert/update/delete (grep); `pg_policies` = 13 documentado en README | Verificado estático; en vivo → humano |
| R8 | check (a) de `check-rls.mjs` itera 10 tablas; ejecutado: 5 core PASS, 5 diet "tabla no existe" | Script verificado; PASS en vivo → humano |
| R9 | check (d) `checkDietPlanInsertRejected`: PASS solo con 403/42501; 201 → FAIL con instrucción de borrar con service key | Script verificado; en vivo → humano |
| R10 | check (e) `checkDietChildInsertRejected`: `23503` → FAIL explícito antes de evaluar 42501 | Script verificado; en vivo → humano |
| R11 | check (f) `checkDietAuthenticatedSelect`: 200 + array ×5 | Script verificado; en vivo → humano |
| R12 | `src/lib/types.test.ts` (13 tests, en verde) + `pnpm typecheck` limpio + diff aditivo de `types.ts` | **Verificado y ejecutado** |
| R13 | Salida real del script: `missingTableMsg` apunta a 003/004 para `diet_*`; checks 01 sin regresión; ningún probe de dieta escribe (d/e esperan rechazo, f solo lee) | **Verificado y ejecutado** |
| R14 | Diff de `solution_design.md` (+105 líneas, §3.7) y `supabase/README.md` leído completo | Verificado |
| R15 | `git diff --quiet` en package.json/.env.example/vite.config.ts; `src/` solo `types.ts` + test; único escritor `logs.ts` → `workout_logs` | **Verificado y ejecutado** |

Las R cuya prueba es el script en vivo (R8–R11) o `pg_*` (R2, R3, R7) tienen
su verificación **codificada y ejecutable** (`check-rls.mjs`, queries del
README); solo falta el entorno (tablas aplicadas). Conforme a la instrucción
del leader, esto no es motivo de rechazo.

## Tareas de `tasks.md`

14/18 `[x]` y comprobadas contra el código (secciones 1–5 y 6.5–6.6). Las 4
`[ ]` de la sección 6 (6.1–6.4) requieren el dashboard de Supabase y son del
humano, como en 01. Correcto que sigan sin marcar.

## Hallazgos

### Bloqueantes
Ninguno.

### Menores (no bloquean; opcionales para una pasada futura)
1. `scripts/check-rls.mjs:293` — el check (e) reutiliza la constante
   `FOREIGN_USER_ID` como `diet_plan_id`. Funciona (es un uuid cualquiera que
   no existe), pero el nombre confunde; un alias `RANDOM_PLAN_ID = FOREIGN_USER_ID`
   o un comentario de una línea lo aclararía.
2. R11 dice "solo filas cuyo plan pertenece a `auth.uid()`"; el check (f) solo
   puede probar 200 + array con un único usuario E2E. La parte de "solo
   propias" queda cubierta por el check (a) (anon → 0 filas) y por la policy
   inspeccionada. Aceptable; anotado para que nadie lo lea como test de
   aislamiento entre usuarios.
3. `scripts/check-rls.mjs` sigue con comillas simples (no conforme a Prettier
   desde 01); el implementer lo dejó así a propósito para no reescribir líneas
   ajenas. Lint no lo marca. Si algún día se formatea, hacerlo en un commit
   aparte.
4. `progress/current.md` (archivo del leader, no del implementer) tiene dos
   fragmentos sueltos tras la edición: la línea
   "`09_diet_schema_and_rls`, `10_diet_screen`, …" bajo "Feature in progress"
   y "(status → `in_progress`, una feature a la vez…) o pedir cambios a
   `spec_author`." en "Notes / blockers". Limpiar al cerrar la feature.

## Pendientes del humano (explícitos, no bloquean el APPROVE)

Los pasos del informe del implementer (`progress/impl_09_diet_schema_and_rls.md`,
"Pendiente del humano") son correctos y suficientes; mismo mecanismo que 001/002:

1. SQL Editor → pegar `supabase/migrations/003_diet_schema.sql` → Run
   (5 `CREATE TABLE` + 1 `CREATE INDEX`, sin errores).
2. SQL Editor → pegar `supabase/migrations/004_diet_rls.sql` → Run
   (5 `ALTER TABLE` + 5 `CREATE POLICY`).
3. `node scripts/check-rls.mjs` → **exit 0**, PASS en (a) ×10, (b), (c), (d),
   (e), (f). Pegar la salida en `progress/impl_09_diet_schema_and_rls.md`.
4. Queries del `supabase/README.md`: `pg_policies` = **13** (5 `SELECT` en
   `diet_*`, ninguna de escritura); `pg_indexes like 'diet_%'` con
   `diet_plans_one_active_per_user … WHERE (status = 'active')` y sin
   duplicados en hijas; `information_schema.columns` ×10 tablas vs §3 / §3.7.
5. Marcar `[x]` las tareas 6.1–6.4 de `specs/09_diet_schema_and_rls/tasks.md`.
6. Avisar al repo `Gym`: `scripts/upload-diet.mjs` debe construirse contra el
   DDL de 003 y **archivar el plan anterior antes de insertar** (índice único
   parcial). Es el tercer contrato entre repos.

Ninguno de estos pasos toca `plans`, `workout_logs` ni datos reales; 003/004
solo crean objetos nuevos. El script solo escribe en `workout_logs` en el check
(c) preexistente de 01, con cleanup por id (PASS en esta ejecución).
