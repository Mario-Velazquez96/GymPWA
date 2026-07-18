# docs/specs.md — Spec-Driven Development process

This project uses a Kiro-style, three-file spec per feature plus a human
approval gate. Read this before drafting or reading any spec.

## The three files

Each `"sdd": true` feature gets a folder `specs/<feature>/` with:

| File | Purpose |
|---|---|
| `requirements.md` | What and why. User stories + acceptance criteria in EARS notation, numbered `R1…Rn`. Scope and out-of-scope. |
| `design.md` | How. Technical approach: screens/components, services and their Supabase queries, SQL schema/RLS changes, PWA/service-worker behavior, validation, security. |
| `tasks.md` | Ordered, checkable implementation steps. Each task cites the requirement(s) it satisfies and includes explicit test tasks + a coverage target. |

## EARS notation

Write acceptance criteria as structured EARS statements so they are testable:

- **Ubiquitous:** "The system shall <response>."
- **Event-driven:** "When <trigger>, the system shall <response>."
- **State-driven:** "While <state>, the system shall <response>."
- **Unwanted behavior:** "If <condition>, then the system shall <response>."
- **Optional:** "Where <feature included>, the system shall <response>."

Examples for this stack:
> **R3 (Event-driven):** When the user taps "Guardar serie" on a set row, the
> system shall insert one `workout_logs` row with the row's `set_number`,
> `reps`, and `weight_kg`, and show the row as saved.
>
> **R4 (Unwanted behavior):** If the insert into `workout_logs` fails, then the
> system shall keep the row editable and show "No se pudo guardar la serie" —
> no silent data loss.
>
> **R5 (State-driven):** While the current plan day has `is_rest = true`, the
> Hoy screen shall show the rest-day state and no exercise list.

## What good design.md decisions look like here

- Which **screens/components** are involved and how data flows down from
  services (no fetching inside components).
- Each **service function**: its supabase-js query, its row types, and its
  error handling.
- **SQL schema / RLS** additions as a numbered migration in
  `supabase/migrations/`, and whether they touch the cross-repo contract with
  `Gym` (if so, flag it as an open item for the human).
- **RLS posture:** remember the anon key is public — policies are the
  enforcement, route guards are UX (see `docs/architecture.md`).
- **PWA impact:** does this feature change what the service worker precaches or
  runtime-caches?
- Any new env vars (added to `.env.example`) and new dependencies.

## The human approval gate

```
pending → [spec_author] → spec_ready → ⏸ HUMAN → in_progress → [implementer → reviewer] → done
```

When a spec reaches `spec_ready`, the leader **stops**. A human reviews the
three files and either approves (status → `in_progress`) or requests changes
(spec_author revises). Implementation never begins before approval.

## Traceability contract

Every `R<n>` must be traceable to at least one test (Vitest unit/component or
Playwright E2E). The reviewer enforces this: a requirement with no corresponding
test is an automatic rejection.
