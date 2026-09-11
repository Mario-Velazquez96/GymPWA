# Tasks — 10_diet_screen

> Orden de implementación. Cada tarea cita el/los requisito(s) que satisface.
> Marca `[x]` al completarla. No empieces hasta que el humano apruebe el spec
> (y 09 esté aplicado en Supabase). ⚠️ Datos reales en vivo: ningún test ni
> script escribe en tablas `diet_*` (RLS lo impediría de todos modos).

## 1. Decisiones previas

- [x] Resolver con el humano los open items A (forma de la nav), B
      (renderizador de Markdown), C (zona horaria fija) y D (`rotacion`
      visible en 10) antes de tocar código (R2, R7, R15)
- [x] **Condicionada a B = react-markdown:** `pnpm add react-markdown
      remark-gfm`; verificar que `pnpm typecheck` resuelve sus tipos y que
      no se añade `rehype-raw` (R15, R21). Si B = renderizador propio, omitir
      y registrar la decisión en el progress file

## 2. Núcleo puro (sin React)

- [x] Añadir `DietPlanFull` a `src/lib/types.ts` (extiende `DietPlan` con las
      cuatro hijas como arrays) (R4, R19)
- [x] Crear `src/lib/diet.ts`: `DIET_TIME_ZONE`, `nowLocalHM(now?)` con
      `Intl` + `hourCycle: "h23"`, `parseHM`, `formatHora`, `formatMinutes`,
      `sortByPosition`, tipo `WindowState` y `getWindowState` con el algoritmo
      del design (R7, R8, R9, R11)
- [x] **Tests unitarios** `src/lib/diet.test.ts`: `nowLocalHM` con fechas UTC
      fijas (09:00 y 23:59 CDMX) (R7); `parseHM`/`formatHora`/`formatMinutes`
      con la tabla de R11; `sortByPosition` (orden, inmutabilidad,
      estabilidad); `getWindowState` con **toda** la tabla de casos del design
      —00:00, 09:00, 09:59, 10:00, 10:01, 14:00, 17:30, 18:00, 19:00, 23:59,
      sin comidas (antes/después), `ventana_inicio: null`, `ventana_fin:
      null`, comida sin `hora`, `hora` mal formada— (R8, R9)

## 3. Service y hooks

- [x] Crear `src/services/diet.ts`: `DIET_ERROR_LOAD`, `DIET_SELECT`,
      `debugDiet` solo en DEV, `getActiveDietPlan()` con la única cadena
      `from("diet_plans").select(DIET_SELECT).eq("status","active").limit(1)`,
      normalización `?? []` y `sortByPosition` en las cuatro hijas; guardas
      `supabase === null`, `error !== null` y `catch` (R4, R5)
- [x] **Tests unitarios** `src/services/diet.test.ts` (cliente mockeado como
      `plans.test.ts`): forma exacta de la consulta y una sola llamada; hijas
      desordenadas → ordenadas; `diet_checklist_items` presentes; `[]` → sin
      plan; error / excepción / cliente `null` → `DIET_ERROR_LOAD` sin
      mensaje crudo; hijas `null` → `[]`; inspección del fuente sin
      `insert(|update(|delete(|upsert(|rpc(` (R4, R5, R17, R19)
- [x] Crear `src/hooks/useDietPlan.ts` siguiendo `usePlanDay` (clave
      `#attempt`, bandera `active`, `retry`) (R16, R17, R18)
- [x] Crear `src/hooks/useNowMinutes.ts` (`setInterval` 60 s, `clearInterval`
      al desmontar, sin refetch) (R7, R10)
- [x] **Tests de hooks** (`renderHook`): `useDietPlan` loading → data / error →
      retry / sin plan; `useNowMinutes` con fake timers: valor inicial, avance
      de 60 s recalcula, unmount limpia el intervalo (R10, R16, R17, R18)

## 4. Componentes presentacionales

- [x] `src/components/MacroSummary.tsx`: `<dl>` de 4 columnas con
      Calorías/Proteína/Carbohidrato/Grasa y unidades "kcal"/"g" (R6)
- [x] `src/components/EatingWindow.tsx`: línea de ventana + texto por `kind`
      exactamente como la tabla del design; sin lectura del reloj (R8, R9)
