# Review — 08_weight_units

**Verdict: APPROVE.** El leader puede marcar la feature como `done` en
`feature_list.json`.

Revisado contra `specs/08_weight_units/{requirements,design,tasks}.md`,
`progress/impl_08_weight_units.md`, `docs/conventions.md`,
`docs/architecture.md`, `docs/verification.md` y `CHECKPOINTS.md`.
Revisión **read-only**: no se modificó ni un archivo de la implementación.

---

## 1. Trazabilidad R1–R16 — completa, con aserciones reales

Se leyó cada test citado; ninguno es un "smoke" que solo ejecuta líneas.

| R | Test que lo ejerce de verdad | OK |
|---|---|---|
| R1 | `UnitToggle.test.tsx` (grupo "Unidad de peso", `aria-pressed` en ambos sentidos, `min-h-11`/`min-w-11`); `LoggingSection.test.tsx` "R1: …" | si |
| R2 | `units.test.ts` (clave `gym:unit:<id>`, no contamina otros ids); `useExerciseUnit.test.tsx` (persiste, relee al cambiar de id); `e2e/units.spec.ts` (paso de **recarga** real) | si |
| R3 | `units.test.ts` (sin valor -> kg; corruptos "libras", "", "LB", "null", "{}" -> kg); `useExerciseUnit.test.tsx`; suites 05/06 completas en kg | si |
| R4 | `units.test.ts` (`WEIGHT_STEP` = `{kg:2.5, lb:5}`); `SetRow.test.tsx` (±5 lb sube y baja, clamp a 0, reps ±1 en lb); `LoggingSection.test.tsx` (49.6 -> 54.6 lb) | si |
| R5 | `units.test.ts` describe "quantize"; `SetRow.test.tsx` (entrada "45" -> 20.41; "45.37" -> 45.4 lb -> 20.59 kg; en kg **sin** cuantizar) | si |
| R6 | `SetRow.test.tsx` (stepper, "Anterior", fila guardada, guion "—"); `SessionCard.test.tsx`; `LoggingSection.test.tsx`; `e2e/units.spec.ts` | si |
| R7 | **Factor exacto** `LB_IN_KG === 0.45359237` aserido literalmente; tabla `toKg` (0/2.5/5/10/45/100/135/225); `fromKg` a 1 decimal; `formatWeight` sin ceros de cola ("100 lb", "40 kg") | si |
| R8 | **Ida y vuelta**: tabla de 17 pesos lb comunes, tabla de 9 kg, **toda la rejilla de 0.1 lb entre 0 y 320 lb (3201 valores)** con igualdad exacta, y no-colisión de contiguos | si |
| R9 | `units.test.ts` matriz por unidad (mensajes en español); **"20.41 es válido leído en lb e inválido leído en kg"**; `logging.test.ts` describe "validateSet — unidad activa" (default idéntico a 05; en lb acepta 0/1.13/20.41/61.23/102.06; sigue rechazando negativos, NaN y reps 0/8.5); `LoggingSection.test.tsx` "R9: en lb NO se aplica la regla de 0.5 kg" | si |
| R10 | `resolvePrefill`/`buildInitialRows` **intactos** en `logging.ts` y sus describes de 05 sin tocar; `SetRow.test.tsx` "sin prop unit se comporta como kg" | si |
| R11 | `LoggingSection.test.tsx`: (a) fila **editada sin guardar** 22.5 -> 25 kg, se togglea a lb, muestra 55.1 lb y **al guardar el payload es `weight_kg: 25`** (prueba que el kg subyacente no se tocó ni se re-prellenó); (b) **el mensaje de error inline sobrevive al toggle**; (c) filas ya guardadas se releen en lb **sin reguardar** (`mockLogSet` no llamado). Verificado además por inspección: el `useEffect` de carga de `useWorkoutLog` **no** depende de `unit` (deps `[key, exercise_id, target_sets, target_reps]`), así que togglear no puede recargar ni resetear | si |
| R12 | `HistoryScreen.test.tsx`: lee la preferencia guardada, otro id sigue en kg, y **el grupo "Unidad de peso" está ausente** (sin toggle propio); `SessionCard.test.tsx` ambas unidades; e2e paso "Ver historial" | si |
| R13 | `units.test.ts`: `getItem` que **lanza**, `setItem` que **lanza**, `localStorage` `undefined` vía `stubGlobal`, y el caso duro — **el propio getter de `globalThis.localStorage` lanza** (Safari privado) -> lectura cae a kg y escritura no propaga; `useExerciseUnit.test.tsx` "con localStorage roto arranca en kg y el toggle sigue vivo en memoria" | si |
| R14 | `LoggingSection.test.tsx` (payload exacto con `weight_kg: 20.41`); **`e2e/units.spec.ts` verifica la fila creada por REST: `Number(weight_kg) === 20.41`**; inspección de `git diff` (ver §2) | si |
| R15 | 408 tests / 28 archivos en verde; las dos únicas ediciones son las aprobadas (literales de "Anterior" con unidad y borrado de `formatKg` de `logging.ts` con su describe). Ningún test de comportamiento de 05/06 debilitado ni eliminado | si |
| R16 | `git diff` **vacío** en `package.json`, `pnpm-lock.yaml`, `.env.example`, `vite.config.ts` y `public/`; `e2e/pwa.spec.ts` "R5: las respuestas de /rest/ nunca se cachean" sigue verde | si |

