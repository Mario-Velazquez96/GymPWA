# Impl progress — 08_weight_units

**Feature:** Registro y visualización en kg o lb (preferencia por ejercicio).
Status: `in_progress` (pendiente de revisión).
**Scope:** capa de presentación/entrada. **Sin migración SQL, sin cambio de RLS,
sin columna nueva, sin tocar `src/services/`, sin dependencias ni env vars
nuevas, sin cambios al service worker.** `workout_logs.weight_kg` sigue
guardando **kilogramos** — el contrato con el repo `Gym` queda intacto (R14).

## Decisiones del humano aplicadas tal cual (los 3 open items del spec)

1. Granularidad de lb = **0.1 lb**, display a 1 decimal, y **la regla de 0.5 kg
   NO se aplica en modo lb** (45 lb = 20.41 kg guarda sin error).
2. La pantalla **Historial no lleva toggle propio**: solo lee la preferencia
   guardada por ejercicio.
3. La columna **"Anterior" ahora lleva la unidad en ambos modos**. Se
   actualizaron los dos literales de aserción (`SetRow.test.tsx`,
   `LoggingSection.test.tsx`) y se eliminó el `formatKg` sin unidad de
   `lib/logging.ts` junto con su `describe`.

## What changed

- **`src/lib/units.ts` (nuevo, puro):** `WeightUnit`, `LB_IN_KG = 0.45359237`,
  `WEIGHT_STEP` (`kg: 2.5`, `lb: 5`), `WEIGHT_GRAIN` (`kg: 0.5`, `lb: 0.1`),
  `toKg` (→ 2 decimales, compatible con `numeric(6,2)`), `fromKg` (kg → unidad,
  1 decimal en lb), `quantize` (solo lb), `formatWeight` (con/sin unidad, sin
  ceros de cola), `validateWeight` (mensajes en español por unidad) y la
  persistencia `UNIT_STORAGE_PREFIX` / `readExerciseUnit` / `writeExerciseUnit`
  con `try/catch` en **todo** acceso a `localStorage` (incluido el propio getter
  de `globalThis.localStorage`) → degrada a kg y nunca propaga (R13).
- **`src/lib/logging.ts`:** `validateSet(values, unit: WeightUnit = "kg")`
  delega el peso en `validateWeight(fromKg(weight_kg, unit), unit)`; el check de
  reps queda igual. `WEIGHT_STEP_KG` pasa a ser alias de `WEIGHT_STEP.kg`. Se
  eliminó el `formatKg` sin unidad. `resolvePrefill` / `buildInitialRows` **sin
  tocar** (siguen operando en kg, R10).
- **`src/lib/utils.ts`:** `formatKg(v)` pasó primero a delegar en
  `formatWeight(v, "kg")` y finalmente **se eliminó** junto con su bloque de
  tests: tras migrar `SessionCard` a `formatWeight` se quedó sin llamadores de
  producción y CHECKPOINTS.md prohíbe exports muertos (observación no
  bloqueante del reviewer). El contrato de 06 R7 ("22 kg" / "22.5 kg", sin ceros
  de cola) sigue cubierto por `units.test.ts > formatWeight` y por
  `SessionCard.test.tsx`. `lib/utils.ts` queda solo con fechas y agrupación.
- **`src/hooks/useExerciseUnit.ts` (nuevo):** estado inicial perezoso desde
  `readExerciseUnit`, re-lectura al cambiar `exerciseId` y setter que persiste
  best-effort.
- **`src/components/UnitToggle.tsx` (nuevo):** `role="group"`
  `aria-label="Unidad de peso"`, botones "kg"/"lb" con `aria-pressed`,
  `min-h-11 min-w-11` y marcado visual del activo. Presentacional puro.
- **`src/components/SetRow.tsx`:** prop `unit`; el stepper de peso recibe
  `value={fromKg(row.weight_kg, unit)}`, `step={WEIGHT_STEP[unit]}`,
  `unit={unit}` y devuelve `toKg(quantize(v, unit), unit)` — es decir, **la fila
  sigue guardando kg** y solo cambia lo que se pinta/teclea. "Anterior" usa
  `formatWeight(previous.weight_kg, unit)`.
- **`src/hooks/useWorkoutLog.ts`:** segundo parámetro `unit`, usado únicamente
  en `validateSet(..., unit)` (+ deps del `useCallback`). El payload de `logSet`
  no cambia: sigue enviando el `weight_kg` del estado.