- [x] `src/components/MealCard.tsx`: `<article>`, `<h3>` "título · HH:MM",
      línea kcal/proteína con partes nulas omitidas, `<ul>` de items, notas
      (R12)
- [x] `src/components/SupplementList.tsx`: sección "Suplementos", grupos
      "Recomendados" / "No vale la pena" (omitidos si vacíos), marca visual +
      `aria-label`, "dosis · momento", nota (R13)
- [x] `src/components/CollapsibleSection.tsx`: `<details>` cerrado por
      defecto, `<summary>` `min-h-11` con el título (R14)
- [x] `src/components/Markdown.tsx`: según la decisión B (react-markdown +
      remark-gfm con `components.table` envuelto en `overflow-x-auto` y
      estilos `[&_tag]:`; o el mini-renderizador) — nunca
      `dangerouslySetInnerHTML` (R15)
- [x] **Tests de componente** para los seis: `MacroSummary` (4 `dt`/`dd`),
      `EatingWindow` (un caso por `kind` + variantes `nextMeal: null` +
      `sin_ventana`), `MealCard` (con/sin campos nulos), `SupplementList`
      (grupos, `aria-label`, vacíos), `CollapsibleSection` (cerrado, abre al
      click, `min-h-11`), `Markdown` (negritas sin `**`, listas, tabla en
      `.overflow-x-auto` sin `|`, `<script>` no renderizado) (R6, R8, R9,
      R12, R13, R14, R15)

## 5. Pantalla, ruta y navegación

