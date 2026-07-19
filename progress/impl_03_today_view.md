# Implementación — 03_today_view

**Estado:** COMPLETO (pendiente de revisión del reviewer)
**Fecha:** 2026-07-19

## Qué cambió

Primera rebanada de lectura de datos: la pantalla Hoy real reemplaza al
placeholder, con navegación de días acotada al plan y los cuatro estados del
cuerpo. Solo lectura — cero escrituras, cero migraciones, cero dependencias
nuevas, ninguna variable de entorno nueva.

### Archivos nuevos

- `src/lib/types.ts` — tipos de fila `Exercise`, `Plan`, `PlanDay`,
  `PlanExercise` espejo de `supabase/migrations/001_schema.sql`, más
  `ExerciseSummary` y `PlanExerciseWithExercise` (forma del join).
- `src/lib/utils.ts` — `todayLocalISO()` (fecha LOCAL del dispositivo, nunca
  UTC), `formatDateEs()` ("lun 3 ago", es-MX vía `Intl.formatToParts`),
  `addDaysISO()`, `clampISO()`.
- `src/lib/utils.test.ts` — incl. bordes de zona horaria (23:59 y 00:10
  locales con reloj mockeado) y cruces de mes/año.
- `src/services/plans.ts` — `getActivePlan()`, `getPlanDay()`,
  `getDayExercises()` con el patrón `Result<T>` (`{data,error:null} |
  {data:null,error:string-en-español}`); join
  `exercises(id,name,image_url,equipment,target)` ordenado por `position`;
  error único `PLANS_ERROR_LOAD = "No se pudo cargar la rutina"`; detalles solo
  a `console.debug` en dev.
- `src/services/plans.test.ts` — formas de query (tabla, select, eq, limit /
  maybeSingle / order), mapeo de errores (nunca el crudo), excepciones de red,
  cliente `null`.
- `src/hooks/usePlanDay.ts` — compone las 3 llamadas por `selectedDate`, corta
  temprano (sin plan / sin día / descanso no piden ejercicios), `retry()`.
  `loading` se deriva de una clave `fecha#intento` (la regla
  `react-hooks/set-state-in-effect` prohíbe setState síncrono en efectos);
  durante la carga conserva el plan previo para no desmontar la navegación.
- `src/hooks/usePlanDay.test.tsx` — camino feliz, cortes tempranos, errores,
  retry, cambio de fecha.
- `src/components/ExerciseCard.tsx` — `<Link to={/ejercicio/${pe.id}}>`,
  thumbnail 56px (`h-14 w-14`, `alt` = nombre), nombre, "4 × 8-12",
  `min-h-11`.
- `src/components/ExerciseCard.test.tsx`.
- `src/screens/TodayScreen.tsx` — reescrito: `h1 "Hoy"` (mantiene verdes los
  asserts de 02), header ‹ [fecha es] › con flechas `aria-label="Día
  anterior/siguiente"` deshabilitadas en `start_date`/`end_date` (comparación
  lexicográfica ISO + `clampISO`), y cuerpo con: lista de ejercicios /
  "Día de descanso 💤" / "Sin rutina asignada para este día" / "Sin plan
  activo" + "Cargando rutina…" (role=status) + error con "Reintentar".
- `src/screens/TodayScreen.test.tsx` — services mockeados, "hoy" fijado a
  2026-08-05.
- `e2e/fixtures/test-plan.sql` — fixture MANUAL para el SQL editor de
  Supabase (ver abajo).
- `e2e/today.spec.ts` — spec de doble camino (ver abajo).

### Archivos tocados

- `specs/03_today_view/tasks.md` — todas las tareas `[x]`.
- (nada más: sin cambios en migraciones, auth, config ni `.env.example` —
  no hubo variables nuevas.)

## Fixture E2E (acción del humano pendiente)

`e2e/fixtures/test-plan.sql` se pega en el SQL editor de Supabase. Es
idempotente (borra/reinserta su plan 'Plan de prueba E2E'), resuelve `user_id`
por `auth.users.email = 'mariovt860@gmail.com'`, usa fechas relativas a
`current_date` (plan ±3; ayer entrenamiento, hoy 3 ejercicios, mañana
descanso, +2/+3 sin día) y siembra 3 ejercicios placeholder con IDs reales del
contrato ('0001'–'0003') usando `ON CONFLICT (id) DO NOTHING` para no chocar
con el seed real del repo Gym.