- **`src/components/LoggingSection.tsx`:** `useExerciseUnit(exercise_id)`,
  `<UnitToggle>` junto al encabezado "Registro de series", `unit` a
  `useWorkoutLog` y a cada `SetRow`.
- **`src/components/SessionCard.tsx`:** prop `unit` → `formatWeight`.
- **`src/screens/HistoryScreen.tsx`:** `const [unit] = useExerciseUnit(exerciseId ?? "")`
  y lo baja a cada `SessionCard`. **Sin toggle propio** (R12).
- **`e2e/units.spec.ts` (nuevo) + `e2e/helpers.ts` (nuevo):** el spec de 08 y el
  endurecimiento del test-infra que exigió la BD real (ver la sección de
  verificación E2E más abajo): ejercicio derivado del DOM, limpieza ID-precisa
  en `afterEach` y verificación REST de que la fila guardada es
  `weight_kg = 20.41`.

### Decisiones de implementación (menores, dentro del spec)

- `unit` es **opcional con default `"kg"`** en `SetRow`, `SessionCard` y
  `useWorkoutLog`. Es lo que permite que las suites de 05/06 sigan corriendo sin
  editar nada más que los dos literales de "Anterior" que el humano aprobó
  (R15), y refuerza R3 (kg es el default en todas partes).
- `useExerciseUnit` ajusta el estado **durante el render** cuando cambia
  `exerciseId` (patrón oficial de React para estado derivado de props) en vez de
  hacerlo en un `useEffect`: la regla `react-hooks/set-state-in-effect` de
  ESLint 10 rechaza la variante con efecto.
- El mensaje `"El peso debe ir en pasos de 0.1 lb"` es **inalcanzable a través
  de `validateSet`** por construcción (`fromKg(..., "lb")` ya redondea a la
  rejilla de 0.1 lb); vive en `validateWeight` como la regla explícita que pide
  R9 y está cubierto por test directo. Se documenta para que la revisión no lo
  lea como código muerto accidental.

## Requirement → test mapping

- **R1** (toggle "Unidad de peso", `aria-pressed`, ≥ 44px):
  `src/components/UnitToggle.test.tsx` > "renderiza el grupo 'Unidad de peso'…",
  "marca la unidad activa con aria-pressed…", "ambos botones cumplen el mínimo
  táctil de 44px"; `LoggingSection.test.tsx` > "R1: renderiza el toggle 'Unidad
  de peso' junto al encabezado, en kg por defecto".
- **R2** (preferencia por `exercise_id`, persistida, sobrevive la recarga):
  `src/lib/units.test.ts` > "escribe y relee la unidad bajo la clave
  gym:unit:<exercise_id>", "la preferencia es por ejercicio: no contamina a los
  demás"; `src/hooks/useExerciseUnit.test.tsx` > "arranca en la unidad guardada…",
  "cambiar la unidad actualiza el estado y la persiste…", "al cambiar de
  exerciseId relee la preferencia…"; `LoggingSection.test.tsx` > "R2: cambiar a
  lb persiste la preferencia…"; `e2e/units.spec.ts` (paso de recarga).
- **R3** (default kg / valor corrupto → kg): `units.test.ts` > "sin valor
  guardado la unidad es kg", "un valor corrupto ('%s') se lee como kg";
  `useExerciseUnit.test.tsx` > "sin preferencia guardada arranca en kg", "un
  valor corrupto…"; suites de 05/06 completas (siguen en kg).
- **R4** (±5 lb / ±2.5 kg, reps ±1): `units.test.ts` > "el stepper avanza ±2.5 kg
  y ±5 lb"; `SetRow.test.tsx` > "en lb el stepper avanza ±5 lb y devuelve
  kilogramos", "en lb el stepper baja ±5 lb y respeta el mínimo 0", "las reps no
  cambian con la unidad"; `LoggingSection.test.tsx` > "R4: en lb el stepper de
  peso sube de 5 en 5 libras", "en lb las repeticiones siguen avanzando de 1 en 1".
- **R5** (entrada directa interpretada en lb y cuantizada a 0.1):
  `units.test.ts` > describe "quantize — entrada directa";
  `SetRow.test.tsx` > "entrada directa '45' en lb… → 20.41 kg", "entrada directa
  '45.37' en lb se cuantiza a 45.4 lb → 20.59 kg", "entrada directa en kg
  conserva el valor tecleado sin cuantizar".
