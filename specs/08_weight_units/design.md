# Design — 08_weight_units

**Source:** requirements.md de esta feature; solution_design §3.5 (contrato
`weight_kg`), §4.2 (UX de gym); specs/05_workout_logging, specs/06_history

## Approach

Una sola idea gobierna el diseño:

> **El estado y el almacenamiento siguen siendo kg. La unidad es una
> transformación de entrada/salida aplicada en el borde de presentación.**

`SetRowState.weight_kg` no cambia de forma ni de significado, `services/logs.ts`
no cambia una línea, y `workout_logs.weight_kg` sigue recibiendo kilogramos
(R14). Lo único que la unidad activa altera es (a) qué número se pinta, (b) con
qué paso avanza el stepper, (c) cómo se interpreta lo que el usuario teclea y
(d) contra qué regla se valida antes de guardar.

Consecuencia agradable y deliberada: **un peso que el usuario no toca no se
distorsiona nunca**. Una serie prellenada con 22.5 kg se muestra como
"49.6 lb"; si se guarda sin tocarla, se inserta 22.5 kg exacto. La
cuantización a 0.1 lb solo ocurre cuando el usuario efectivamente edita el
valor en lb.

## Layering

```
lib/units.ts        (nuevo)  conversión + formato + validación + storage seguro   ← puro
hooks/useExerciseUnit.ts (nuevo)  estado React de la preferencia por exercise_id
components/UnitToggle.tsx (nuevo) presentacional, ≥44px, aria-pressed
components/{SetRow,LoggingSection,SessionCard}.tsx  reciben `unit` como prop
screens/HistoryScreen.tsx  lee la preferencia (sin toggle) y la baja a SessionCard
services/                  SIN CAMBIOS (sigue hablando kg)
supabase/migrations/       SIN CAMBIOS (R14)
```

Ningún componente hace fetching; la preferencia se resuelve en un hook y baja
como prop, igual que el resto del árbol (docs/architecture.md).

## `src/lib/units.ts` — el módulo nuevo

```ts
export type WeightUnit = "kg" | "lb";

/** Factor exacto (definición internacional de la libra avoirdupois). */
export const LB_IN_KG = 0.45359237;

/** Paso del stepper de peso por unidad (R4). */
export const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

/** Rejilla mínima de entrada por unidad (R5, R9). */
export const WEIGHT_GRAIN: Record<WeightUnit, number> = { kg: 0.5, lb: 0.1 };

/** Decimales con los que se presenta cada unidad (R7). */
const DECIMALS: Record<WeightUnit, number> = { kg: 2, lb: 1 };

function roundTo(value: number, decimals: number): number { ... }  // 10^d

/** Valor expresado en `unit` → kg canónico, redondeado a 2 decimales (R7). */
export function toKg(value: number, unit: WeightUnit): number {
  return roundTo(unit === "lb" ? value * LB_IN_KG : value, 2);
}

/** kg canónico → valor en `unit`, redondeado a la precisión de esa unidad (R7). */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? roundTo(kg / LB_IN_KG, 1) : roundTo(kg, 2);
}

/** Cuantiza un valor tecleado a la rejilla de su unidad (R5, solo lb). */
export function quantize(value: number, unit: WeightUnit): number {
  return unit === "lb" ? roundTo(value, 1) : value;   // kg conserva 05 tal cual
}

/** "22.5 kg" | "45 lb" | (withUnit:false) "22.5" — sin ceros de cola (R6, R7). */
export function formatWeight(
  kg: number,
  unit: WeightUnit,
  options?: { withUnit?: boolean },
): string;

/** Valida un peso EXPRESADO EN `unit` (R9). Mensaje español o null. */
export function validateWeight(value: number, unit: WeightUnit): string | null;
//   !finite || < 0            → "El peso no puede ser negativo"
//   no múltiplo de WEIGHT_GRAIN[unit] → "El peso debe ir en pasos de 0.5 kg"
//                                     | "El peso debe ir en pasos de 0.1 lb"

/* ── Persistencia (R2, R3, R13) ─────────────────────────────────────────── */
export const UNIT_STORAGE_PREFIX = "gym:unit:";
export function readExerciseUnit(exerciseId: string): WeightUnit;   // default "kg"
export function writeExerciseUnit(exerciseId: string, unit: WeightUnit): void;
```

### Redondeo y estabilidad del ida-y-vuelta (R7, R8)

- Entrada: `kg = round2(lb × 0.45359237)`. El error máximo introducido es
  0.005 kg.
- Salida: `lb = round1(kg ÷ 0.45359237)`. 0.005 kg ÷ 0.45359237 = **0.011 lb**
  de error máximo, muy por debajo del medio paso de la rejilla de display
  (0.05 lb) → cualquier valor sobre la rejilla de 0.1 lb **se recupera exacto**.
