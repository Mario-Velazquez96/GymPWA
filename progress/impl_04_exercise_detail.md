# Implementación — 04_exercise_detail

**Estado:** COMPLETO (pendiente de revisión del reviewer)
**Fecha:** 2026-07-19

## Qué cambió

Pantalla Ejercicio real (RF-3), solo lectura: reemplaza al placeholder con
GIF + placeholder sin saltos de layout, metas del plan, chips, notas, pasos
numerados en español y atribución Gym Visual. Cero escrituras, cero
migraciones, cero dependencias nuevas, ninguna variable de entorno nueva.

### Archivos nuevos

- `src/services/exercises.ts` — `getPlanExerciseDetail(planExerciseId)` con el
  patrón `Result<T>` (importado de `services/plans`):
  `plan_exercises.select('*, exercises(*)').eq('id', id).maybeSingle()`.
  `data: null` sin error cubre id inexistente **y** filas filtradas por RLS
  (mismo camino de render). El error Postgres `22P02` (id no-uuid en la URL,
  p. ej. `/ejercicio/chatarra`) también se mapea a "no encontrado" para que un
  id chatarra nunca caiga en el estado de error (criterio de aceptación R7).
  Error único `EXERCISES_ERROR_LOAD = "No se pudo cargar el ejercicio"`;
  detalles solo a `console.debug` en dev.
- `src/services/exercises.test.ts` — forma de query, encontrado / null /
  22P02 / error crudo nunca expuesto / excepción de red / cliente `null`.
- `src/components/ExerciseMedia.tsx` — caja `aspect-square max-w-[240px]`
  (fuente 180×180) con fondo `bg-slate-800`; thumbnail (`image_url`,
  decorativo `alt=""`) debajo y GIF (`gif_url`,
  `alt="Demostración de {name}"`) encima con swap de opacidad en `onLoad`.
  Degradación con las URLs placeholder del fixture: `onError` retira la
  imagen rota y la caja permanece — sin crash, sin spinner infinito.
- `src/components/ExerciseMedia.test.tsx` — caja fija, alt en español, swap
  opacity-0→100 en load, error del GIF y del thumbnail (la caja permanece).
- `src/components/InstructionSteps.tsx` — `<ol class="list-decimal">` con los
  pasos de `instruction_steps_es` en orden; caso borde sin pasos → "Sin
  instrucciones disponibles".
- `src/components/InstructionSteps.test.tsx` — orden de pasos + caso vacío.
- `src/screens/ExerciseScreen.test.tsx` — service mockeado en su frontera:
  render completo (título, pasos en orden, metas con/sin `rest_seconds`,
  chips, notas con/sin, atribución con href), no-encontrado + "Volver a Hoy"
  navega, carga, error + "Reintentar" recarga, volver del header, targets
  táctiles ≥ 44px.
- `e2e/exercise.spec.ts` — login → Hoy → tap primera card → detalle (título
  h1, caja de media presente, 2 pasos numerados, "4 × 8-12", "Descanso: 90 s",
  atribución) → volver regresa a Hoy. Guard: sin credenciales o con "Sin plan
  activo" (fixture retirado) se salta con mensaje claro, no falla. No afirma
  que el GIF cargue (la media del fixture es placeholder que puede no
  renderizar).

### Archivos tocados

- `src/lib/types.ts` — nuevo `PlanExerciseDetail` (`PlanExercise` +
  `exercises: Exercise` completo). Sin cambios a las formas existentes
  (contrato entre repos intacto).
- `src/screens/ExerciseScreen.tsx` — reescrito desde el placeholder: header
  con volver (`aria-label="Volver"`, `min-h-11 min-w-11`, `Link to="/"`) y
  `h1` con el nombre; cuerpo con `ExerciseMedia`, `TargetBadge` local
  ("4 × 8-12 · Descanso: N s", descanso solo si `rest_seconds ≠ null`), chips
  de `equipment`/`target`, callout de `notes` cuando existen, sección
  "Instrucciones" con `InstructionSteps` y `Attribution` local (link
  "© Gym visual — https://gymvisual.com/"). Estados: "Cargando ejercicio…"
  (role=status) / error + "Reintentar" / "Ejercicio no encontrado" + link
  "Volver a Hoy". La carga usa la clave `id#intento` (patrón de
  `usePlanDay`, sin setState síncrono en el efecto). Layout composable:
  header / media / info — la sección de registro de 05 se insertará debajo.
