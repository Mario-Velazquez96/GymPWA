# Tasks — 08_weight_units

> Orden de implementación. Cada tarea cita el/los requisito(s) que satisface.
> Marca `[x]` al completarla. No empieces hasta que el humano apruebe el spec.

## 1. Núcleo puro (sin React)

- [x] Crear `src/lib/units.ts` con `WeightUnit`, `LB_IN_KG = 0.45359237`,
      `WEIGHT_STEP` (`kg: 2.5`, `lb: 5`), `WEIGHT_GRAIN` (`kg: 0.5`,
      `lb: 0.1`), `toKg`, `fromKg`, `quantize` y `formatWeight` (R4, R5, R6, R7)
- [x] Añadir `validateWeight(value, unit)` con los mensajes en español por
      violación ("El peso no puede ser negativo", "El peso debe ir en pasos de
      0.5 kg", "El peso debe ir en pasos de 0.1 lb") (R9)
- [x] Añadir la persistencia segura `UNIT_STORAGE_PREFIX`, `readExerciseUnit`,
      `writeExerciseUnit`, con `try/catch` en **todo** acceso a `localStorage`,
      valor desconocido/corrupto → `"kg"` y escritura best-effort que nunca
      propaga (R2, R3, R13)
- [x] **Tests unitarios** `src/lib/units.test.ts`: tabla de conversión y el caso
      del contrato 45 lb → 20.41 kg → "45 lb" (R7); **ida y vuelta** lb→kg→lb
      sobre `0, 2.5, 5, 10, 20, 25, 35, 45, 50, 70, 90, 95, 100, 135, 185, 225,
      315` y kg→display→kg sobre `0, 2.5, 5, 10, 20, 22.5, 40, 60, 100` (R8);
      `formatWeight` con/sin unidad y sin ceros de cola (R6); matriz de
      `validateWeight` por unidad, incluyendo que 20.41 kg es **válido en lb** e
      **inválido en kg** (R9); storage ausente / corrupto / que **lanza** en
      `getItem` y en `setItem` (R3, R13)

## 2. Adaptación de la lógica de registro

- [x] Modificar `src/lib/logging.ts`: `validateSet(values, unit: WeightUnit =
      "kg")` delegando el peso en `validateWeight(fromKg(weight_kg, unit),
      unit)`; `WEIGHT_STEP_KG` como alias de `WEIGHT_STEP.kg`; eliminar el
      `formatKg` sin unidad (superseded por `formatWeight`). `resolvePrefill` y
      `buildInitialRows` **no se tocan** (R9, R10, R15)
- [x] Modificar `src/lib/utils.ts`: `formatKg(v)` delega en
      `formatWeight(v, "kg")`, misma firma y mismo contrato de 06 R7 (R15)
- [x] **Tests unitarios** en `src/lib/logging.test.ts`: `validateSet` sin
      segundo argumento se comporta idéntico a 05; con `"lb"` acepta 20.41 kg
      (45 lb) y sigue rechazando negativos y reps inválidas; eliminar el
      `describe("formatKg")` de la función suprimida (R9, R15)

## 3. Estado y UI de la preferencia

- [x] Crear `src/hooks/useExerciseUnit.ts`: estado inicial perezoso desde
      `readExerciseUnit`, re-lectura al cambiar `exerciseId`, setter que
      persiste best-effort (R2, R3, R13)
- [x] Crear `src/components/UnitToggle.tsx`: `role="group"` con
      `aria-label="Unidad de peso"`, botones "kg"/"lb" con `aria-pressed`,
      `min-h-11 min-w-11`, marcado visual del activo (R1)
- [x] **Tests de componente/hook**: `UnitToggle` (render, `aria-pressed`,
      click, tamaño mínimo) (R1); `useExerciseUnit` vía `renderHook` (default
      kg, persistencia, cambio de `exerciseId`, `localStorage` roto) (R2, R3,
      R13)

## 4. Pantalla de ejercicio (registro)

- [x] Modificar `src/components/SetRow.tsx`: prop `unit`; stepper de peso con
      `value={fromKg(row.weight_kg, unit)}`, `step={WEIGHT_STEP[unit]}`,
      `unit={unit}` y `onChange={(v) => onWeightChange(toKg(quantize(v, unit),
      unit))}`; "Anterior" vía `formatWeight(previous.weight_kg, unit)`
      (R4, R5, R6, R10)
- [x] Modificar `src/hooks/useWorkoutLog.ts`: segundo parámetro `unit`,
      `validateSet({...}, unit)` en `saveRow` (+ deps); el payload de `logSet`
      sigue enviando el `weight_kg` del estado, sin conversión extra (R9, R14)
- [x] Modificar `src/components/LoggingSection.tsx`: `useExerciseUnit(
      planExercise.exercise_id)`, `<UnitToggle>` junto al encabezado "Registro
      de series", `unit` a `useWorkoutLog` y a cada `SetRow` (R1, R2, R6)
- [x] **Tests de componente** `SetRow.test.tsx`: "Anterior" con unidad en kg y
      en lb; entrada directa "45" en lb → `onWeightChange(20.41)`; entrada
      "45.37" → cuantiza a 45.4 lb → 20.59 kg (R5, R6, R7)
- [x] **Tests de componente** `LoggingSection.test.tsx`: con `"lb"` guardado, la
      fila muestra lb y el stepper sube ±5 (R4, R6); guardar 45 lb llama a
      `logSet` con `weight_kg: 20.41` (R7, R9, R14); **togglear la unidad con
      una fila editada no altera el kg subyacente ni resetea estado/mensaje**
      (R11); en kg el comportamiento es idéntico a 05 (R15)

## 5. Pantalla de historial

- [x] Modificar `src/components/SessionCard.tsx` (prop `unit` →
      `formatWeight`) y `src/screens/HistoryScreen.tsx` (lee la preferencia con
      `useExerciseUnit`, **sin toggle propio**) (R12)
- [x] **Tests de componente**: `SessionCard` en ambas unidades y
      `HistoryScreen` con la preferencia "lb" guardada → "Serie 1 — 45 lb × 10"
      (R12, R15)

## 6. E2E y verificación del contrato

> ⚠️ **Actualizado durante la implementación.** La BD dejó de ser de prueba
> (catálogo real de 1324 ejercicios + plan REAL activo + ~154 series reales del
> usuario), así que el patrón original de estas tareas —ejercicio de fixture
> hardcodeado `'0003'` y limpieza con `DELETE
> workout_logs?exercise_id=eq.<id>&performed_at=eq.<hoy>`— quedó **prohibido**:
> escribiría en el ejercicio real de hoy y ese filtro puede borrar series que el
> usuario registró él mismo. Lo que sigue describe lo que el código hace hoy.

- [x] Crear `e2e/units.spec.ts` **agnóstico del plan**, con helpers compartidos
      en `e2e/helpers.ts`: `test.skip` sin credenciales o sin un día de
      entrenamiento con suficientes ejercicios, login, y **ejercicio objetivo
      derivado del DOM** (3ª card de HOY → `exercise_id` leído del enlace
      "Ver historial"; 05 usa la 1ª y 06 la 2ª, sin colisiones en paralelo).
      Sin ningún id de ejercicio hardcodeado (R2, R6)
- [x] **Limpieza ID-precisa**: antes de escribir, `snapshotLogs()` fotografía
      los `id` existentes de (ejercicio, fecha); en `afterEach` —para que corra
      aunque la aserción falle a mitad— `deleteCreatedLogs()` borra
      **exclusivamente los ids que aparecieron después**, vía
      `DELETE /rest/v1/workout_logs?id=in.(…)`. **Nunca** se borra por filtro de
      `exercise_id`/`performed_at`, y un tope de seguridad aborta sin borrar
      nada si aparecieran más filas nuevas de las que un spec puede crear
- [x] E2E flujo lb: pulsar "lb" → teclear 45 → "Guardar serie" → "✓ Guardada"
      con "45 lb" → **recargar**: sigue en lb y sigue mostrando "45 lb" →
      "Ver historial" muestra la serie en lb y sin toggle propio (R2, R6, R12).
      Si el usuario ya completó sus series de hoy, la fila de trabajo se crea
      con el "Agregar serie" de la propia app (set_number nuevo, borrado por id)
- [x] E2E **verificación del contrato**: se releen las filas de (ejercicio, hoy)
      y se comprueba que la única fila NUEVA —la que creó el spec— cumple
      `expect(Number(row.weight_kg)).toBe(20.41)` — capturado en lb, almacenado
      en kg (R14)
- [x] Verificar por inspección que `supabase/migrations/`, `src/services/` y
      `.env.example` quedaron **sin cambios** y que no se añadió ninguna
      dependencia ni ninguna regla de service worker (R14, R16)

## 7. Cierre

- [x] Correr `./init.sh` (typecheck + lint + test con coverage + build) y
      `./init.sh e2e`; ambos en verde, incluidas **sin cambios de
      comportamiento** las suites de 05 y 06 (R15)
- [x] Registrar el avance en `progress/impl_08_weight_units.md` (decisiones,
      resultados de las corridas, notas de iOS si aplican)

## Verification

- **Trazabilidad R → test:**
  R1 → `UnitToggle.test.tsx`; R2 → `useExerciseUnit` + `e2e/units.spec.ts`
  (recarga); R3 → `units.test.ts` (default/corrupto) + suites 05/06 en kg;
  R4 → `LoggingSection.test.tsx` (paso ±5 lb / ±2.5 kg); R5 → `SetRow.test.tsx`
  (entrada directa y cuantización); R6 → `SetRow` + `SessionCard` +
  `e2e/units.spec.ts`; R7 → `units.test.ts` (conversión/redondeo) +
  `LoggingSection.test.tsx` (payload 20.41); R8 → test de ida y vuelta;
  R9 → `units.test.ts#validateWeight` + `logging.test.ts#validateSet`;
  R10 → tests de prefill/"Anterior" de 05 vigentes + `SetRow.test.tsx`;
  R11 → `LoggingSection.test.tsx` (toggle con fila editada);
  R12 → `HistoryScreen.test.tsx` + e2e; R13 → `units.test.ts` (storage que
  lanza) + `useExerciseUnit`; R14 → aserción REST del e2e sobre la fila NUEVA
  (limpieza ID-precisa) + inspección de `supabase/migrations/`; R15 → suites 05/06 verdes; R16 → inspección de
  `package.json`, `.env.example` y config PWA.
- **Coverage:** ≥ 85% líneas en `src/lib/units.ts`,
  `src/hooks/useExerciseUnit.ts` y la lógica modificada de `src/lib/logging.ts`
  (camino de escritura central); ≥ 80% en el resto de lo tocado.
- **Manual en el iPhone:** un ejercicio de mancuernas en lb y otro en kg abiertos
  uno tras otro conservan cada uno su unidad; el toggle se opera con el pulgar.