## 2. Preservación del contrato (regla dura del proyecto) — intacta

- `git diff --name-only` + `git ls-files --others`: **`supabase/migrations/` no
  aparece** (siguen solo `001_schema.sql` y `002_rls.sql`). **Cero migraciones,
  cero cambios de esquema/columna/constraint/RLS.**
- **`src/services/` no aparece en el diff.** `logs.ts` (el único punto de
  escritura) no cambió una línea: `logSet` sigue insertando el `weight_kg` del
  estado. La única tabla escrita sigue siendo `workout_logs`.
- El estado de la fila es kg siempre: `SetRow` pinta `fromKg(row.weight_kg, unit)`
  y devuelve `toKg(quantize(v, unit), unit)`; `useWorkoutLog` usa `unit`
  **solo** en `validateSet(...)` — el payload es idéntico al de 05.
- `toKg` redondea a 2 decimales -> compatible con `numeric(6,2)` y con el check
  `weight_kg >= 0`.
- Prueba en vivo (no solo inspección): el e2e capturó 45 lb y leyó por REST
  `weight_kg = 20.41`.
- IDs de ejercicio "0001"-"1324" y el esquema de `solution_design.md` §3: sin
  tocar.

## 3. Seguridad del E2E sobre datos reales — correcta

- **Un solo `DELETE` en todo `e2e/`**, en `helpers.ts:154`, y es
  `?id=in.(<ids>)`. **No existe ningún DELETE filtrado por
  `exercise_id`/`performed_at`** (grep confirmado). El único uso de
  `exercise_id=eq.` es el `SELECT` de `fetchLogs`.
- Limpieza **ID-precisa**: `snapshotLogs` fotografía los ids *antes* de escribir,
  `createdLogs` = ids nuevos, `deleteCreatedLogs` borra solo esos. Tope de
  seguridad `MAX_ROWS_PER_SPEC = 8`: si aparecen más filas nuevas de las
  posibles, **aborta sin borrar nada**.
- La limpieza vive en `test.afterEach` en los tres specs que escriben
  (`logging`, `history`, `units`) -> **corre aunque la aserción falle a mitad**.
- **Cero exercise ids hardcodeados en los specs**: el objetivo se deriva del DOM
  (`openExerciseCard` lee el href de "Ver historial"). Los únicos "0001"-"0003"
  que quedan están dentro de `e2e/fixtures/test-plan.sql`, que ya no se aplica.
- `e2e/fixtures/test-plan.sql` lleva la cabecera de advertencia
  "DATOS LEGACY — NO APLICAR MIENTRAS EXISTA UN PLAN REAL ACTIVO",
  explicando que crearía un segundo plan `active`.