- **R6** (todo se muestra en la unidad activa, con etiqueta):
  `SetRow.test.tsx` > "en lb el peso se muestra convertido con su unidad", "en lb
  'Anterior' también lleva la unidad convertida", "una fila guardada en lb
  muestra su peso en lb"; `SessionCard.test.tsx` > "con unit='lb' lee la misma
  fila en libras…"; `LoggingSection.test.tsx` > "R2/R6: con 'lb' guardado…";
  `e2e/units.spec.ts`.
- **R7** (factor exacto, 2 decimales a kg / 1 a lb, sin ceros de cola):
  `units.test.ts` > "el caso del contrato: 45 lb → 20.41 kg → 45 lb",
  "toKg(%d lb) = %d kg", describe "formatWeight";
  `LoggingSection.test.tsx` > "R7/R9/R14: guardar 45 lb inserta weight_kg 20.41…".
- **R8** (ida y vuelta estable): `units.test.ts` > describe "ida y vuelta estable
  (R8)" — tabla `0…315 lb`, tabla `0…100 kg`, **toda** la rejilla de 0.1 lb entre
  0 y 320 lb, y la no-colisión de valores contiguos.
- **R9** (validación por unidad; en lb no aplica la regla de 0.5 kg):
  `units.test.ts` > describe "validateWeight — matriz por unidad", "20.41 (45 lb)
  es válido leído en lb e inválido leído en kg";
  `src/lib/logging.test.ts` > describe "validateSet — unidad activa (08 R9, R15)";
  `LoggingSection.test.tsx` > "R9: en lb NO se aplica la regla de 0.5 kg…".
- **R10** (prefill y "Anterior" siguen operando sobre kg): `logging.test.ts` >
  describes "resolvePrefill" y "buildInitialRows" (intactos de 05);
  `LoggingSection.test.tsx` > "R3: prefill desde la sesión anterior…" (05, sigue
  verde); `SetRow.test.tsx` > "sin prop `unit` se comporta como kg…".
- **R11** (togglear no altera el kg ni resetea la fila):
  `LoggingSection.test.tsx` > "R11: togglear con una fila editada re-renderiza el
  valor sin tocar el kg subyacente" (guarda y comprueba `weight_kg: 25`),
  "R11: togglear no borra el mensaje de error ni el estado de una fila fallida",
  "R11: las series ya guardadas hoy se releen en la nueva unidad, sin reguardar".
