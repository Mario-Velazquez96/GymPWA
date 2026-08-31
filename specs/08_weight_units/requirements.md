# Requirements — 08_weight_units

**Feature:** Registro y visualización en kg o lb (preferencia por ejercicio)
**Source:** necesidad del usuario (equipo mixto del gym: mancuernas/máquinas
marcadas en libras); client_requirement RF-4/RF-5 y §5 ("Unidades: kg" — sigue
siendo la unidad canónica de almacenamiento); solution_design §3.5, §4.2
**Depends on:** 05_workout_logging, 06_history

## Purpose

El gym de Mario tiene equipo mixto: algunas mancuernas y máquinas están
marcadas en **libras**. Hoy la app solo habla kg, así que en esos ejercicios
Mario tiene que convertir de cabeza entre serie y serie. Esta feature le
permite **poner un ejercicio en lb** —capturar y leer sus pesos en lb— mientras
todos los demás siguen en kg, sin tocar el almacenamiento: `workout_logs.weight_kg`
sigue guardando **kilogramos** porque es el contrato con el repo `Gym`, cuyo
agente entrenador lee ese historial para progresar cargas (solution_design
§3.5, §5.1). lb es exclusivamente un asunto de **entrada y presentación**.

## Decisiones ya tomadas por el humano (no son open items)

1. La preferencia de unidad es **por ejercicio** (clave `exercise_id`) y vive
   **en el dispositivo** (`localStorage`). Sin valor guardado → **kg**.
2. En lb el stepper de peso avanza **±5 lb**; en kg conserva **±2.5 kg**. Reps
   siempre ±1.
3. **El almacenamiento sigue siendo canónico en kg.** Sin migración, sin cambio
   de RLS, sin columna nueva.

## In scope

- **Nuevo módulo puro** `src/lib/units.ts`: tipo `WeightUnit`, factor de
  conversión, `toKg` / `fromKg`, `formatWeight`, `weightStep`, `validateWeight`
  y el envoltorio seguro de `localStorage` (`readExerciseUnit` /
  `writeExerciseUnit`).
- **Nuevo hook** `src/hooks/useExerciseUnit.ts` (estado + persistencia por
  `exercise_id`).
- **Nuevo componente** `src/components/UnitToggle.tsx` (toggle kg/lb, ≥ 44px).
- **Modificados:** `src/lib/logging.ts` (`validateSet` por unidad),
  `src/lib/utils.ts` (`formatKg` pasa a delegar en `formatWeight`),
  `src/components/SetRow.tsx`, `src/components/LoggingSection.tsx`,
  `src/components/SessionCard.tsx`, `src/hooks/useWorkoutLog.ts`,
  `src/screens/HistoryScreen.tsx`.
- **Tests:** unit (`units.test.ts`, `logging.test.ts`), component
  (`UnitToggle`, `SetRow`, `LoggingSection`, `SessionCard`, `HistoryScreen`) y
  un E2E nuevo `e2e/units.spec.ts` con limpieza de sus propias filas.
- Todo el texto nuevo en **español**.

## Out of scope

- Cualquier cambio de esquema, índice, constraint o política RLS
  (`supabase/migrations/` **no se toca**).
- Guardar la preferencia en Supabase / sincronizarla entre dispositivos
  (localStorage basta para un usuario y un teléfono).
- Preferencia global de la app o por grupo muscular: la unidad es por ejercicio.
- Unidades distintas de kg/lb (stones, discos, placas).
- Convertir o reescribir registros históricos ya guardados.
- Toggle de unidad en la pantalla Hoy o en el listado de ejercicios.
- Cambios al service worker, a `services/logs.ts`, a `Stepper.tsx` o a
  `ExerciseScreen.tsx`.

## Requirements (EARS)

**R1 (Event-driven):** When the logging section of an exercise renders, the
system shall show a unit toggle with the Spanish options "kg" and "lb" inside a
group labelled "Unidad de peso", where the active option is visually marked and
exposed as `aria-pressed="true"`, and every toggle control is ≥ 44px
(`min-h-11 min-w-11`).

**R2 (Event-driven):** When the user activates "lb" (or "kg") on that toggle,
the system shall make that unit active for **that `exercise_id` only** and
persist the choice on the device under the key `gym:unit:<exercise_id>`, so
that reopening the exercise (or reloading the app) restores it; other exercises
keep their own preference.

**R3 (Ubiquitous / State-driven):** The system shall default to **kg** for any
exercise with no stored preference, and shall treat any stored value other than
`"kg"` / `"lb"` as **kg** — today's behaviour is unchanged for every exercise
until Mario switches one.

**R4 (State-driven):** While **lb** is the active unit of an exercise, the
weight steppers of that exercise shall step **±5 lb** (min 0); while **kg** is
active they shall step **±2.5 kg** (min 0). Reps shall step ±1 (min 1) in both
units.

**R5 (State-driven):** While **lb** is active, direct numeric entry in a weight
stepper shall be interpreted as **libras** and quantized to the lb grid of
**0.1 lb** before conversion; while **kg** is active, direct entry shall keep
the 05 behaviour exactly (interpreted as kg, no quantization).

**R6 (State-driven):** While **lb** is active for an exercise, every weight of
that exercise shall be displayed in lb with its unit label —editable rows,
saved rows, the "Anterior" column, and the sessions of the History screen—
e.g. "Anterior: 49.6 lb × 10", "45 lb", "Serie 1 — 45 lb × 10". While **kg** is
active, the same places shall display "22.5 kg".