- [x] Crear `src/screens/DietScreen.tsx`: `useDietPlan` + `useNowMinutes`,
      estados loading (`role="status"`, "Cargando dieta…") / error
      (`role="alert"` + "Reintentar" ≥ 44px) / vacío ("Aún no tienes un plan
      de dieta asignado") / plan, en el orden MacroSummary → EatingWindow →
      Comidas → Suplementos → "Más del plan"; `<main … pb-24>`; sin renderizar
      `diet_checklist_items` (R6, R16, R17, R18, R19)
- [x] Registrar la ruta `/dieta` en `src/App.tsx` con `ProtectedRoute` +
      `lazy`/`Suspense` (`LoadingScreen` como fallback) (R1)
- [x] Crear `src/components/BottomNav.tsx` (`<nav aria-label="Navegación
      principal">`, `Link` "Hoy"/"Dieta", `aria-current`, `min-h-11`,
      `pb-[env(safe-area-inset-bottom)]`, regla de actividad del design) (R2,
      R3)
- [x] Montar `<BottomNav />` en `src/components/ProtectedRoute.tsx` tras los
      hijos; añadir `viewport-fit=cover` al meta viewport de `index.html` (R2)
- [x] Añadir `pb-24` al `<main>` de `TodayScreen`, `ExerciseScreen` y
      `HistoryScreen` (único cambio en esas pantallas) (R3, R20)
- [x] **Tests de componente/pantalla**: `BottomNav` en `/`, `/ejercicio/x`,
      `/historial/y`, `/dieta` (dos enlaces, `aria-current` correcto,
      `min-h-11`); `ProtectedRoute` renderiza la nav con sesión;
      `DietScreen` (hooks mockeados): los cuatro estados, orden de secciones
      en el DOM, checklist no renderizada, `console.error`/`warn` no llamados
      en el estado vacío, "Reintentar" llama `retry`; `App.test`: `/dieta`
      con sesión → pantalla, sin sesión → `/login`; aserción `pb-24` en las
      tres pantallas existentes (R1, R2, R3, R16, R17, R18, R19, R20)
- [x] Correr las suites de 02–08 sin cambios de comportamiento (solo las
      aserciones que ahora encuentran también la nav) (R20)

## 6. E2E (solo lectura)

- [x] Crear `e2e/diet.spec.ts` con `test.use({ viewport: { width: 390,
      height: 844 } })`, `test.skip` sin credenciales y recolección de
      `pageerror` + `console` `error` (filtrando "Failed to load resource"):
      (1) sin sesión `/dieta` → `/login`; (2) login → nav visible, "Hoy" con
      `aria-current`, clic "Dieta" → `/dieta` + `<h1>Dieta</h1>` + "Dieta"
      con `aria-current`; (3) esperar resolución con reintento ≤ 3 y
      bifurcar: plan activo → `<dl>` `toBeInViewport()` sin scroll, ventana,
      comidas/suplementos/secciones si existen, primera sección cerrada →
      abre → sin `**` ni `|` crudos; sin plan → texto vacío + nav visible;
      (4) listas de errores vacías. Nada se escribe (R1, R2, R3, R6, R8, R9,
      R12, R13, R14, R15, R17)

## 7. Cierre

- [x] Verificar por inspección que `supabase/migrations/`, `vite.config.ts`
      (SW) y `.env.example` quedaron sin cambios y que `package.json` solo
      añadió la(s) dependencia(s) aprobada(s) en B (R21)
- [x] Correr `./init.sh` (typecheck + lint + test con coverage + build) y
      `./init.sh e2e`; verde; confirmar cobertura ≥ 90 % en `lib/diet.ts` y
      ≥ 80 % en el resto de módulos nuevos (todos)
- [x] Registrar el avance en `progress/impl_10_diet_screen.md` (decisiones
      A–D, tamaño del chunk de `/dieta` en la build, resultados de las
      corridas, checklist manual de iPhone: nav alcanzable con el pulgar,
      barra sobre el indicador de inicio, macros visibles sin scroll)

## Verification

- **Comandos:** `./init.sh` (instala, typecheck, lint, unit + coverage,
  build); `./init.sh e2e` o `pnpm e2e` (Playwright contra `pnpm preview`);
  `node scripts/check-rls.mjs` (confirma que 09 sigue aplicado: (d)/(e)
  rechazan escrituras, (f) lee).
- **Trazabilidad R → test:**
  R1 → `App.test.tsx` + `e2e/diet.spec.ts` (1)(2); R2 → `BottomNav.test.tsx`
  + `ProtectedRoute.test.tsx` + e2e (2); R3 → `BottomNav.test.tsx` (Link) +
  aserciones `pb-24` en Today/Exercise/History/DietScreen tests; R4 →
  `services/diet.test.ts` (forma de la consulta, orden, inspección sin
  escrituras); R5 → `services/diet.test.ts` (error/excepción/null);
  R6 → `MacroSummary.test.tsx` + e2e `toBeInViewport`; R7 → `lib/diet.test.ts`
  (`nowLocalHM`) + `useNowMinutes.test.tsx`; R8 → `lib/diet.test.ts` (tabla
  de casos) + `EatingWindow.test.tsx`; R9 → idem (`sin_ventana`);
  R10 → `useNowMinutes.test.tsx` (fake timers, sin refetch); R11 →
  `lib/diet.test.ts` (`formatHora`, `formatMinutes`); R12 → `MealCard.test.tsx`
  + e2e; R13 → `SupplementList.test.tsx` + e2e; R14 →
  `CollapsibleSection.test.tsx` + e2e; R15 → `Markdown.test.tsx` + e2e (sin
  `**`/`|`); R16 → `DietScreen.test.tsx` (loading) + `useDietPlan.test.tsx`;
  R17 → `DietScreen.test.tsx` (vacío, consola limpia) + e2e camino sin plan;
  R18 → `DietScreen.test.tsx` (alert + retry) + `useDietPlan.test.tsx`;
  R19 → `DietScreen.test.tsx` (orden DOM, checklist ausente) +
  `services/diet.test.ts` (checklist cargada); R20 → suites 02–08 verdes +
  `grep` de `supabase.from` fuera de `services/`; R21 → inspección de
  `package.json`, `.env.example`, `vite.config.ts`, `supabase/migrations/`.
- **Coverage:** ≥ 90 % líneas en `src/lib/diet.ts`; ≥ 80 % en
  `src/services/diet.ts`, `src/hooks/useDietPlan.ts`,
  `src/hooks/useNowMinutes.ts`, `src/screens/DietScreen.tsx` y cada
  componente nuevo; umbral global (80 %) intacto.
- **Manual en el iPhone (registrar en el progress file):** con el plan real,
  a las 09:00 se lee "faltan 60 min para Desayuno fuerte" y a las 19:00
  "Ventana cerrada"; los cuatro macros se ven sin scroll; la barra inferior se
  opera con el pulgar y no queda bajo el indicador de inicio en modo
  standalone.
