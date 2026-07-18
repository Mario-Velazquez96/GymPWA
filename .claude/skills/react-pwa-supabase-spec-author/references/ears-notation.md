# EARS notation for requirements

EARS (Easy Approach to Requirements Syntax) gives requirements a consistent,
testable shape. Each maps cleanly to a test, which makes the SDD traceability
contract (`R<n>` ↔ test) enforceable.

## The five patterns

| Pattern | Template | Use for |
|---|---|---|
| **Ubiquitous** | The system shall `<response>`. | Always-true properties (a table has RLS enabled; UI text is Spanish). |
| **Event-driven** | When `<trigger>`, the system shall `<response>`. | Response to an event (set saved, day changed). |
| **State-driven** | While `<state>`, the system shall `<response>`. | Behavior during a condition (while unauthenticated, redirect to login). |
| **Unwanted behavior** | If `<condition>`, then the system shall `<response>`. | Guards and failure paths (if the insert fails, keep the row editable). |
| **Optional** | Where `<feature included>`, the system shall `<response>`. | Behavior tied to an optional element. |

## Rules for good requirements

- **One requirement, one testable claim.** Split "and"-joined behaviors.
- **Number every requirement** (`R1`, `R2`, …).
- **Name concrete artifacts** (table, column, route path, service-function name,
  component) so the implementer doesn't guess.
- **Make security explicit.** RLS and auth rules are requirements, not asides —
  in a SPA the anon key is public, so RLS is the only enforcement.
- **Make mandated UX explicit.** Spanish text, kg units, steppers, ≥44px touch
  targets are requirements when the source mandates them.
- **Prefer the most specific pattern.** A failure path is "If… then", not a vague
  "handle errors".

## Stack examples (gym-routines PWA)

**Ubiquitous (RLS as a requirement):**
> **R1:** The `workout_logs` table shall have RLS enabled with policies allowing
> select/insert/update/delete only when `auth.uid() = workout_logs.user_id`.

**Event-driven (service write):**
> **R2:** When the user taps "Guardar serie", the system shall insert one
> `workout_logs` row via `logs.logSet()` with the row's `set_number`, `reps`,
> and `weight_kg`, and mark the row as saved.

**State-driven (route protection):**
> **R3:** While the session is unauthenticated, the system shall redirect any
> app route to `/login`.

**State-driven (rest day):**
> **R4:** While the selected `plan_day` has `is_rest = true`, the Hoy screen
> shall show the rest-day state and no exercise list.

**Unwanted behavior (RLS denial):**
> **R5:** If a user queries a plan whose `user_id` is not their own, then the
> query shall return no rows (enforced by RLS, not only by app-layer checks).

**Unwanted behavior (failed save):**
> **R6:** If the insert into `workout_logs` fails, then the system shall keep
> the set row editable and show "No se pudo guardar la serie" — no silent loss.

**Event-driven (comparison/prefill):**
> **R7:** When a set row is rendered, the system shall prefill its weight and
> reps with the same set's values from the previous session of that exercise,
> when one exists.

**Optional (PWA cache):**
> **R8:** Where the service worker is active, the system shall serve previously
> viewed exercise GIFs from cache (CacheFirst on the Storage bucket URLs).

## Anti-patterns to avoid

- "The system shall be secure / fast / responsive." — not testable.
- "Handle the logging." — names no trigger, no response, no failure path.
- Leaving RLS implicit. If a table holds user data, its access rule is a numbered
  requirement with a denial check.
- Bundling prefill + save + failure handling into one R. Split them; the
  reviewer checks each `R<n>` has a test.