**R7 (Ubiquitous):** The system shall convert with the exact factor
**1 lb = 0.45359237 kg**: entered lb → kg **rounded to 2 decimals** for storage
(compatible with `numeric(6,2)` and the `weight_kg >= 0` check constraint), and
stored kg → lb **rounded to 1 decimal** for display, with trailing zeros
dropped ("45 lb", not "45.0 lb" nor "45.0001 lb").

**R8 (Ubiquitous):** For every weight on the 0.1 lb grid, the round trip
lb → kg → lb shall return the **same** lb value; a table of at least the common
gym weights `0, 2.5, 5, 10, 20, 25, 35, 45, 50, 70, 90, 95, 100, 135, 185, 225,
315 lb` and `0, 2.5, 5, 10, 20, 22.5, 40, 60, 100 kg` shall be asserted in both
directions by an explicit unit test.

**R9 (State-driven / Unwanted behavior):** `validateSet` shall validate the
weight **expressed in the unit the user entered it in**, converting only
afterwards:
- While **kg** is active: weight finite, ≥ 0 and a multiple of 0.5 →
  otherwise "El peso no puede ser negativo" / "El peso debe ir en pasos de
  0.5 kg" (05 R7, unchanged).
- While **lb** is active: weight finite, ≥ 0 and a multiple of **0.1 lb** →
  otherwise "El peso no puede ser negativo" / "El peso debe ir en pasos de
  0.1 lb".
- If lb is active, then the 0.5 **kg** step rule shall **not** be applied — a
  valid lb weight converts to a non-0.5 kg value by definition (45 lb =
  20.41 kg must save successfully).
- Reps: integer ≥ 1 in both units → "Las repeticiones deben ser un entero de 1
  o más" (unchanged).

**R10 (Event-driven):** When a set row initializes, the prefill chain and the
"Anterior" column shall keep operating on the **kg** data returned by
`services/logs.ts` (05 R2, R3 unchanged); only the *displayed* number and the
*stepper's* value shall be converted to the active unit.

**R11 (Event-driven):** When the user toggles the unit of an exercise, every
row shall keep its underlying kg value **unchanged** and simply re-render it in
the new unit; no row shall be reset, re-prefilled, saved, cleared of its status
or cleared of its error message — an unsaved row being edited keeps exactly the
weight it had (22.5 kg shown as "22.5 kg" becomes "49.6 lb", same physical
weight).

**R12 (State-driven):** While the History screen shows an exercise, it shall
render that exercise's weights using the **same stored per-exercise
preference** (read-only: the History screen has **no** toggle of its own; the
toggle lives on the exercise screen).

**R13 (Unwanted behavior):** If `localStorage` is unavailable or throws
(private mode, blocked site data, quota), then reads shall fall back to **kg**
and writes shall fail silently, and the app shall keep working — the toggle
still switches the unit for the current session and no error surfaces to the
user (details only via the dev-only debug channel).

**R14 (Ubiquitous):** The system shall keep `workout_logs.weight_kg` storing
**kilograms** for every insert, in every unit mode; this feature shall ship
**no** SQL migration, **no** RLS change and **no** new column, so the cross-repo
contract with `Gym` (solution_design §3.5) is untouched. A set logged as
**45 lb** shall be persisted as **20.41** and shall be verified as such against
the database.

**R15 (Ubiquitous):** kg shall remain the default everywhere and the existing
05/06 behaviour shall be preserved: both suites keep passing, with the only
permitted edits being (a) the "Anterior" display strings that now carry the
unit and (b) the removal of the superseded unit-less `formatKg` from
`lib/logging.ts` and its test block. No behavioural test of 05/06 may be
weakened or deleted.

**R16 (Ubiquitous):** The feature shall introduce **no** new dependency, **no**
new env var, and **no** change to the service worker's precache/runtime-cache
rules; conversion/persistence logic shall live in `lib/` + `hooks/`, and no
component shall fetch data (docs/architecture.md layering).

## Acceptance

Gym scenario: Mario abre "curl de bíceps" (mancuernas marcadas en lb), toca
"lb", el stepper pasa a "0 lb" y sube de 5 en 5; escribe 45 directo, guarda la
serie y la fila queda "✓ Guardada" mostrando "45 lb". Recarga la app: el
ejercicio sigue en lb y la serie sigue leyéndose "45 lb"; "Ver historial"
muestra "Serie 1 — 45 lb × 10". En la base de datos esa fila es
`weight_kg = 20.41`. Abre press de banca (nunca tocado): sigue en kg con
±2.5 kg y "22.5 kg", exactamente como antes. Con las cookies/almacenamiento
bloqueados la app abre igual, todo en kg, y el toggle sigue funcionando durante
la sesión.

## Open items

Ninguno bloqueante. Dos decisiones tomadas en este spec, registradas para que
el humano las confirme o las revierta en la revisión:

1. **Granularidad de lb = 0.1 lb** (display a 1 decimal). Es la granularidad
   más fina que sobrevive el ida-y-vuelta contra `numeric(6,2)` en kg (R8) y
   deja los valores de placa habituales exactos.
2. **La pantalla Historial no lleva toggle propio** (R12): lee la preferencia
   guardada en la pantalla de ejercicio. Es la opción simple y evita dos
   fuentes de verdad; si el humano prefiere un toggle también ahí, es un
   añadido de una línea sobre el mismo hook.