- `specs/04_exercise_detail/tasks.md` — todas las tareas `[x]`.
- (nada más: sin migraciones, sin cambios de RLS/auth/logging, sin
  `.env.example`, sin dependencias.)

## Trazabilidad R<n> → prueba

| Req | Prueba |
| --- | --- |
| R1 | `exercises.test.ts > "R1: consulta plan_exercises con join completo…"`; `ExerciseScreen.test.tsx > "R1: pide el detalle con el id de la URL y muestra el nombre como título"`; `exercise.spec.ts` paso R1 |
| R2 | `ExerciseMedia.test.tsx` completo (caja fija, alt español, swap en load, degradación en error); `ExerciseScreen.test.tsx > "R2: muestra el GIF con alt en español…"`; `exercise.spec.ts` paso R2/R3 (caja presente con media placeholder) |
| R3 | `ExerciseScreen.test.tsx > "R3: renderiza los pasos como lista ordenada numerada, en orden"`; `InstructionSteps.test.tsx` (orden + caso sin pasos); `exercise.spec.ts` paso R2/R3 |
| R4 | `ExerciseScreen.test.tsx > "R4: … 'Descanso: 120 s' cuando hay rest_seconds"` y `"R4: sin rest_seconds no muestra la línea de descanso"`; `exercise.spec.ts` paso R4/R6 |
| R5 | `ExerciseScreen.test.tsx > "R5: muestra chips…"`, `"R5: muestra las notas…"`, `"R5: sin notas no renderiza el callout"` |
| R6 | `ExerciseScreen.test.tsx > "R6: la atribución de Gym Visual es visible y enlaza a gymvisual.com"`; `exercise.spec.ts` paso R4/R6 |
| R7 | `exercises.test.ts > "R7: id inexistente o filtrado por RLS…"` y `"R7: id chatarra (no uuid, error 22P02)…"`; `ExerciseScreen.test.tsx > describe "no encontrado (R7)"` (mensaje + "Volver a Hoy" navega) |
| R8 | `ExerciseScreen.test.tsx > "R8: el control de volver del header enlaza a '/' y regresa a Hoy"`; `exercise.spec.ts` paso R8 (volver → Hoy contra la BD real) |
| R9 | `ExerciseScreen.test.tsx > "R9: estado de carga"` y `"R9: en fallo… 'Reintentar' recarga"`; `exercises.test.ts > "R9: mapea…"` ×2 (error crudo nunca en la UI) |
| R10 | grep `.from(` en `src/` → solo `services/plans.ts` y `services/exercises.ts` (0 fuera de services); `ExerciseScreen.test.tsx > "R10: el control de volver tiene target táctil ≥ 44px"`; todo el texto de la pantalla en español |

## Verificación

- `./init.sh` (install → typecheck → lint → test → build): **verde**.
- `./init.sh e2e`: **verde** — 5 specs (smoke, 2×auth, today, **exercise**).
  `exercise.spec.ts` corrió el camino con **fixture aplicado** contra la BD
  real: detalle del 'Ejercicio E2E 1 — press de banca' renderizado con media
  placeholder degradada (sin crash) y volver regresó a Hoy.
- Cobertura (vitest v8, umbral global 80): `services/exercises.ts` **100%**
  líneas, `screens/ExerciseScreen.tsx` **100%** líneas, `ExerciseMedia` /
  `InstructionSteps` 100%. Global: 97.0% líneas. 126 tests, 18 archivos,
  todos pasan.
- Sin migraciones, sin cambios de RLS, sin env vars nuevas, sin dependencias
  nuevas, sin `console.log` ni `any` (solo `console.debug` dev-only en el
  service, mismo patrón aprobado en 03).
- Nota iOS pendiente de verificación manual en el teléfono: GIF sin salto de
  layout con red lenta (throttle), según `tasks.md > Verificación`.

## Pendientes para el humano / reviewer

1. Reviewer: validar trazabilidad y aprobar en
   `progress/review_04_exercise_detail.md`.
2. Manual (teléfono): abrir un ejercicio del día con throttling — la caja de
   media no debe saltar mientras carga el GIF. La media real llega cuando el
   repo Gym siembre el catálogo (hoy son URLs placeholder que degradan a caja
   sólida).
