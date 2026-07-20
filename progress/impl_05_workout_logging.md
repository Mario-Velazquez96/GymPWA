# Implementación — 05_workout_logging

**Estado:** COMPLETO (pendiente de revisión del reviewer)
**Fecha:** 2026-07-19

## Qué cambió

La rebanada de escritura de la app (RF-4/RF-5): sección "Registro de series"
en la pantalla Ejercicio con una fila por serie objetivo, comparación
"Anterior" contra la última sesión, prefill, steppers de una mano y un insert
inmediato por serie guardada. `workout_logs` sigue siendo la ÚNICA tabla que la
app escribe, y solo desde `services/logs.ts`. Cero migraciones, cero
dependencias nuevas, cero env vars nuevas.

Ítems abiertos ya resueltos por el humano (2026-07-18) y aplicados tal cual:
prefill fallback = primer número de `target_reps`, si no 10; SIN editar/borrar
series guardadas en el MVP; `performed_at` = fecha local del dispositivo vía
`todayLocalISO()` (nunca el default de la BD).

### Archivos nuevos

- `src/services/logs.ts` — único escritor de la app (R9):
  - `getPreviousSession(exerciseId, beforeISO)`: `.lt('performed_at', beforeISO)`
    + order fecha desc / set_number asc + `limit(10)`, y filtro en cliente a
    las filas del `performed_at` máximo devuelto (la "última sesión", R2).
  - `getSessionSets(exerciseId, isoDate)`: series de una fecha exacta
    ordenadas por `set_number` (R8).
  - `logSet(input: NewLog)`: `insert({...input, user_id})` con el `user_id`
    de la sesión viva (`auth.getSession()`) + `.select().single()` — sin
    optimismo: la fila solo queda "guardada" con respuesta confirmada (R5).
  - Errores en español: `LOGS_ERROR_LOAD` ("No se pudieron cargar las
    series") y `LOGS_ERROR_SAVE` ("No se pudo guardar la serie, reintenta");
    detalle crudo solo a `console.debug` en dev (patrón aprobado en 02–04).
- `src/lib/logging.ts` — lógica pura unit-testeable:
  - `validateSet({weight_kg, reps})`: peso ≥ 0 ∧ peso×2 entero ∧ reps entero
    ≥ 1, mensaje en español por violación (R7).
  - `resolvePrefill`: serie n de la sesión anterior → fila n−1 de la UI
    actual → `{ peso 0, reps: firstNumber(target_reps) ?? 10 }` (R3).
  - `buildInitialRows`: guardadas de hoy (estado `saved`, ordenadas) ++
    editables hasta `target_sets` con su prefill (R1, R8).
  - `firstNumber`, `formatKg`, `SetRowState` (máquina
    `editable → saving → saved | error`), constantes `WEIGHT_STEP_KG = 2.5`,
    `REPS_STEP = 1`, `DEFAULT_REPS = 10`.
- `src/components/Stepper.tsx` — botones −/+ `min-h-11 min-w-11`, clamp al
  mínimo, redondeo a 2 decimales; valor central tappable → `<input
  inputmode="decimal">` con commit en blur/Enter, coma decimal aceptada,
  entrada inválida revierte sin `onChange` (R4).
- `src/components/SetRow.tsx` — presentacional: "Serie N", columna
  "Anterior: 22.5 × 10 | —" (R2), dos Steppers (peso ±2.5 kg min 0, reps ±1
  min 1), "Guardar serie" ≥ 44px con la máquina de estados: saving →
  deshabilitado + "Guardando…" (R10); saved → "✓ Guardada" deshabilitado
  (R5); error → editable con valores intactos + mensaje inline (R6/R7).
- `src/hooks/useWorkoutLog.ts` — carga en paralelo sesión anterior + series
  de hoy (clave id#intento, patrón de 03/04), inicializa filas con
  `buildInitialRows`, y gobierna `updateRow` / `saveRow` / `addRow`.
  `saveRow`: valida (R7) → inserta con `performed_at = todayLocalISO()` (R5)
  → saved/error. Guard anti doble-tap: `Set` síncrono en ref por
  `set_number` — dos taps antes del re-render no producen dos inserts (R10),
  además del botón deshabilitado.
- `src/components/LoggingSection.tsx` — sección con estados explícitos:
  "Cargando series…" / error + "Reintentar" / filas + "Agregar serie"
  (≥ 44px) que agrega la fila N+1 con su prefill (R1).
- Tests nuevos: `src/services/logs.test.ts`, `src/lib/logging.test.ts`,
  `src/components/Stepper.test.tsx`, `src/components/SetRow.test.tsx`,
  `src/components/LoggingSection.test.tsx` (hook y componentes reales,
  services mockeados en su frontera), `e2e/logging.spec.ts`.

### Archivos tocados

- `src/lib/types.ts` — nuevo `WorkoutLog` espejo de §3.5 (contrato entre
  repos intacto; sin cambios a formas existentes).
- `src/screens/ExerciseScreen.tsx` — monta `<LoggingSection
  planExercise={detail} />` bajo la sección Instrucciones (R1).
- `src/screens/ExerciseScreen.test.tsx` — mock de `@/services/logs`, test
  del montaje de la sección, y el test de pasos ahora distingue la `<ol>` de
  pasos de la `<ul>` de series.
- `specs/05_workout_logging/tasks.md` — todas las tareas `[x]`.
- (nada más: sin migraciones, sin cambios de RLS/auth, sin `.env.example`,
  sin dependencias.)

### E2E y datos reales

`e2e/logging.spec.ts`: login → Hoy → primer ejercicio del fixture ('0001') →
sube el peso de la serie 1 con el stepper (0 → 5 kg) → guarda series 1 y 2 →
recarga → ambas renderizan "✓ Guardada" con los valores persistidos y quedan
2 filas editables (R5, R8). **Escribe filas reales en `workout_logs`**
(esperado y aprobado): se limpia al INICIO (restos de corridas fallidas) y al
FINAL (las filas creadas) borrando las filas de HOY del ejercicio '0001' vía
la API REST de Supabase con el access token de la sesión del navegador (RLS
acota el delete a filas propias). El delete vive SOLO en el spec e2e — los
services de la app no tienen delete, a propósito (R9). Guards: se salta con
mensaje claro sin credenciales/env o con "Sin plan activo" (fixture retirado).

## Trazabilidad R<n> → prueba

| Req | Prueba |
| --- | --- |
| R1 | `LoggingSection.test.tsx > "R1: renderiza target_sets filas numeradas desde 1"` y `"R1: 'Agregar serie' agrega la fila 5…"`; `logging.test.ts > buildInitialRows > "sin series guardadas crea target_sets filas…"`; `ExerciseScreen.test.tsx > "05/R1: monta la sección…"`; `logging.spec.ts` paso "abrir el primer ejercicio" (4 filas) |
| R2 | `logs.test.ts > getPreviousSession` (forma de query + `"con filas de varias fechas filtra…a la fecha máxima"`); `LoggingSection.test.tsx > "R2: cada fila muestra 'Anterior: peso × reps'…o '—'"`; `SetRow.test.tsx > describe "columna Anterior"` |
| R3 | `logging.test.ts > resolvePrefill` (cadena completa: match / fila n−1 / fallback "8-12"→8 / "al fallo"→10) y `firstNumber`; `LoggingSection.test.tsx > "R3: prefill desde la sesión anterior…"` y `"R3: sin historial, peso 0 kg y reps = primer número…"` |
| R4 | `Stepper.test.tsx` completo (±2.5/±1, clamp a min 0/1, entrada directa con Enter/blur/coma/clamp/revert, targets ≥ 44px, disabled); `SetRow.test.tsx > "los steppers…propagan los cambios"` y `"'Guardar serie'…mide ≥ 44px"`; `logging.spec.ts` paso R5 (stepper real) |
| R5 | `logs.test.ts > logSet > "inserta EXACTAMENTE una fila con user_id…y performed_at local"`; `LoggingSection.test.tsx > "R5: guardar inserta exactamente una fila con la fecha local y marca ✓"` (payload completo con `todayLocalISO()`); `SetRow.test.tsx > "saved: muestra '✓ Guardada'…"`; `logging.spec.ts` pasos R5 |
| R6 | `logs.test.ts > logSet` (fallo insert / excepción de red → mensaje español, nunca el crudo); `LoggingSection.test.tsx > "R6: fallo → mensaje en español, valores intactos, reintento con un solo insert extra"`; `SetRow.test.tsx > "error: mensaje inline…valores intactos…reintentar"` |
| R7 | `logging.test.ts > validateSet` (matriz: 4 válidos + 10 inválidos con su mensaje); `LoggingSection.test.tsx > "R7: peso fuera de pasos de 0.5 bloquea el guardado sin llamar al servicio"` |
| R8 | `logs.test.ts > getSessionSets` (forma de query); `logging.test.ts > buildInitialRows` (guardadas → saved, extra > target_sets, orden); `LoggingSection.test.tsx > "las series ya guardadas hoy se renderizan como ✓ con sus valores"`; `logging.spec.ts` paso R8 (recarga real) |
| R9 | Grep audit: `.insert(`/`.update(`/`.delete(`/`.upsert(` sobre supabase → SOLO `services/logs.ts:135` (`insert` en `workout_logs`); todos los `.from(` en `services/`; `logs.test.ts` verifica `from("workout_logs")` en las 3 funciones |
| R10 | `LoggingSection.test.tsx > "R10: doble tap con el insert en vuelo produce UN solo insert"` (dos `fireEvent.click` síncronos → 1 llamada, botón "Guardando…" deshabilitado); `SetRow.test.tsx > "saving: botón 'Guardando…' deshabilitado y steppers bloqueados"` |

## Verificación

- `./init.sh` (install → typecheck → lint → test → build): **verde**.
- `./init.sh e2e`: **verde** — 6 specs (smoke, 2×auth, today, exercise,
  **logging**). `logging.spec.ts` corrió contra la BD real con el fixture:
  guardó 2 filas, verificó persistencia tras recarga y las borró al final
  (limpieza REST confirmada con status OK). Nota: una corrida previa falló
  transitoriamente en la carga de Hoy en 3 specs (error de red puntual de la
  BD real, también en specs de 03/04); re-corrida limpia.
- Cobertura (vitest v8, umbral global 80; objetivo 05 ≥ 85 en sus módulos):
  `services/logs.ts` **100%** líneas, `lib/logging.ts` **100%** líneas
  (src/lib 100%), `useWorkoutLog.ts` 95.2%, `Stepper.tsx` 95%,
  `SetRow.tsx`/`LoggingSection.tsx` ~86–100%. Global: **97.0%** líneas.
  **218 tests, 23 archivos, todos pasan.**
- Sin migraciones ni cambios de RLS (las policies de `workout_logs` de 01 ya
  cubren insert/select propios); sin env vars ni dependencias nuevas; sin
  `console.log` ni `any` (solo `console.debug` dev-only en el service).
- Texto 100% en español, pesos en kg (`formatKg`), targets táctiles ≥ 44px.

## Pendientes para el humano / reviewer

1. Reviewer: validar trazabilidad y aprobar en
   `progress/review_05_workout_logging.md`.
2. Manual (teléfono, red estrangulada — tasks.md > Verificación): guardar con
   datos inestables → error en español, valores intactos, reintento con una
   sola fila en la tabla; steppers cómodos con el pulgar.
3. La limpieza e2e borra las filas de HOY del ejercicio de fixture '0001' del
   usuario E2E (superconjunto mínimo de lo que crea el spec, idempotente para
   re-corridas). Si algún día se registran series reales en '0001' el mismo
   día que corre el e2e, se borrarían — aceptable mientras '0001'–'0003' sean
   ejercicios placeholder del fixture.
