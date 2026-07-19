# Progreso — impl 01_supabase_schema_and_rls

**Estado: COMPLETO — listo para review.** El humano aplicó ambas migraciones en
el SQL Editor (2026-07-19); todos los checks operacionales pasaron (detalle en
"Verificación post-migración" abajo). Único residual: el check de insert con
`user_id` propio queda SKIP hasta que el repo Gym haga el seed de `exercises`
(FK sobre `exercise_id`) — la policy de insert quedó demostrada igualmente por
las pruebas de rechazo.

## Qué se hizo (2026-07-19)

Todos los entregables son archivos nuevos; **cero cambios en `src/`**.

| Archivo | Contenido |
| --- | --- |
| `supabase/migrations/001_schema.sql` | Las 5 tablas + índice de `workout_logs`, SQL copiado **verbatim** de `project-documents/solution_design.md` §3.1–3.5 (contrato con el repo Gym), más los 3 check constraints de `workout_logs` del design (R1, R2) |
| `supabase/migrations/002_rls.sql` | `enable row level security` en las 5 tablas + las 8 policies exactamente como en `specs/01_supabase_schema_and_rls/design.md` (R3–R6) |
| `supabase/README.md` | Orden de aplicación (001 → 002) vía SQL Editor del dashboard (o CLI como alternativa), nota de que el usuario Auth de Mario se crea manualmente (ya hecho), nota de que el bucket `exercise-media` + seed pertenecen al repo Gym, uso de `scripts/check-rls.mjs`, y los queries de contrato (`information_schema.columns`) y de policies (`pg_policies`) (R9) |
| `scripts/check-rls.mjs` | Script Node puro (sin dependencias nuevas; `fetch` global contra la REST API). Lee `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `E2E_EMAIL`, `E2E_PASSWORD` de `.env.local` sin imprimir valores. Checks: (a) anon sin sesión → 0 filas en las 5 tablas (R7); (b) insert con `user_id` ajeno → rechazado (R8); (c) insert con `user_id` propio → aceptado + delete de cleanup (R6; SKIP si `exercises` está vacío porque el seed es del repo Gym). PASS/FAIL por check, exit ≠ 0 si algo falla, y distingue "tabla no existe (aún no se aplican las migraciones)" de un fallo real de RLS |

`specs/01_supabase_schema_and_rls/tasks.md`: marcadas `[x]` las 4 tareas de
autoría (más la de open items ya resuelta).

## Verificación ejecutada

- `./init.sh quick` → **verde** (typecheck, lint, 14/14 tests, cobertura 100%
  líneas). Ningún archivo TS de la app cambió; sin regresiones.
- `node scripts/check-rls.mjs` ejecutado contra el proyecto real:
  - `[auth]` **PASS** — la sesión con el usuario E2E funciona (usuario ya
    creado en el dashboard).
  - Los 7 checks de tablas reportan, como se espera **antes** de las
    migraciones: `FAIL <tabla>: la tabla no existe (aún no se aplican las
    migraciones — pega 001_schema.sql y luego 002_rls.sql en el SQL Editor)`,
    y exit code 1. Es el comportamiento diseñado, no un fallo de RLS.

## Verificación post-migración (2026-07-19, tras la acción humana)

El humano ejecutó `001_schema.sql` y luego `002_rls.sql` en el SQL Editor sin
errores. Verificación operacional desde este repo:

### 1. `node scripts/check-rls.mjs` → exit 0, todo PASS

```
[a] R7 — anon sin sesión: select en cada tabla debe devolver 0 filas
  PASS  exercises: 0 filas, sin error
  PASS  plans: 0 filas, sin error
  PASS  plan_days: 0 filas, sin error
  PASS  plan_exercises: 0 filas, sin error
  PASS  workout_logs: 0 filas, sin error
