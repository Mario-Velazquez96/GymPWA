# Spec templates

Use these templates verbatim (adapting content). Keep the headings — the SDD
harness and reviewer rely on them.

---

## requirements.md

```markdown
# Requirements — <NN_feature_name>

**Feature:** <one-line name>
**Source:** <source doc + section refs, e.g. client_requirement RF-4, solution_design §4.1>
**Depends on:** <comma-separated feature names, or "none (foundation layer)">

## Purpose

<2–4 sentences: what this feature delivers and why; what it does NOT include.>

## In scope

- <concrete artifacts: tables, RLS policies, migrations, service functions,
  screens/routes, components, PWA behavior>

## Out of scope

- <what belongs to other features; name them>

## Requirements (EARS)

**R1 (<EARS type>):** The system shall <...>.
**R2 (<EARS type>):** When <trigger>, the system shall <...>.
**R3 (<EARS type>):** If <condition>, then the system shall <...>.
<number every requirement so tests trace to R<n>. Make RLS/auth rules explicit
requirements, e.g. "If a user queries a plan they don't own, then the query
shall return no rows." Make mandated UX rules (Spanish text, kg, steppers,
touch targets) requirements too.>

## Acceptance

<observable end state that proves the feature works; reference source verification
scenarios if any. For UI, include accessibility criteria.>

## Open items

<inconsistencies or unconfirmed assumptions for the human to resolve at the
approval gate — especially anything touching the cross-repo contract; omit the
section if none>
```

---

## design.md

```markdown
# Design — <NN_feature_name>

**Source:** <source doc + section refs>

## Approach

<how it's built; note the layer: schema/RLS vs services vs screens/UI vs PWA>

## <Schema / RLS / Services / Screens / PWA>

<For schema: the SQL migration file (tables, indexes) plus the RLS policies —
they ship together in supabase/migrations/. For services: each function, its
supabase-js query, row types, and error handling. For UI: routes, screen and
component tree, data flow (services → screens → components), loading/empty/error
states. For PWA: manifest fields, precache vs runtime-cache rules.>

## Auth & security

<who can do what; RLS is the enforcement (the anon key is public), route guards
are UX; the app writes only to workout_logs; no service key ever in this repo>

## Validation

<client-side validation per input (set_number ≥ 1, reps ≥ 1, weight_kg ≥ 0 in
0.5 steps); DB constraints as backstop>

## Test approach

<unit/component/E2E split, the RLS denial check, coverage or "what proves done"
target>

## Open items / discrepancies

<repeat the most important flag for the human>
```

---

## tasks.md

```markdown
# Tasks — <NN_feature_name>

> Each task cites the requirement(s) it satisfies. Mark `[x]` as completed.

- [ ] <task> (R1)
- [ ] <task> (R2, R3)
- [ ] <blocking decision task if there's an open item>
- [ ] Write tests: <unit/component/E2E> asserting R1–Rn
- [ ] Verify RLS: anon reads nothing; a user reads only their own rows (schema features)
- [ ] Verify build + typecheck + lint pass; confirm <coverage/target>

## Verification

<exact commands/scenarios that prove done; map each R<n> to its test>
```

---

## feature_list.json schema

```json
{
  "features": [
    {
      "name": "01_schema_and_rls",
      "description": "<short summary>",
      "sdd": true,
      "status": "spec_ready",
      "depends_on": []
    },
    {
      "name": "02_services",
      "description": "<short summary>",
      "sdd": true,
      "status": "spec_ready",
      "depends_on": ["01_schema_and_rls"]
    }
  ]
}
```

Status values: `pending` → `spec_ready` → `in_progress` → `done` (or `blocked`).
This skill always outputs `spec_ready`. When merging into an existing file,
preserve entries already at `in_progress` or `done`.
