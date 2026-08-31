# Current session

## Feature in progress
(none — all 9 SDD features 00–08 are `done` in `feature_list.json`)

## State
2026-08-31: `08_weight_units` closed. Per-exercise **kg/lb** preference stored on
the device (`localStorage`, key `gym:unit:<exercise_id>`, **kg by default and on
any corrupt/blocked value**): `UnitToggle` next to "Registro de series",
steppers of ±5 lb / ±2.5 kg, unit-aware validation ("Anterior", saved rows and
the History screen render through `formatWeight`; History has no toggle of its
own, it just reads the preference). Conversion uses the exact factor
`0.45359237` with round-trip-stable rounding (2 decimals to kg, 1 to lb).
**Storage stays canonical kg** — no migration, no RLS change, no new column — so
the `Gym`-repo contract is untouched. `./init.sh` green (404 tests, 98% lines)
and `./init.sh e2e` green **12/12** against the live project; reviewer APPROVE
with live-data-intact evidence (154 `workout_logs` before and after). See
`progress/history.md` and `progress/impl_08_weight_units.md`.

## Project reality (READ THIS BEFORE TOUCHING E2E OR THE DB)
- The `Gym` repo **has seeded** the catalog: 1324 real `exercises` with real
  Supabase Storage media. The placeholder era is over.
- A **REAL plan is active**: "Recomposición en casa — Septiembre 2026"
  (2026-08-29 → 2026-09-27); the two older plans are `archived`. The user has
  ~154 **real** rows in `workout_logs` and is actively using the app.
- **E2E now runs safely against live data** (`e2e/helpers.ts`): targets derived
  from the live plan via the DOM (05 → 1st card of Hoy, 06 → 2nd, 08 → 3rd),
  ID-precise cleanup in `afterEach` (snapshot ids → delete only the new ones via
  `?id=in.(…)`, never a filter by exercise/date, with a safety cap), and
  assertions that tolerate pre-existing history. Keep any new live-writing spec
  on this pattern.
- ⛔ **Do NOT apply `e2e/fixtures/test-plan.sql`** while a real plan is active:
  it would create a **second** `status='active'` plan and the app could show the
  test plan instead of the real routine. It is legacy, kept only for an empty
  Supabase project (it carries a warning header).

## Notes / blockers
- **(open) RLS own-insert check:** re-run `node scripts/check-rls.mjs` now that
  the catalog is seeded, to close `01_supabase_schema_and_rls`'s last SKIPped
  assertion (the own-`user_id` insert into `workout_logs`, previously blocked by
  the FK against an empty `exercises` table). **Before running it against live
  data, make its cleanup ID-precise like the E2E helpers** — it must delete only
  the row it just inserted (by `id`), never by an `exercise_id`/`performed_at`
  filter, or it can wipe real sets of the user.
- **(human, not auto-verifiable) iPhone checks:** the 07 PWA install checklist
  (`progress/impl_07_pwa_install_and_cache.md`) and the 08 unit smoke test —
  open a dumbbell exercise in lb and another in kg one after the other and
  confirm each keeps its own unit, with the toggle reachable by thumb.