**Estado actual de la BD: el fixture AÚN NO está aplicado**, por lo que
`./init.sh e2e` ejercita hoy el camino "SIN PLAN ACTIVO" (R5) — el spec lo
anuncia en consola y en las annotations del reporte. Tras aplicar el fixture,
el mismo spec ejercita automáticamente el camino completo (R1, R3, R4, R6).

## Trazabilidad R<n> → prueba

| Req | Prueba |
| --- | --- |
| R1 | `TodayScreen.test.tsx > "R1: muestra el título del día y los ejercicios en orden de position"`; `usePlanDay.test.tsx > "camino feliz"`; `today.spec.ts` (camino fixture) |
| R2 | `utils.test.ts > todayLocalISO` (bordes 23:59/00:10 local + invariante anti-UTC) y `formatDateEs` ("lun 3 ago", "jue 1 ene"); `TodayScreen.test.tsx > "R2: el encabezado muestra la fecha local de hoy en español"` |
| R3 | `TodayScreen.test.tsx > "R3: día de descanso…"`; `usePlanDay.test.tsx > "día de descanso: no pide ejercicios"`; `today.spec.ts` paso R3/R6 |
| R4 | `TodayScreen.test.tsx > "R4: fecha sin plan_day…"`; `usePlanDay.test.tsx > "fecha sin día asignado"`; `plans.test.ts > getPlanDay "sin fila…"` |
| R5 | `TodayScreen.test.tsx > "R5: sin plan activo… oculta la navegación"`; `plans.test.ts > getActivePlan "sin filas"`; `today.spec.ts` camino sin-plan (es también la prueba RLS: el estado se renderiza contra la BD real) |
| R6 | `TodayScreen.test.tsx > describe "navegación de días"` (avanzar/retroceder + flechas deshabilitadas en bordes); `utils.test.ts > addDaysISO/clampISO`; `today.spec.ts` paso R4/R6 (clavada en end_date) |
| R7 | `ExerciseCard.test.tsx > "es un link a /ejercicio/<plan_exercise.id>"`; `TodayScreen.test.tsx > "R7: cada card enlaza…"` |
| R8 | `TodayScreen.test.tsx > "R8: estado de carga"` y `"R8: en fallo… 'Reintentar' recarga"`; `usePlanDay.test.tsx > errores + retry` |
| R9 | `plans.test.ts` completo (cliente mockeado en la frontera, mapeo a español); grep verificado: `supabase.from` solo aparece en `src/services/plans.ts` |
| R10 | `ExerciseCard.test.tsx > "target táctil ≥ 44px"`; `TodayScreen.test.tsx > "R10: las flechas tienen target táctil ≥ 44px y labels en español"` |

## Verificación

- `./init.sh` (install → typecheck → lint → test → build): **verde**.
- `./init.sh e2e`: **verde** — 4 specs (smoke, 2×auth, today). `today.spec.ts`
  corrió el camino "SIN PLAN ACTIVO" porque el fixture no está aplicado aún.
- Cobertura (vitest v8, umbral global 80): `services/plans.ts` **100%** líneas,
  `lib/utils.ts` **100%**, `hooks/usePlanDay.ts` **88.4%** líneas — todos
  ≥ 80%. Global: 95.3% líneas. 98 tests, 14 archivos, todos pasan.
- Sin migraciones nuevas, sin cambios de RLS, sin env vars nuevas, sin
  dependencias nuevas, sin `console.log` (solo `console.debug` dev-only en el
  service y `console.warn` informativo en el spec E2E, ambos permitidos por la
  config de ESLint).

## Pendientes para el humano / reviewer

1. **Aplicar `e2e/fixtures/test-plan.sql`** en el SQL editor de Supabase y
   re-correr `./init.sh e2e` para ejercitar el camino con rutina (R1/R3/R6
   end-to-end reales) y la verificación manual en el teléfono.
2. Reviewer: validar trazabilidad y aprobar en `progress/review_03_today_view.md`.