- Inyectividad: dos valores lb contiguos (0.1 lb) distan 0.0454 kg, muy por
  encima del 0.01 kg de resolución de `numeric(6,2)` → nunca colapsan.
- Ejemplo del contrato: `45 lb → 20.41165665 → 20.41 kg`; de vuelta
  `20.41 ÷ 0.45359237 = 44.99635 → 45.0 → "45 lb"` ✔ (no "45.0001").
  Peor caso de la tabla, 135 lb: `61.23 kg → 134.98904 → 135 lb` ✔.
- `numeric(6,2)` admite hasta 9999.99 kg: ningún peso de gym en lb se acerca al
  desbordamiento.

### Persistencia robusta (R13)

`readExerciseUnit` / `writeExerciseUnit` envuelven **todo** acceso en
`try/catch` y comprueban `typeof globalThis.localStorage !== "undefined"` antes
de tocarlo (Safari en modo privado con datos bloqueados lanza al leer *y* al
escribir; la cuota lanza al escribir).

```ts
function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
readExerciseUnit(id):  storage()?.getItem(PREFIX+id) dentro de try/catch;
                       valor !== "lb" && !== "kg"  → "kg"   (R3)
writeExerciseUnit:     try { setItem } catch { debugUnits(...) }  // nunca propaga
```

El fallo de escritura **no** revierte el estado en memoria: el toggle sigue
funcionando durante la sesión y solo no sobrevive a la recarga (R13).

## `src/hooks/useExerciseUnit.ts`

```ts
export function useExerciseUnit(exerciseId: string): [WeightUnit, (u: WeightUnit) => void];
```

- Estado inicial perezoso: `useState(() => readExerciseUnit(exerciseId))`.
- Un `useEffect` sobre `exerciseId` re-lee la preferencia si el id cambia (la
  pantalla de ejercicio se reusa entre ejercicios vía la ruta).
- El setter escribe en estado **y** llama `writeExerciseUnit` (best-effort).
- Sin contexto global: cada pantalla lo instancia con su propio `exercise_id`;
  la fuente de verdad compartida es `localStorage`.

## `src/components/UnitToggle.tsx` (nuevo)

```tsx
interface UnitToggleProps { unit: WeightUnit; onChange: (u: WeightUnit) => void }

<div role="group" aria-label="Unidad de peso" className="flex gap-1">
  {(["kg","lb"] as const).map(u => (
    <button type="button" key={u} aria-pressed={u === unit}
            onClick={() => onChange(u)}
            className="min-h-11 min-w-11 rounded-lg px-4 … (activo: bg-sky-600)">
      {u}
    </button>
  ))}
</div>
```

Presentacional puro, sin fetching, ≥ 44px por botón (R1).

## Cambios exactos por archivo

| Archivo | Cambio |
|---|---|
| `src/lib/units.ts` | **nuevo** (arriba). |
| `src/hooks/useExerciseUnit.ts` | **nuevo**. |
| `src/components/UnitToggle.tsx` | **nuevo**. |
| `src/lib/logging.ts` | `validateSet(values, unit: WeightUnit = "kg")`; delega el peso en `validateWeight(fromKg(weight_kg, unit), unit)` y conserva el check de reps. `WEIGHT_STEP_KG` pasa a ser alias de `WEIGHT_STEP.kg`. Se **elimina** el `formatKg` sin unidad (lo sustituye `formatWeight`). `resolvePrefill` / `buildInitialRows` **sin cambios** (siguen en kg, R10). |
| `src/lib/utils.ts` | `formatKg(v)` pasa a `formatWeight(v, "kg")` (una línea; conserva la firma y el contrato de 06 R7 → `utils.test.ts` intacto). |
| `src/components/SetRow.tsx` | Nueva prop `unit`. El stepper de peso recibe `value={fromKg(row.weight_kg, unit)}`, `step={WEIGHT_STEP[unit]}`, `unit={unit}` y `onChange={(v) => onWeightChange(toKg(quantize(v, unit), unit))}` (R4, R5, R6). "Anterior" pasa a `formatWeight(previous.weight_kg, unit)` → ahora **con** unidad (R6, R15). |
| `src/components/LoggingSection.tsx` | Llama `useExerciseUnit(planExercise.exercise_id)`, renderiza `<UnitToggle>` junto al encabezado "Registro de series", pasa `unit` a cada `SetRow` y a `useWorkoutLog`. |
| `src/hooks/useWorkoutLog.ts` | Segundo parámetro `unit`; `saveRow` llama `validateSet({...}, unit)` y añade `unit` a las deps del `useCallback`. El payload de `logSet` **no cambia**: `weight_kg` sigue siendo el kg del estado (R14). |
| `src/components/SessionCard.tsx` | Nueva prop `unit`; las líneas usan `formatWeight(set.weight_kg, unit)`. |
| `src/screens/HistoryScreen.tsx` | `const [unit] = useExerciseUnit(exerciseId ?? "")`; lo baja a cada `SessionCard` (R12). Sin toggle. |
| `src/components/Stepper.tsx` | **sin cambios** — ya acepta `step` y `unit` y su `round2` interno es inocuo: el ajuste ±5 sobre un valor de 1 decimal sigue en la rejilla, y la cuantización de lo tecleado la hace `quantize()` en el adaptador de `SetRow`. |
| `src/services/logs.ts`, `src/screens/ExerciseScreen.tsx` | **sin cambios**. |
| `supabase/migrations/**` | **sin cambios** (R14). |