- **R12** (Historial lee la preferencia, sin toggle propio):
  `src/screens/HistoryScreen.test.tsx` > "R12: con 'lb' guardado para el
  ejercicio las sesiones se leen en libras", "R12: la preferencia es por
  ejercicio — otro id sigue en kg", "R12: la pantalla NO lleva toggle propio";
  `SessionCard.test.tsx` (ambas unidades); `e2e/units.spec.ts` (paso "Ver
  historial").
- **R13** (`localStorage` inaccesible → kg, sin error visible):
  `units.test.ts` > "si getItem lanza…", "si setItem lanza…", "sin localStorage
  en el entorno…", "si el propio acceso a localStorage lanza…";
  `useExerciseUnit.test.tsx` > "con localStorage roto arranca en kg y el toggle
  sigue vivo en memoria".
- **R14** (almacenamiento canónico en kg, sin migración):
  `LoggingSection.test.tsx` > "R7/R9/R14: guardar 45 lb inserta weight_kg 20.41…"
  y "R11: …al guardar sale el kg exacto que el usuario había editado";
  `e2e/units.spec.ts` > paso "R14: la fila creada está en KILOGRAMOS", que
  compara las filas de (ejercicio derivado del plan vivo, hoy) contra la foto de
  ids tomada antes de escribir y afirma `Number(weight_kg) === 20.41` sobre la
  **única fila nueva** — la que creó el spec, que luego borra por id en el
  `afterEach`; inspección: `git diff` no toca `supabase/migrations/` ni
  `src/services/`.
- **R15** (kg sigue siendo el default; 05/06 intactas): las 28 suites pasan
  (408 tests) con las dos únicas ediciones aprobadas;
  `LoggingSection.test.tsx` > "R15: sin preferencia guardada todo se ve en kg,
  exactamente como en 05" y "R7: en kg un peso fuera de pasos de 0.5 sigue
  bloqueando el guardado"; `SessionCard.test.tsx` > "sin prop `unit` mantiene el
  kg de 06"; `HistoryScreen.test.tsx` > "R12: sin preferencia guardada las
  sesiones se leen en kg".
- **R16** (sin deps / env vars / cambios de SW): `git diff --name-only` sobre
  `package.json`, `pnpm-lock.yaml`, `.env.example`, `vite.config.ts` y `public/`
  → **vacío**; el build sigue emitiendo el mismo precache (15 entries) y la
  misma regla de runtime-cache de `/storage/`.

## Verificación

- `./init.sh` (install → typecheck → lint → test con coverage → build):
  **verde**. 28 archivos de test, **408 tests** en verde.
- **Coverage** (v8, umbral global 80%): global **98.2% líneas**.
  Módulos de esta feature: `src/lib/units.ts` **100% líneas** (branch 95.45 — la
  única rama descubierta es el `import.meta.env.DEV` del canal de debug),
  `src/hooks/useExerciseUnit.ts` **100%**, `src/components/UnitToggle.tsx`
  **100%**, `src/lib/logging.ts` **100%**, `src/components/SetRow.tsx`,
  `LoggingSection.tsx`, `SessionCard.tsx` y `HistoryScreen.tsx` **100% líneas**.
  Objetivo de `tasks.md` (≥ 85% en el módulo nuevo y la lógica de validación)
  cumplido.
- `pnpm build`: OK — `dist/manifest.webmanifest` + `dist/sw.js`, precache de 15
  entradas, sin cambios de reglas.
- `./init.sh e2e`: **verde, 12/12 specs** contra el proyecto Supabase real (ver
  abajo el detalle y la prueba de que la BD quedó intacta).

### `./init.sh e2e`: VERDE — 12/12 specs

Historia de la corrida (queda registrada porque explica los cambios de test-infra):

1. **Primer intento: 7 specs en rojo, todos en el login.** Diagnóstico contra el
   proyecto real (sin imprimir secretos): `/auth/v1/health` → 200 y
   `GET /rest/v1/exercises` con la anon key → 200, pero
   `POST /auth/v1/token?grant_type=password` → **400 `invalid_credentials`**.
   Era la contraseña del usuario E2E, no el código (`e2e/auth.spec.ts`, que no
   toca 08, fallaba igual). **El humano la restableció.**
2. **Segundo intento: la BD cambió de naturaleza.** El repo `Gym` sembró el
   catálogo real (1324 ejercicios) y hay un plan REAL activo ("Recomposición en
   casa — Septiembre 2026", 2026-08-29 → 2026-09-27) con 154 filas reales en
   `workout_logs`. Los specs de 05/06 (y el nuevo de 08) hardcodeaban los
   ejercicios de fixture `'0001'`/`'0002'`/`'0003'` y limpiaban con
   `DELETE workout_logs?exercise_id=eq.<hardcodeado>&performed_at=eq.<hoy>`:
   contra esta BD habrían **insertado series de prueba en el ejercicio real de
   hoy sin poder borrarlas** (filtro con el id equivocado) y el propio filtro
   por ejercicio+fecha podía arrastrar series del usuario.

#### Endurecimiento del test-infra (aprobado por el humano, en scope de 08)

- **`e2e/helpers.ts` (nuevo).** Módulo compartido (no es un spec, Playwright no
  lo colecta) con:
  - **Limpieza ID-precisa**: `snapshotLogs()` fotografía los `id` existentes de
    (ejercicio, fecha) *antes* de escribir; `createdLogs()` devuelve los `id`
    nuevos; `deleteCreatedLogs()` borra **solo** esos con `?id=in.(…)`. **Nunca
    se borra por filtro de ejercicio/fecha.** Además hay un tope de seguridad
    (`MAX_ROWS_PER_SPEC = 8`): si aparecieran más filas nuevas de las que un
    spec puede crear, **aborta sin borrar nada** en vez de arriesgar datos
    reales.
  - **Derivación dinámica del ejercicio**: `waitForToday()` +
    `openExerciseCard(page, index)` abren la card n-ésima de HOY y sacan el
    `exercise_id` del enlace "Ver historial" (`/historial/<id>`). **Cero ids
    hardcodeados.**
  - **Localizadores por rol y regex** (`/^Peso serie \d+$/`, …) para no depender
    de un número de serie concreto.
  - `ensureEditableRows(page, n)`: si el usuario **ya completó** sus series de
    hoy (fue el caso real: las 4 series del press de banca con mancuerna ya
    estaban guardadas), usa el "Agregar serie" de la propia app para crear las
    filas extra que el spec necesita — con `set_number` nuevo, sin chocar con
    las suyas, y borradas después por id.
  - `waitForToday()` tolera el error transitorio del backend pulsando
    "Reintentar" (hasta 3 veces), igual que haría el usuario: la primera corrida
    verde tuvo un fallo de carga por concurrencia de workers, no por código.
- **Aislamiento entre specs**: 05 usa el 1er ejercicio de hoy, 06 el 2º y 08 el
  3º → sin colisiones corriendo en paralelo.
- **Limpieza en `afterEach`** en los tres specs que escriben: corre aunque la
  aserción falle a mitad, así no queda basura en la BD real.
- **Aserciones robustas a datos preexistentes**: "Anterior" ya puede traer
  valores reales y el historial ya tiene sesiones reales, así que se afirma
  sobre **la serie que el spec acaba de guardar** (`.first()` donde una línea
  podría repetirse), nunca sobre vacíos ni sobre longitudes de lista.
- **03 y 04 también se volvieron agnósticos del plan** (son de solo lectura,
  pero afirmaban literales del fixture que ya no existe y habrían fallado para
  siempre): 03 verifica estructura de cards + navegación acotada a
  `start_date`/`end_date` recorriendo el plan real; 04 lee el nombre y la meta
  de la propia card y los verifica en el detalle. No se eliminó ninguna
  aserción de comportamiento; se sustituyeron datos de fixture por datos
  derivados del DOM.
- **`e2e/fixtures/test-plan.sql`**: se le añadió una cabecera ⛔ que prohíbe
  aplicarlo mientras exista un plan real activo (crearía un **segundo** plan
  `active` y `getActivePlan` podría devolver el de prueba en vez de la rutina
  real). Ya no hace falta para los E2E.

#### Resultado y prueba de que no se tocó ni un dato del usuario

```
12 passed (32.6s)   ← ./init.sh e2e
```

Verificación posterior contra la BD (solo lectura):

| Comprobación | Resultado |
|---|---|
| Total de filas en `workout_logs` | **154** (idéntico al estado previo) |
| Filas de HOY | 21, todas del usuario (0279, 0289, 0290, 0293, 0334, 0351, 0375) |
| Filas con `weight_kg = 20.41` (la firma del spec de 08) | **0** — el spec borró la suya |
| Planes | 1 `active` (el real) + 2 `archived`; **no** se creó ninguno |

El spec `e2e/units.spec.ts` sí ejecutó su flujo completo contra el proyecto
real: toggle a lb → teclear 45 → guardar → "✓ Guardada" con "45 lb" → recarga
(sigue en lb, sigue "45 lb") → "Ver historial" en lb y sin toggle propio →
**`weight_kg = 20.41` leído por REST** (R14) → fila borrada por id.

No se debilitó, saltó ni borró ningún test, y no se modificó ni eliminó ninguna
fila preexistente de `workout_logs`, `plans`, `plan_days`, `plan_exercises` ni
`exercises`.

## Notas de iOS / gym

- El toggle vive en la cabecera de "Registro de series", a la derecha del
  título: dos botones de 44×44 px alcanzables con el pulgar sin abrir teclado.
- La preferencia es **del dispositivo** (`localStorage`): en el iPhone de Mario
  cada ejercicio recuerda su unidad; si Safari bloquea el almacenamiento del
  sitio, la app abre igual, todo en kg, y el toggle sigue funcionando durante la
  sesión (solo no sobrevive a la recarga).
- ⛔ **`e2e/fixtures/test-plan.sql` es legacy: NO aplicarlo.** Con el plan real
  activo insertaría un segundo plan `active` y la app podría mostrar el de
  prueba en lugar de la rutina real. Ya no se necesita: los specs son
  agnósticos del plan.
- Pendiente de humo manual en el iPhone (checklist de `tasks.md` §7): abrir un
  ejercicio de mancuernas en lb y otro en kg uno tras otro y confirmar que cada
  uno conserva su unidad.