[auth] PASS  Sesión iniciada con el usuario E2E
[b] R8 — PASS  insert con user_id ajeno rechazado (violación de policy RLS)
[c] R6 — SKIP: el catálogo exercises está vacío (el seed pertenece al repo Gym).
Resultado: todos los checks PASARON.
```

El check (c) (insert con `user_id` propio + delete) quedará ejecutable cuando el
repo Gym haga el seed de `exercises` (el FK `workout_logs.exercise_id →
exercises.id` impide insertar antes). Re-correr `node scripts/check-rls.mjs`
entonces.

### 2. Check de contrato §3 (R1) — vía REST probes

`information_schema` y el endpoint OpenAPI de PostgREST requieren la **secret
key** en este proyecto ("Only secret API keys can be used for this endpoint"),
que este repo no tiene **por diseño**. Se verificó el contrato vía REST con la
sesión E2E (script temporal en scratchpad, sin escribir ninguna fila):

- **Columnas:** `select=<lista completa §3>` en cada tabla → 200 OK:
  `exercises` 12/12, `plans` 8/8, `plan_days` 5/5, `plan_exercises` 8/8,
  `workout_logs` 9/9. Canario negativo (columna inexistente) → rechazado con
  `42703`, lo que prueba que el probe valida de verdad.
- **Tipos:** insert con valor no casteable por columna → Postgres nombra el
  tipo en el error de cast (que ocurre antes de RLS/FK; aborta sin escribir).
  Confirmados los 24 tipos no-text: `uuid` (id/user_id/plan_id/…),
  `date` (start_date, end_date, day_date, performed_at),
  `timestamp with time zone` (created_at ×2), `boolean` (is_rest),
  `integer` (position, target_sets, rest_seconds, set_number, reps),
  `numeric` (weight_kg), `text[]` (secondary_muscles, instruction_steps_es).
  Las columnas `text` quedan cubiertas por el probe de existencia (§3 solo usa
  `text` para lo demás).
- **R2 (constraints):** inserts tipado-válidos que violan cada check →
  `23514` nombrando `workout_logs_set_number_check`, `workout_logs_reps_check`
  y `workout_logs_weight_check`. Los tres activos.
- **Limpieza verificada:** tras todos los probes, `workout_logs` del usuario
  E2E contiene 0 filas.

El query completo de `information_schema.columns` sigue documentado en
`supabase/README.md` para quien tenga acceso al SQL Editor.

### 3. `./init.sh quick` (re-ejecutado tras los cambios) → verde

## Trazabilidad R → evidencia (final)

| Req | Evidencia |
| --- | --- |
| R1 | `001_schema.sql` verbatim de §3.1–3.5 + probe REST: 42/42 columnas y 24/24 tipos no-text confirmados (canario 42703 valida el método) |
| R2 | Probes de violación → `23514` con los tres nombres de constraint |
| R3 | Comportamiento RLS observado en R7/R8 + `002_rls.sql` (5× `enable row level security`); listado `pg_policies` documentado en README para el reviewer |
| R4 | Policy `exercises_select` en `002_rls.sql`; anon sin sesión → 0 filas (check a) |
| R5 | Policies `plans/plan_days/plan_exercises_select` (cadena de ownership, sin writes); anon → 0 filas en las tres (check a) |
| R6 | 4 policies `workout_logs_*`; insert ajeno rechazado (check b); insert propio + delete = SKIP hasta seed de `exercises` (FK) |
| R7 | check (a) de `scripts/check-rls.mjs` → PASS ×5, exit 0 |
| R8 | check (b) de `scripts/check-rls.mjs` → PASS |
| R9 | `supabase/README.md` (orden 001→002, dashboard/CLI, usuario manual, bucket del repo Gym, uso del script, queries de contrato/policies) |

## Notas

- Las migraciones son de una sola vez (no idempotentes), documentado en el
  README y en los encabezados SQL.
- No se agregó ninguna variable de entorno ni dependencia; `.env.example` ya
  documentaba las 4 variables que usa el script.
- No se tocó `.env.local` ni se imprimió ningún valor secreto.

## Fix post-review (2026-07-19)

Hallazgo #1 de `progress/review_01_supabase_schema_and_rls.md` atendido: el
conteo correcto de policies es **8** (4 selects en tablas de solo lectura + 4
CRUD en `workout_logs`), no 9. Corregido "nueve/9" → "ocho/8" en:
`supabase/migrations/002_rls.sql` (solo el comentario de la línea 1 — ningún
statement SQL cambió; no hay nada que re-aplicar en Supabase),
`supabase/README.md` (tabla de migraciones y sección de `pg_policies`),
`specs/01_supabase_schema_and_rls/tasks.md` (línea 11) y este archivo.