### Flujo de datos

```
HistoryScreen ──useExerciseUnit(exerciseId)──► unit ──► SessionCard(unit)
                                                          formatWeight(kg, unit)

ExerciseScreen
 └ LoggingSection ──useExerciseUnit(exercise_id)──► unit
      ├ <UnitToggle unit onChange={setUnit}>            (R1, R2)
      ├ useWorkoutLog(planExercise, unit) ──► rows (kg) │ saveRow → validateSet(.., unit)
      └ SetRow(row kg, unit)
           display  : fromKg(row.weight_kg, unit)        (R6)
           stepper  : step = WEIGHT_STEP[unit]           (R4)
           onChange : toKg(quantize(v, unit), unit)      (R5, R7)
           anterior : formatWeight(previous.weight_kg, unit)
```

## Servicios y modelo de datos

**Ninguna función de servicio nueva ni modificada.** `getPreviousSession`,
`getSessionSets`, `getExerciseHistory` y `logSet` siguen exactamente igual: sus
tipos de fila (`WorkoutLog`) y su manejo de `{ data, error }` no cambian, y
`logSet` sigue insertando `weight_kg` en kilogramos con el `user_id` de la
sesión viva (RLS `with check` como respaldo).

**Migración SQL: ninguna.** `workout_logs.weight_kg numeric(6,2) not null` y su
check `weight_kg >= 0` se conservan tal cual; no hay columna `unit` ni tabla de
preferencias. La preferencia es del dispositivo, no del dato. Esto es lo que
mantiene intacto el contrato con el repo `Gym`, cuyo `fetch-history.js` y el
agente entrenador leen `weight_kg` como kilogramos (solution_design §3.5,
§5.1). **No hay cambio al contrato entre repos → no hay open item de contrato.**

## Validación

```
validateSet({ weight_kg, reps }, unit = "kg")
  peso → validateWeight(fromKg(weight_kg, unit), unit)
           kg : ≥0 ∧ múltiplo de 0.5  → "El peso debe ir en pasos de 0.5 kg"
           lb : ≥0 ∧ múltiplo de 0.1  → "El peso debe ir en pasos de 0.1 lb"
           ambos: !finite || <0       → "El peso no puede ser negativo"
  reps → entero ≥ 1 → "Las repeticiones deben ser un entero de 1 o más"
```

El default `"kg"` mantiene todas las llamadas y los tests de 05 sin tocar
(R15). El punto crítico y explícitamente testeado: **con `unit="lb"`,
`weight_kg = 20.41` (45 lb) es válido**, aunque no sea múltiplo de 0.5 kg —
aplicar la regla de kg a una entrada en lb sería el bug central de esta feature
(R9). Los checks de la BD siguen siendo el respaldo.

## Auth, seguridad y PWA

- Sin cambios de auth ni de RLS; la única superficie de escritura sigue siendo
  `workout_logs` vía `logSet`.
- `localStorage` guarda únicamente `"kg"`/`"lb"` por `exercise_id`: ningún dato
  sensible, ningún token, nada que compartir entre usuarios.
- **PWA: sin impacto.** No cambia el precache del shell (el módulo nuevo entra
  en el bundle ya precacheado) ni las reglas de runtime-cache de media, y
  ninguna respuesta de la API de Supabase se cachea.
- **Sin nuevas dependencias** y **sin nuevas variables de entorno** →
  `.env.example` no se toca (R16).

## Test approach

**Unit — `src/lib/units.test.ts`** (el grueso; ≥ 85% líneas):
- `toKg` / `fromKg` con la tabla de pesos comunes y el ejemplo del contrato
  (45 lb → 20.41 kg → "45 lb") (R7).
- **Ida y vuelta** `lb → kg → lb` sobre `0, 2.5, 5, 10, 20, 25, 35, 45, 50, 70,
  90, 95, 100, 135, 185, 225, 315` y `kg → display → kg` sobre `0, 2.5, 5, 10,
  20, 22.5, 40, 60, 100`: igualdad exacta, sin `45.0001` (R8).
- `formatWeight`: enteros sin decimales, fraccionarios con los suyos, sin ceros
  de cola, con y sin unidad (R6, R7).
