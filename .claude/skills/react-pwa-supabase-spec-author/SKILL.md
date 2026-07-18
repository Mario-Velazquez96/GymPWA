---
name: react-pwa-supabase-spec-author
description: Generate Spec-Driven Development (SDD) specs for a React + Vite + TypeScript PWA backed by Supabase (Postgres + Auth + Storage via supabase-js, RLS-enforced), styled with Tailwind, deployed on Vercel/Netlify. Use this skill WHENEVER the user wants to create specs, turn a design or PRD into specs, slice a feature into implementable units, or prepare web app work for an SDD/Kiro-style flow — even if they don't say the word "spec". Trigger on phrases like "create the specs", "generate specs from this design", "break this feature into pieces", "make specs I can implement with Claude Code", or when a product/feature description for this stack is shared with intent to build. Produces one folder per feature, each with requirements.md (EARS notation) + design.md + tasks.md, sliced by deployable layer (schema/RLS → services/data access → screens/UI → PWA/offline polish) and left at spec_ready for human approval. Assumes an existing SDD harness (AGENTS.md, .claude/agents/, docs/specs.md) and integrates into its specs/ folder and feature_list.json.
---

# React PWA + Supabase Spec Author

This skill turns a product/feature description (or PRD, or design doc) into a set
of implementable SDD specs for a **React + Vite + TypeScript + Tailwind +
supabase-js PWA on Vercel/Netlify** project. The output drops into the repo's
`specs/` folder and is fed to Claude Code one feature at a time.

It uses the **same SDD flow** as the rest of the harness: three Kiro-style files
per feature, EARS-notation requirements, a human approval gate, and a
`feature_list.json` with the standard statuses. Only the technical conventions
change for this stack.

The point of SDD is that the **spec is the approved plan** the human signs off on
*before* any code is written. So specs must be precise, traceable, and sliced so
each one is independently implementable and verifiable.

## Assumes the harness

This skill assumes the repo already has the SDD harness (`AGENTS.md`,
`.claude/agents/`, `docs/specs.md`). These specs slot into the harness's
`specs/` folder and `feature_list.json`. If the harness is missing, still
generate the specs the same way — just tell the user they'll need the harness
(or a human) to drive implementation.

## The workflow

Follow these steps in order. The slicing decision (Step 2) is where most of the
value is.

### Step 1 — Read and understand the source

Read the entire source (PRD, design doc, or feature description) before writing.
In this repo that means `project-documents/client_requirement.md` and
`project-documents/solution_design.md`. Identify, for each feature area:

- **Data** — tables, columns, relationships, and the **Row Level Security (RLS)**
  posture. In a SPA the anon key is public, so RLS *is* the authorization
  boundary, not defense in depth.
- **Data access** — the typed service functions over supabase-js and where they
  are called from (screens/hooks — never inside presentational components).
- **UI** — routes/screens (React Router), components, Tailwind, mobile-first /
  one-hand gym UX, Spanish text, loading/empty/error states.
- **PWA** — manifest, service worker precache vs runtime cache, what must work
  fast on gym mobile data, what needs a connection.
- **Cross-repo contracts** — anything another system depends on (here: the
  `Gym` repo's exercise IDs `"0001"`–`"1324"` and the shared table schema).
  Changes to a contract are always an explicit open item.
- **Architecture standards** stated in the source — carry them into every spec.

**Flag any inconsistency or unconfirmed assumption** (ambiguous ownership rules,
unclear RLS intent, offline expectations). These become explicit open items for
the human at the approval gate — never silently decide.

Read `references/stack-conventions.md` before writing designs — it has the
current, verified conventions for this stack (supabase-js in a SPA, RLS,
vite-plugin-pwa, testing).

### Step 2 — Slice by deployable layer, not by the source's feature list

Source docs often describe whole user-facing features ("la pantalla de
ejercicio con registro"). Those are rarely the right unit to implement
one-at-a-time, because they span schema, data access, and UI. Slice into
**layers that are independently deployable and verifiable**, ordered by
dependency. The canonical slicing for this stack:

1. **Schema + RLS** — SQL migrations for the tables plus their RLS policies and
   Storage bucket policies. Data foundation. Everything depends on it.
   Verifiable with the migration applying + policy/denial checks.
2. **Services / data access** — the supabase-js client singleton and typed
   query/mutation functions with error handling. Unit-testable with a mocked
   client. No UI.
3. **Screens / UI** — routes, screens, components rendering real data via the
   services, with loading/empty/error states. A screen that *renders* is a
   clean slice before the one you can *log sets* on.
4. **PWA / offline polish** — manifest, install flow, service worker caching
   strategy, performance. Last, because it wraps working screens.

Adapt to the actual system, but keep the principle: each slice must be buildable
and testable given only the slices before it. Record `depends_on` per feature.
See `references/slicing-guide.md` for heuristics.

Before generating files, present the proposed slicing to the user and confirm it.

### Step 3 — Generate three files per feature

For each feature, create `specs/<NN_feature_name>/` with `requirements.md`,
`design.md`, `tasks.md`. Numeric prefix (`01_`, `02_`) reflects implementation
order. Follow `references/spec-templates.md` exactly. Essentials:

- **requirements.md** — purpose, in/out of scope, numbered **EARS** requirements
  (`R1`…), acceptance, open items. RLS and auth rules are first-class
  requirements, not implementation details. So are UX rules the source mandates
  (Spanish UI, kg, touch targets, steppers).
- **design.md** — technical approach: SQL migration + RLS, service functions and
  their queries, screen/component tree and data flow, PWA impact, validation,
  and test approach. Cite the source's sections.
- **tasks.md** — ordered `- [ ]` checklist, each task citing the requirement(s)
  it satisfies, plus explicit test tasks and a coverage/verification target.

See `references/ears-notation.md` for writing good EARS requirements with
examples from this stack.

### Step 4 — Set status and surface open items

- Create or merge `feature_list.json`, every new feature at `status:
  "spec_ready"` with its `depends_on`. Preserve existing `in_progress`/`done`
  entries. (Statuses: `pending` → `spec_ready` → `in_progress` → `done`, plus
  `blocked`.)
- **Stop at `spec_ready`.** Do not implement. A human must read and approve before
  anything moves to `in_progress`.
- Summarize: the slices, the implementation order, and **every open item needing
  a decision before building**. Make open items impossible to miss.

## Output shape

```
specs/
  01_schema_and_rls/      {requirements,design,tasks}.md
  02_services/            {requirements,design,tasks}.md
  03_screens/             {requirements,design,tasks}.md
  04_pwa_polish/          {requirements,design,tasks}.md
feature_list.json         all new features at spec_ready, with depends_on
```

## Reference files

Read as needed — don't load all up front:

- `references/spec-templates.md` — exact templates + `feature_list.json` schema.
  **Read before generating any spec.**
- `references/ears-notation.md` — EARS patterns with React/Supabase PWA examples.
- `references/slicing-guide.md` — heuristics for slicing features into layers.
- `references/stack-conventions.md` — current verified conventions for React +
  Vite + supabase-js + Tailwind + vite-plugin-pwa on Vercel/Netlify.
  **Read before writing designs.**
