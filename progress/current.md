# Current session

## Feature in progress
**Ninguna.** `14_ui_redesign_cyclorama` se cerró el **2026-09-12** como `done` en
`feature_list.json`: reviewer del harness **APPROVE con 0 bloqueantes**
(`progress/review_14_ui_redesign_cyclorama.md`) y finish-reviewer de Impeccable
en **`ship`** (`.impeccable/critique/finish-review-14.md`). El resumen completo
—mundo elegido, decisiones A–E, Enmienda 1, las dos rondas de fixes, 868/868
tests, cobertura 98.8 %, CSS 1.116×, detector `[]` y los artefactos nuevos
(`PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, el contrato de dirección
y el finish review)— vive en `progress/history.md`.

Con eso, el lote de Dieta (09–12) y el rediseño (14) están cerrados. La única
feature abierta es **`13_fix_lb_prefill_validation` (`pending`)**, que **espera
una decisión del humano** (ver el bloque del bug más abajo).

## State
2026-09-11: `12_diet_offline` entregada. La sección Dieta funciona sin señal:
tras abrirla una vez con red, el plan completo se guarda como snapshot en
`localStorage` (`gym:diet:snapshot`, `{ v: 1, plan, savedAt }`) y `useDietPlan`
lo sirve en modo stale-while-revalidate, con el banner `role="status"`
"Sin conexión · plan guardado el …" bajo el `<h1>` y reintento al evento
`online`. **No se cachea la API de Supabase en el service worker**
(`vite.config.ts` sin cambios; `e2e/pwa.spec.ts` R5 sigue verde) y el chunk de
`/dieta` ya viajaba en el precache de Workbox (verificado en `dist/sw.js` y en
runtime). Cero migraciones, cero dependencias, cero env vars, cero escrituras a
Supabase.

Dos cambios tocaron **02_auth** (aprobados por el humano y auditados por el
reviewer, que los declara seguros):
1. `useSession` expone `offlineSession` (solo con `AuthRetryableFetchError` +
   sesión persistida, es decir fallo de infraestructura: sin red o 5xx; nunca
   con credenciales inválidas) e ignora `INITIAL_SESSION`; `ProtectedRoute`
   redirige solo `if (session === null && !offlineSession)`. Con esto, en modo
   avión y con el token caducado la app ya **no expulsa a `/login`**;
   `SIGNED_OUT` y los errores 4xx sí siguen expulsando.
2. `services/auth.ts#signOut` borra el snapshot de dieta y, si el cierre remoto
   no puede completarse (sin red + token caducado, donde auth-js sale antes de
   borrar la sesión), **purga la clave `sb-*-auth-token` y repite el cierre**
   para que "Cerrar sesión" cierre de verdad en el dispositivo. Era el menor de
   privacidad que señaló el review de 12.

Historia del lote: el 2026-09-10 llegó
`project-documents/client_requirement_dieta.md`; el leader lo rebanó por capa
(schema/RLS → pantalla de lectura → listas tachables → offline) y se
implementaron 09 → 10 → 11 → 12, una a la vez, con su spec aprobado y su
review.

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
- No hay tablas `diet_*` en el proyecto Supabase todavía: se crean al
  implementar 09 (aplicar 003/004 por el mismo mecanismo que 001/002).

## ⚠ Bug de producción detectado 2026-09-11 (decisión del humano pendiente)

Al correr los E2E de `10_diet_screen` fallaron `e2e/logging.spec.ts` y
`e2e/history.spec.ts`. La investigación (subagente Explore, evidencia con
`archivo:línea`) concluye que **no es fragilidad del test: afecta al usuario**.

**Qué pasa.** Una serie capturada en **lb** se guarda en `workout_logs.weight_kg`
como un kg que **no es múltiplo de 0.5** (15 lb = 6.8 kg, 20 lb = 9.07 kg). Si
ese ejercicio se abre después con la preferencia en **kg** —el valor por defecto
en un dispositivo o navegador nuevo, o si Mario toca "kg"— `buildInitialRows`
precarga ese peso y `validateSet` lo rechaza con *"El peso debe ir en pasos de
0.5 kg"*: **"Guardar serie" no inserta nada**. El stepper de ±2.5 kg conserva el
resto para siempre (6.8 → 9.3 → 11.8…), así que la única salida es teclear el
peso a mano o devolver el toggle a lb. Por el encadenado del prefill, arrastra a
todas las filas siguientes.

**Cadena:** `src/hooks/useWorkoutLog.ts:141` → `src/lib/logging.ts:59` →
`src/lib/units.ts:97` (`WEIGHT_GRAIN` kg 0.5 / lb 0.1). La unidad sale solo de
`localStorage` (`src/lib/units.ts:125-133`, ausente/corrupto → kg); la BD no
guarda en qué unidad se capturó.

**Opciones (la elección es tuya: toca el contrato R7 de 05):**

| | Arreglo | Coste | Riesgo |
|---|---|---|---|
| A | `validateSet` tolera el peso si es exactamente el precargado de un registro previo | Medio | Abre un hueco documentado en R7 de 05 |
| B | Cuantizar el prefill a la rejilla de la unidad activa | Bajo | Cambia en silencio el peso mostrado (6.8 → 7 kg) |
| C | Cuantizar al guardar en vez de rechazar | Bajo | Guarda algo distinto de lo que se ve |
| D | Relajar la rejilla de kg (solo ≥ 0 y 2 decimales) | Mínimo | Contradice R7 de 05 y sus tests: cambio de spec |
| E | Persistir la unidad de captura por serie (columna nueva) | Alto | Migración sobre 154 filas reales; toca el contrato con `Gym` |
| F | Tocar solo el E2E | Mínimo | Deja la suite verde y **enmascara** el bloqueo real |

Registrado como `13_fix_lb_prefill_validation` (`pending`) en
`feature_list.json`. **No se ha tocado nada de 05 ni de 08.**

## ⏳ Esperan DECISIÓN o ACCIÓN del humano (lista corta, de un vistazo)

1. ~~**Aplicar las migraciones de 09 en el proyecto en vivo**~~ ✅ **HECHO
   2026-09-11.** El humano aplicó `003_diet_schema.sql` y `004_diet_rls.sql`.
   `node scripts/check-rls.mjs` → **exit 0, todos los checks PASARON** (las 10
   tablas; (d) y (e) confirman que la app **no** puede escribir en `diet_*`,
   que es el criterio 9 del requerimiento). Contrato de columnas verificado por
   probe REST: 14/9/7/8/6 columnas, idénticas a §6. `e2e/diet.spec.ts` 2/2.
   Queda solo la comprobación visual opcional de `pg_policies` (13) y
   `pg_indexes` en el SQL Editor. Detalle en
   `specs/09_diet_schema_and_rls/tasks.md` §"Cierre operacional".

2. **Falta el plan de dieta: lo sube el repo `Gym`.** Las tablas ya existen y
   están vacías, así que `/dieta` muestra hoy su **estado vacío** ("Aún no
   tienes un plan de dieta asignado"), que es lo correcto. Para verlo con datos
   hay que construir `scripts/upload-diet.mjs` en el repo `Gym` (contra el DDL
   de `003_diet_schema.sql`, archivando el plan anterior antes de insertar) y
   subir un plan. Con el plan cargado, volver a correr los E2E que aún se
   saltan:
   - `npx playwright test e2e/diet-offline.spec.ts` → su **test 2 (criterio 7
     completo: modo avión, banner, tachado sin red, vuelta de la señal)**
     **nunca se ha ejecutado de verdad**.
   - `npx playwright test e2e/diet-checklists.spec.ts` → sus **dos** tests,
     idem.
   - El camino "plan activo" de `e2e/diet.spec.ts`.
3. **Checklist manual en el iPhone** (no automatizable):
   - 07: instalación de la PWA (`progress/impl_07_pwa_install_and_cache.md`).
   - 08: smoke de unidades kg/lb.
   - 10 y 11: lectura de la dieta y tachado con el pulgar en la cocina y en el
     súper (entradas de 10 y 11 en `progress/history.md`).
   - 12: abrir Dieta con red → modo avión → cerrar y reabrir la app instalada →
     plan completo con banner → tachar en el súper → salir del modo avión → el
     banner desaparece. **Repetir con la app cerrada más de 1 h** (token
     caducado) para ejercitar el camino de sesión sin red: debe quedarse en
     Dieta, no rebotar a `/login` (tolerando hasta ~30 s de "Cargando…"
     mientras auth-js se rinde: es comportamiento de supabase-js, no de la app).
     Medir de paso `localStorage["gym:diet:snapshot"].length`.
4. **Decidir la opción de `13_fix_lb_prefill_validation`** (tabla A–F del bloque
   del bug, arriba). Toca el contrato R7 de 05, por eso la elección es tuya.
   Mientras tanto, `e2e/logging.spec.ts` y `e2e/history.spec.ts` seguirán en
   rojo.
5. **`e2e/today.spec.ts` roza el timeout de 30 s** (pasa en ~34.7 s con
   `--timeout=180000`): recorre el plan real día a día y el margen se estrecha
   conforme avanza el mes. Decidir si se sube el timeout del test o se acota el
   recorrido. Ajeno a cualquier feature del lote de Dieta.
6. **Menor abierto del review de 12 (impacto práctico nulo):** `signOut` borra
   `gym:diet:snapshot` pero **no** las claves de tachado `gym:diet:check:*` del
   usuario anterior. Limpiarlas pertenece a 11 (su módulo `lib/checklist.ts`),
   fuera de la superficie que autorizaba el spec de 12. ¿Se abre una feature
   pequeña de higiene o se deja así?
7. **Smoke manual en el iPhone del rediseño (`14_ui_redesign_cyclorama`).** Nada
   de esto es automatizable; abrir la app **instalada** desde la pantalla de
   inicio y comprobar: barra de estado y fondo **negros** (`#050505`, sin
   destellos blancos al arrancar); la **banda de horizonte** legible bajo la luz
   fuerte del gym, con el título del día como lo más grande de la primera
   pantalla; **guardar una serie** y ver el **amanecer** de la fila; con
   **"Reducir movimiento"** activo (Ajustes › Accesibilidad › Movimiento) el
   cambio es un **corte**, no un barrido; flechas ‹ ›, −/+ y "Guardar serie"
   alcanzables **con el pulgar** y sin fallar el toque; **Historial** en día
   blanco (decisión A) y **Dieta** con las fases de la ventana de alimentación
   (decisión B).
8. **Defecto del helper de `e2e/diet-offline.spec.ts` (sin dueño, ajeno a 14).**
   `readDietContent` localiza el nombre del plan con
   `main.locator("p").first()`, pero **sin red el primer `<p>` de `<main>` es el
   `OfflineBanner`** ("Sin conexión · plan guardado el …"), así que el test lee
   el banner en vez del plan y falla. Arreglo sugerido: localizar el nombre por
   la clase del kicker o por `main p:not([role])`. Junto a este, recordar que
   **el timeout de `e2e/today.spec.ts` sigue abierto** (punto 5 de esta lista):
   son los **dos** fallos E2E preexistentes que 14 no tocó ni empeoró
   (`e2e/helpers.ts` quedó sin diff).
9. **Decisión de versionado de las capturas del review de 14.** `.gitignore`
   ignora `.impeccable/review/`, así que las **8 capturas** que sirvieron de
   evidencia al finish review (8 221 – 223 258 B, incluida `desktop.png`)
   existen en disco pero **no entrarían en el commit**: quien clone el repo no
   verá la evidencia del cierre. Son **reproducibles** con
   `CAPTURE=1 npx playwright test e2e/review-capture.spec.ts` (requiere
   credenciales en vivo). El humano decide si se versionan —dejando de
   ignorarlas— o se quedan fuera como artefacto local.

## Notes / blockers
- **Sin bloqueos técnicos.** No hay ninguna feature `in_progress`: la siguiente
  sesión empieza por la decisión del punto 4 (bug de kg/lb) o por lo que el
  humano priorice.
- Specs 09–12 aprobados el 2026-09-10 y ya implementados y revisados; sus
  `specs/<feature>/tasks.md` quedan con todas las casillas marcadas y con las
  notas del resultado real (incluidos los E2E que se saltan).
- Recordatorio permanente: este repo solo escribe en `workout_logs`; planes y
  catálogo (y ahora las tablas `diet_*`) son de solo lectura y pertenecen al
  repo `Gym`. La service key nunca vive aquí.
