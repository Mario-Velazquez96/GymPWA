# Review — 01_supabase_schema_and_rls

**Veredicto final: APPROVE** (2026-07-19). El único hallazgo de la primera
ronda (conteo "9" → "8" policies, solo texto) fue corregido y verificado por
diff; todo lo demás ya había pasado. El leader puede marcar la feature como
`done`.

## Ronda 2 — verificación del fix

Confirmado por lectura del diff / re-lectura de los cuatro archivos:

- `supabase/migrations/002_rls.sql`: solo cambió el comentario de la línea 1
  ("ocho policies"); el cuerpo SQL es **idéntico byte a byte** al revisado
  (8 `create policy`, verbatim del design). Nada que re-aplicar en Supabase.
- `supabase/README.md`: líneas 14 y 94 ahora dicen 8 — la afirmación
  verificable de `pg_policies` es correcta (R9 exacto).
- `specs/01_supabase_schema_and_rls/tasks.md`: "the eight policies"; las 9
  casillas siguen `[x]`.
- `progress/impl_01_supabase_schema_and_rls.md`: menciones corregidas + nota
  del fix apéndice.
- `git status`: sin cambios en `src/` ni en ningún otro archivo fuera de los
  cuatro listados (+ este review). Cero cambios de SQL efectivo.

## Verificado en la ronda 1 (todo PASS)

- **Fidelidad de contrato (R1):** diff manual de los 5 `create table` + índice
  de `001_schema.sql` contra `project-documents/solution_design.md` §3.1–3.5 →
  **verbatim** (columnas, tipos, defaults, constraints, comentarios e índice).
  Únicos añadidos: los 3 check constraints spec'd (R2) con los nombres exactos
  del design.
- **RLS (R3–R6):** RLS habilitado en las 5 tablas; las 8 policies coinciden
  exactamente con `design.md`; sin policies de escritura en las 4 tablas de
  solo lectura (RF-6 intacto).
- **Checks operacionales re-ejecutados por el reviewer:**
  `node scripts/check-rls.mjs` → exit 0. R7: anon sin sesión = 0 filas sin
  error en las 5 tablas. R8: insert con `user_id` ajeno rechazado por
  violación de policy RLS (42501/403 — la policy actuó antes que el FK).
- **`./init.sh quick`** → verde (typecheck, lint, 14/14 tests, 100% líneas).
- **Seguridad/alcance:** cero secretos (grep `service_role`/`SERVICE_KEY`/
  `sb_secret`/prefijo JWT limpio), `.env.local` gitignored y nunca impreso,
  cero dependencias nuevas, cero env vars nuevas (las 4 del script ya estaban
  en `.env.example`), ninguna tabla/ruta/scope extra.
- **Trazabilidad R1–R9:** mapeo del progress file creíble y verificado (R1/R2
  vía probes REST con canario 42703 y errores 23514 nombrando los 3
  constraints; R3–R8 vía script re-ejecutado; R9 README exacto tras el fix).

## Residual aceptado: SKIP del insert con `user_id` propio (check c)

**Aceptable para cerrar.** Razones: (1) el FK `exercise_id → exercises(id)`
impide el insert positivo mientras `exercises` esté vacío, y el seed pertenece
explícitamente al repo Gym (out of scope, RF-6) — bloquear invertiría la
dependencia entre repos; (2) la policy `with check` de R6 está aplicada y
demostrada activa por R8 (rechazo 42501, no FK); (3) los probes de R2 con
`user_id` propio atravesaron RLS y murieron en el check constraint (23514),
evidencia del camino positivo; (4) follow-up documentado: re-correr
`node scripts/check-rls.mjs` tras el seed (README y progress file). El leader
debería anotar ese re-run como pendiente cross-repo.

## Nota para el leader

`supabase/`, `scripts/` y los progress files siguen **sin commitear**
(untracked). Al marcar `done`, commitear las migraciones junto con el resto —
con ese commit queda satisfecha la regla "schema change ⇒ migración
commiteada".