- `validateWeight`: matriz por unidad — negativo, `NaN`/`Infinity`, 22.3 kg
  (rechaza), 20.41 kg **en modo kg** (rechaza) vs. 45 lb (acepta), 45.37 lb
  (rechaza, fuera de la rejilla de 0.1) (R9).
- `readExerciseUnit`/`writeExerciseUnit`: valor ausente → kg; valor corrupto
  ("libras", "") → kg; escritura y relectura; **`localStorage` que lanza en
  `getItem` y en `setItem`** (mock con `vi.spyOn(Storage.prototype, ...)` o
  `vi.stubGlobal`) → devuelve kg, no propaga (R3, R13).

**Unit — `src/lib/logging.test.ts`** (extensión): `validateSet` sin segundo
argumento se comporta idéntico a 05; con `"lb"` acepta 20.41 kg y rechaza
negativos; el bloque `describe("formatKg")` se elimina junto con la función
superseded (R9, R15).

**Component (RTL + servicios mockeados):**
- `UnitToggle`: renderiza kg/lb, `aria-pressed` correcto, click emite el
  cambio, ambos botones ≥ `min-h-11` (R1).
- `useExerciseUnit` (vía `renderHook`): default kg, persiste al cambiar, re-lee
  al cambiar de `exerciseId`, sobrevive un `localStorage` roto (R2, R3, R13).
- `LoggingSection`: con preferencia "lb" precargada en `localStorage`, la fila
  1 muestra el peso en lb, "Anterior: 49.6 lb × 10" y el stepper sube de 5 en 5
  (R4, R6); al pulsar "lb" con filas ya editadas, el valor mostrado se convierte
  pero **el kg subyacente no cambia** — se verifica guardando y comprobando el
  `weight_kg` del payload de `logSet` (R11, R14); guardar 45 lb llama a `logSet`
  con `weight_kg: 20.41` (R7, R9, R14); en kg todo queda idéntico a 05 (R15).
- `SetRow`: "Anterior" con unidad en ambos modos; entrada directa "45" en modo
  lb → `onWeightChange(20.41)`; entrada "45.37" → cuantiza a 45.4 lb → 20.59 kg
  (R5).
- `SessionCard` / `HistoryScreen`: con la preferencia "lb" del ejercicio, las
  líneas se leen "Serie 1 — 45 lb × 10"; sin preferencia, "22.5 kg × 10"
  (R12, R15).

**E2E — `e2e/units.spec.ts`** (nuevo, contra el proyecto Supabase real):
- Usa el **ejercicio de fixture `'0003'`** (curl de bíceps con mancuernas — el
  caso de uso real), libre de colisiones porque `'0001'` es de
  `e2e/logging.spec.ts` y `'0002'` de `e2e/history.spec.ts`. Mismo patrón que
  esos dos: `test.skip` sin credenciales/plan, login, limpieza inicial y final
  de las filas de HOY vía `DELETE /rest/v1/workout_logs` con el access token de
  la sesión del navegador (RLS acota el borrado a las filas propias).
- Flujo: abrir el ejercicio → pulsar "lb" → teclear 45 en el stepper de peso →
  "Guardar serie" → ✓ Guardada mostrando "45 lb" → **recargar** → el ejercicio
  sigue en lb y la fila guardada sigue en "45 lb" (R2, R6) → "Ver historial"
  muestra "Serie 1 — 45 lb × …" (R12).
- **Verificación del contrato (R14):** `GET
  /rest/v1/workout_logs?exercise_id=eq.0003&performed_at=eq.<hoy>` con el mismo
  token y `expect(Number(row.weight_kg)).toBe(20.41)` — la fila está en kg
  aunque se haya capturado en lb.
- Los specs existentes de 05/06 siguen corriendo en kg sin cambios (R15).

**Coverage:** ≥ 85% líneas en `src/lib/units.ts`, `src/hooks/useExerciseUnit.ts`
y la lógica modificada de `src/lib/logging.ts` (es el camino de escritura
central de la app); el resto del repo conserva su umbral vigente.

## Open items / discrepancias

- **Sin cambios al contrato entre repos.** Se declara explícitamente: ni
  esquema, ni RLS, ni semántica de `weight_kg`; el agente del repo `Gym` no se
  ve afectado.
- Dos decisiones de diseño tomadas aquí y sujetas a la revisión humana (ya
  listadas en `requirements.md`): granularidad de **0.1 lb** con display a 1
  decimal, y **Historial sin toggle propio** (solo lee la preferencia).
- Nota menor de UI a validar en la revisión: la columna "Anterior" pasa a
  incluir la unidad en ambos modos ("Anterior: 22.5 kg × 10"), lo que obliga a
  actualizar dos literales de aserción en `SetRow.test.tsx` y
  `LoggingSection.test.tsx` (cambio de cadena, no de comportamiento).
