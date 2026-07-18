# Slicing guide — turning a feature into implementable specs

The goal: each spec is **independently implementable and verifiable**, given only
the specs before it. Bad slices block the implementer; good slices flow.

## The default layering for this stack

Order features by dependency, foundation first:

1. **Schema + RLS** — SQL migrations for the tables (plus indexes) and their RLS
   policies, and any Storage bucket policies. No app logic. Everything depends
   on it. Verifiable with the migration applying + a policy/denial check.
2. **Services / data access** — the supabase-js client singleton, typed
   query/mutation functions, row types, error handling. Unit-testable with a
   mocked client. No UI.
3. **Screens / UI** — React Router routes, screens composing components, data
   flowing down from services, loading/empty/error states, Spanish text,
   mobile-first Tailwind. Renders real data.
4. **Interactivity that writes** — the logging UI (steppers, save-per-set,
   prefill/comparison). Separate from the read-only screen when the write path
   has its own failure/rollback logic worth focused tests.
5. **PWA / offline polish** — manifest, install flow, service worker precache +
   runtime cache, performance. Wraps working screens; last.

Adapt to the real system, but keep the principle: buildable and testable given
only the slices before it.

## Heuristics for where to cut

**Cut here (good boundaries):**
- Between schema/RLS and the first code that queries it.
- Between the services layer and the screens that call it (build callable,
  tested functions first; wire UI after).
- Between a screen that *renders* data and the interaction that *writes* data —
  the exercise screen that shows GIF + instructions is one slice; logging sets
  on it is the next.
- Between working screens and PWA/service-worker behavior.

**Don't cut here (creates blocked specs):**
- Splitting a service function from the row types and validation it needs.
- Separating a table's columns from its RLS policy — they ship together in the
  same migration.
- Isolating a component from the service that persists its changes, when
  neither can be tested without the other.
- Splitting comparison ("anterior" column) from prefill — both read the same
  previous-session query.

## Merge when…

- Two "features" are the same code path differing only by data/config. Consider
  one parameterized slice — but if each has distinct RLS or UI, keep them
  separate.
- A piece is too small to test alone and always ships with its neighbor.

## Split when…

- One user-facing feature spans schema + services + read UI + write UI (e.g.
  "la pantalla de ejercicio con registro"). That's 3–4 specs, not one.
- The write path (immediate per-set insert, failure handling, prefill) is
  substantial — give it its own spec so its logic gets focused tests.

## Cross-repo contract awareness

Any slice that touches a shared table (here: the schema consumed by the `Gym`
repo's upload scripts, and exercise IDs `"0001"`–`"1324"`) must state contract
impact explicitly. A schema slice that changes a shared table is an automatic
open item for the human.

## Sanity check before finalizing

For each feature ask: "Given only its `depends_on`, can the implementer build AND
test this without touching anything unbuilt?" Pay special attention to RLS — a UI
slice that reads user data assumes the RLS slice already landed. If the order is
wrong, re-slice.
