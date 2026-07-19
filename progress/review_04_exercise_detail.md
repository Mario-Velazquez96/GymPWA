# Review — 04_exercise_detail

**Verdict: APPROVE**
**Reviewer:** reviewer subagent · **Fecha:** 2026-07-19

## Qué se verificó

### 1. Trazabilidad R1–R10 (leyendo los tests, no solo la tabla)

- **R1** — `exercises.test.ts` afirma la forma exacta de la query
  (`from("plan_exercises")`, `select("*, exercises(*)")`, `eq("id", …)`,
  `maybeSingle`); `ExerciseScreen.test.tsx` afirma que se llama con el id de
  la URL y que el `name` del join es el `h1`; `exercise.spec.ts` lo repite
  contra la BD real.
- **R2** — `ExerciseMedia.test.tsx`: caja `aspect-square max-w-[240px]` fija
  (sin salto de layout), alt en español "Demostración de …", GIF arranca
  `opacity-0` y pasa a `opacity-100` en `fireEvent.load` (swap real, no solo
  clases estáticas); pantalla y e2e afirman la caja presente.
- **R3** — orden verificado con `getAllByRole("listitem")` → array exacto en
  `ExerciseScreen.test.tsx` e `InstructionSteps.test.tsx` (`tagName === "OL"`,
  `list-decimal`); e2e afirma los 2 pasos del fixture en orden.
- **R4** — "4 × 8-12" + "Descanso: 120 s" con `rest_seconds`, y test negativo
  (`rest_seconds: null` → sin línea de descanso); e2e afirma "Descanso: 90 s"
  (coincide con el fixture `rest_seconds = 90`).
- **R5** — chips `equipment`/`target`, notas presentes y test negativo sin
  notas.
- **R6** — link "© Gym visual — https://gymvisual.com/" con `href` correcto;
  también en e2e.
- **R7** — service: `data: null` sin error (id inexistente / RLS) y `22P02`
  (id no-uuid) → no-encontrado, nunca estado de error; pantalla: mensaje
  "Ejercicio no encontrado" + "Volver a Hoy" que navega de verdad
  (userEvent.click → heading "Hoy").
- **R8** — link "Volver" del header con `href="/"` y navegación real en el
  test de componente; e2e vuelve a Hoy contra la BD real.
- **R9** — estado de carga (`role=status`, promesa pendiente), error con
  "Reintentar" que recarga (mockResolvedValueOnce → éxito), y en el service
  el error crudo de Postgrest nunca llega a la UI (assert explícito).
- **R10** — grep `.from(` en `src/` → solo `services/plans.ts` y
  `services/exercises.ts`; el test de pantalla mockea el service en su
  frontera; targets táctiles `min-h-11`/`min-w-11` afirmados (volver y
  Reintentar); todo el texto de UI en español.

### 2. Tareas

Las 9 tareas de `tasks.md` están `[x]` y verificadas contra el código real:
`maybeSingle` con camino null, `PlanExerciseDetail = PlanExercise +
exercises: Exercise` (composición de tipos de 03, contrato §3 intacto),
caja `aspect-square`, controles `min-h-11`.

### 3. Checks (ejecutados por el reviewer)

- `./init.sh` (install → typecheck → lint → test+coverage → build): **verde**.
  126 tests / 18 archivos, todos pasan. Build emite manifest + SW.
- Cobertura ≥ 80% del objetivo de `tasks.md`: `services/exercises.ts`
  **100%** líneas, `screens/ExerciseScreen.tsx` **100%** líneas
  (global 97.01%).
- `./init.sh e2e`: **verde**, 5 passed / 0 skipped — `exercise.spec.ts`
  corrió el camino con **fixture aplicado** (no se saltó): detalle abierto
  desde Hoy, pasos, metas, atribución, volver.

### 4. Degradación de media

Con las URLs placeholder del fixture: `onError` del GIF y del thumbnail
retiran la imagen rota y la caja `bg-slate-800` permanece (tests de
componente dedicados); sin spinner infinito (no hay spinner ligado a la
media). El e2e afirma la caja visible con la media placeholder real.

### 5. Convenciones y seguridad

- UI 100% español; sin `any`, sin `console.log` (solo `console.debug`
  dev-only en el service, patrón ya aprobado en 03).
- `git diff`: solo `src/lib/types.ts` (tipo aditivo), `ExerciseScreen.tsx`,
  archivos nuevos de la feature, `tasks.md` y `feature_list.json`
  (`spec_ready` → `in_progress`). **Sin** cambios a `supabase/`,
  `package.json`, `.env.example`, auth ni RLS. Sin secretos.
- Ruta `/ejercicio/:planExerciseId` ya existía tras `ProtectedRoute`.

### 6. Alcance

Solo lectura: cero escrituras, sin UI de registro (05), sin entrada a
historial (06), sin caching de GIF (07). Nada fuera del spec.

## Observaciones (no bloqueantes)

1. El mapeo `22P02` → no-encontrado es una extensión razonable del design
   ("param opaco") que cumple el criterio de aceptación de R7 (id chatarra
   en la URL); está documentado y testeado.
2. Queda la verificación manual en iPhone (throttle, sin salto de layout)
   anotada en `tasks.md > Verificación` — no bloquea el cierre.

## Conclusión

Todos los requisitos trazan a tests que ejercitan el comportamiento real,
las tareas están hechas, los checks están verdes con cobertura sobrada y no
hay violaciones de convenciones, seguridad ni alcance.

**El líder puede marcar `04_exercise_detail` como `done`.**