- Los specs no asumen historial vacío (`.first()`, filas editables vía "Agregar
  serie") y se saltan con mensaje si el día no tiene suficientes ejercicios.

## 4. Checks ejecutados por el revisor

- `./init.sh` -> **verde**: typecheck, lint (0 errores), **408 tests / 28
  archivos**, build (`dist/manifest.webmanifest` + `dist/sw.js`, precache 15
  entradas, misma regla `/storage/` CacheFirst).
- **Coverage** (v8): global 98.16% líneas. Módulos de la feature:
  `src/lib/units.ts` **100% líneas** (branch 95.45; la única rama sin cubrir es
  la línea 31, el `import.meta.env.DEV` del canal de debug),
  `src/hooks/useExerciseUnit.ts`, `src/components/UnitToggle.tsx`,
  `src/lib/logging.ts`, `SetRow.tsx`, `LoggingSection.tsx` y `SessionCard.tsx`
  **100% líneas** (no figuran en el reporte de descubiertos);
  `HistoryScreen.tsx` 100% líneas. **Objetivo >=85% superado con holgura.**
- `./init.sh e2e` -> **verde, 12/12**, con `units.spec.ts` **ejecutado (no
  saltado)** y las suites de 05/06 pasando sin cambios de comportamiento.

### Conteo de `workout_logs` ANTES y DESPUÉS de la corrida e2e

Vía REST con la sesión autenticada (`Prefer: count=exact`); credenciales leídas
de `.env.local` y **nunca impresas**.

| Comprobación | ANTES | DESPUÉS |
|---|---|---|
| **Total `workout_logs`** | **154** | **154** — idénticos |
| Filas de HOY (2026-08-31) | 21 | 21 |
| Filas con `weight_kg = 20.41` (firma del spec de 08) | 0 | **0** — sin residuo |
| `plans` | 2 archived + 1 active | 2 archived + 1 active |

**No se creó, modificó ni eliminó ninguna fila preexistente del usuario.**

## 5. Convenciones y seguridad

- UI 100% en español; "kg"/"lb" solo como etiquetas de unidad.
- Objetivos táctiles: `UnitToggle` con `min-h-11 min-w-11` en ambos botones,
  aserido en test.
- **Cero `any`** y **cero `console.log`** en `src/` y `e2e/`. El único
  `console.*` es un `console.debug` guardado por `import.meta.env.DEV`, el mismo
  patrón ya establecido en `services/{auth,exercises,logs,plans}.ts` y permitido
  por `docs/conventions.md` ("log details to the console only in dev").
- **Sin dependencias nuevas** (`package.json` y `pnpm-lock.yaml` sin diff) y
  **sin env vars nuevas** (`.env.example` sin diff; los specs solo usan
  `E2E_EMAIL`, `E2E_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, ya
  documentadas).
- **Sin secretos**: ninguna referencia a service_role / service key en el repo;
  `.env.local` no está trackeado y sigue en `.gitignore`.
- **Service worker sin tocar**: `vite.config.ts` intacto; única regla de runtime
  cache = `/storage/` CacheFirst; ninguna respuesta de `/rest/v1` se cachea
  (verificado además por `pwa.spec.ts`).
- Layering respetado: conversión/persistencia en `lib/` + `hooks/`, ningún
  componente hace fetching, el acceso a datos sigue solo en `services/`.

## 6. Alcance — sin desbordes

Nada fuera del spec: no hay sincronización de la preferencia entre dispositivos,
no hay unidad por serie, no hay preferencia global, no se tocó `Stepper.tsx`,
`ExerciseScreen.tsx`, `services/logs.ts` ni nada de la órbita del repo `Gym`. No
se añadió ninguna tabla, ruta, env var ni dependencia.

---

## Observaciones no bloqueantes (no exigen retrabajo para cerrar 08)

1. **Deriva documental en `tasks.md` §6 y en una línea del informe de
   implementación.** Ambos siguen describiendo el enfoque **superado**: ejercicio
   de fixture "0003" hardcodeado y limpieza con
   `DELETE /rest/v1/workout_logs?exercise_id=eq.0003&performed_at=eq.<hoy>`.
   El código real hace lo contrario (derivación por DOM + borrado por id), que es
   lo correcto; el texto quedó sin reconciliar. Conviene actualizar esos párrafos
   para que nadie reintroduzca el patrón peligroso leyéndolos.
2. **`formatKg` en `src/lib/utils.ts` se quedó sin llamadores de producción**
   (`SessionCard` pasó a `formatWeight`); solo lo usa `utils.test.ts`. El design
   pidió explícitamente conservarlo con su firma y está 100% cubierto, pero es
   candidato natural a eliminarse en una limpieza posterior.
3. **`docs/conventions.md` (línea ~95)** aún enuncia la validación de peso como
   "weight_kg >= 0 in 0.5 steps" sin matices; desde 08 eso solo rige en modo kg.
   Vale la pena añadir la salvedad de lb (documentación, propiedad del leader).
4. **El endurecimiento tocó `e2e/today.spec.ts` y `e2e/exercise.spec.ts`**, que el
   spec listaba fuera de alcance. Era inevitable: afirmaban literales del fixture
   que ya no existe y habrían fallado para siempre contra la BD real. No se
   eliminó ninguna aserción de comportamiento, pero sí se perdieron dos
   comprobaciones ligadas al fixture ("Descanso: 90 s" y el texto/conteo exacto de
   los pasos), hoy cubiertas por los tests de componente de `ExerciseScreen`.
5. **Solapamiento teórico entre specs**: 05/06/08 se reparten los ejercicios de
   HOY por índice (0/1/2). Si el día repitiera el mismo `exercise_id` en dos
   posiciones, dos specs compartirían snapshot y podrían borrarse filas *de
   prueba* entre sí (flakiness). **Nunca filas del usuario** — el borrado sigue
   siendo por id creado. No ocurrió en esta corrida.
6. **Pendiente el humo manual en el iPhone** (checklist de `tasks.md` §7): abrir
   un ejercicio de mancuernas en lb y otro en kg y confirmar que cada uno conserva
   su unidad y que el toggle se opera con el pulgar. Es verificación de
   dispositivo, no automatizable aquí.

---

**Conclusión: APPROVE.** La feature cumple sus 16 requisitos con tests que los
ejercen de verdad, preserva el contrato `weight_kg` en kilogramos sin migración
ni cambio de RLS, y su E2E se comporta de forma segura sobre datos productivos
reales: **154 filas antes, 154 filas después, cero residuos.**
