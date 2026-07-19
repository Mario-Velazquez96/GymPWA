# Review — 03_today_view

**Verdicto: APPROVE**
**Fecha:** 2026-07-19
**Revisor:** reviewer subagent

## Qué se verificó

### 1. Trazabilidad R1–R10 (completa)

| Req | Evidencia verificada |
| --- | --- |
| R1 | `TodayScreen.test.tsx` "R1: muestra el título del día y los ejercicios en orden de position" (título + orden + "4 × 8-12"); `today.spec.ts` paso R1 (3 cards en orden contra la BD real) |
| R2 | `utils.test.ts`: bordes de zona horaria con reloj mockeado (23:59 y 00:10 locales — una implementación UTC/`toISOString()` fallaría), invariante anti-UTC, "lun 3 ago"/"jue 1 ene"; `TodayScreen.test.tsx` "R2: encabezado con fecha local en español" |
| R3 | `TodayScreen.test.tsx` R3 (texto + sin lista + `getDayExercises` NO llamado); `usePlanDay.test.tsx`; `today.spec.ts` paso R3/R6 |
| R4 | `TodayScreen.test.tsx` R4; `plans.test.ts` `maybeSingle` sin fila; `today.spec.ts` paso R4/R6 |
| R5 | `TodayScreen.test.tsx` R5 (texto + flechas ausentes); `plans.test.ts` sin filas → `data:null,error:null` |
| R6 | `TodayScreen.test.tsx` describe "navegación de días": avanzar/retroceder con fecha correcta en `getPlanDay`, flecha ‹ deshabilitada en `start_date`, › en `end_date`; `utils.test.ts` `addDaysISO` (cruces mes/año) + `clampISO` (bordes válidos); `today.spec.ts` clava › en `end_date` |
| R7 | `ExerciseCard.test.tsx` href `/ejercicio/pe-1` (id de `plan_exercises`, no del catálogo); `TodayScreen.test.tsx` R7 |
| R8 | `TodayScreen.test.tsx` estado de carga (`role=status`), error `role=alert` "No se pudo cargar la rutina" + "Reintentar" recarga con éxito |
| R9 | `plans.test.ts` formas de query completas (tabla/select/eq/limit/maybeSingle/order), mapeo a español (nunca el error crudo), excepciones, cliente `null`; grep: `supabase.from` SOLO en `src/services/plans.ts` |
| R10 | `ExerciseCard.test.tsx` `min-h-11`; `TodayScreen.test.tsx` flechas `min-h-11 min-w-11` + labels "Día anterior/siguiente" |

### 2. Tareas (11/11 `[x]`, spot-check contra el código)

- `lib/types.ts` espeja `001_schema.sql` columna por columna (incl. `attribution`, nullabilidad de `goal`/`title`/`rest_seconds`/`notes`, `status` union) — verificado contra la migración.
- `Result<T>` implementado y consumido uniformemente; `usePlanDay` compone las 3 llamadas con cortes tempranos, guard `active` y `retry`; `TodayScreen` con los 4 estados + carga/error; `ExerciseCard` → `/ejercicio/{plan_exercise.id}`.

### 3. Checks verdes (ejecutados por el reviewer, 2026-07-19)

- `./init.sh` (install → typecheck → lint → test+coverage → build): **verde**. 98 tests / 14 archivos.
- Cobertura: `services/plans.ts` **100%** líneas, `lib/utils.ts` **100%**, `hooks/usePlanDay.ts` **88.37%** — todos ≥ 80% (umbral de tasks.md). Global 95.34%.
- `./init.sh e2e`: **verde**, 4/4. Con el fixture ya aplicado por el humano, `today.spec.ts` tomó el **camino sembrado** — log confirmado en la salida: `[e2e today] camino ejecutado: FIXTURE APLICADO (R1, R3, R6)` — título del día, 3 ejercicios en orden, mañana "Día de descanso", +2/+3 "Sin rutina asignada" y › deshabilitada en `end_date`, todo contra la BD real.
- Build PWA: manifest + `sw.js` emitidos (sin cambios de SW en esta feature).

### 4. Calidad del fixture (`e2e/fixtures/test-plan.sql`)

- Idempotente: `delete from plans where user_id = … and name = 'Plan de prueba E2E'` antes de reinsertar; cascada a `plan_days`/`plan_exercises`.
- `user_id` resuelto por `auth.users.email` con excepción clara si no existe.
- Ejercicios placeholder con `ON CONFLICT (id) DO NOTHING` e IDs del contrato `'0001'–'0003'`; cero cambios de esquema; fechas relativas a `current_date` (plan ±3).
- Corrida real confirmada: el E2E tomó el camino sembrado, prueba de que el fixture aplicó bien.

### 5. Convenciones y seguridad

- UI 100% en español; sin `any` (grep limpio); sin `console.log` (solo `console.debug` dev-only en el service y `console.warn` del spec E2E); targets táctiles ≥ 44px asertados.
- `supabase.from` solo en `services/`; solo lectura (`select`) — cero escrituras a ninguna tabla.
- `supabase/migrations/` intacto; sin dependencias nuevas (`package.json` sin cambios); sin env vars nuevas (`E2E_EMAIL`/`E2E_PASSWORD` ya estaban en `.env.example` desde 02); grep de secretos (`service_role`/`sb_secret`/`SERVICE_KEY`) limpio — solo prosa en docs previos.

### 6. Alcance

Sin scope creep: nada de logging, nada de contenido de detalle de ejercicio (la ruta `/ejercicio/:id` sigue siendo el placeholder de 04), sin rutas ni tablas nuevas.

## Conclusión

**APPROVE** — el leader puede marcar `03_today_view` como `done` en
`feature_list.json`. Nota operativa (no bloqueante): el trabajo está sin
commitear en el árbol; commitear al cerrar la feature.
