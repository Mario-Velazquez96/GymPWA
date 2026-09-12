---
version: 1
slug: "src-screens-todayscreen-tsx"
primary_target: "src/screens/TodayScreen.tsx"
related_targets: ["src/screens/ExerciseScreen.tsx","src/screens/HistoryScreen.tsx","src/screens/DietScreen.tsx","src/screens/LoginScreen.tsx","src/components/AppHeader.tsx","src/components/BottomNav.tsx"]
---

# Surface brief — Rutinas Gym (rediseño completo; superficie primaria: Hoy)

## Scope and visitor mode

Mode: **Operate**. Superficie primaria `/` (Hoy); el mundo alcanza `/ejercicio/:id`,
`/historial/:exerciseId`, `/dieta`, `/login` y el app shell (AppHeader, BottomNav).
Rediseño de reemplazo: el look slate+sky vigente es solo evidencia y anti-referencia.
Se conservan producto, contenido, funciones, rutas, copy en español, contrato de tests
(clases estructurales `min-h-11`, `fixed bottom-0`, `pb-24`, `line-through`,
`aspect-square`, `grid-cols-4`, `overflow-x-auto`, `list-decimal`) y accesibilidad
(`role="status"`/`"alert"`, `aria-pressed`, `role="checkbox"`).

## Audience, job, action, constraints

Mario, una mano, entre series (30–90 s), manos sudadas o con guantes, luz fuerte con
reflejos. Tarea: ver qué toca hoy y registrar cada serie con la anterior a la vista.
Restricciones: solo escribe `workout_logs`; touch ≥ 44 px; números grandes; sin
dependencias ni webfonts nuevos salvo spec aprobado; Tailwind v4 (`@theme` en
`src/index.css`, sin `tailwind.config`); datos móviles (sin efectos que cuesten
batería o bytes: nada de canvas/WebGL; solo CSS).

## Chosen direction and memorable moment

Mundo: **ciclorama de amanecer** (retadora del catálogo elegida por el usuario sobre
la tirada asignada; verdicto competitivo). Quality bar del mundo: board y hero de
`stagecraft-theater-lighting-cyclorama-dawn` (paleta oficial: Cyclorama Black
#050505, Cobalt Horizon #0A33FF, Rose Gather #FF6AAE, Dawn Rose #FFC1D6, Day Wash
#F7F5FF, White Day #FFFFFF; materiales: negro mate absorbente, cobalto satinado,
blanco difuso). Momento memorable: **guardar una serie es un amanecer**: la fila sube
de noche a día en un solo barrido de luz, y la rutina del día se va aclarando
conforme se completa.

Riesgo honesto asumido por el usuario: el negro de ciclorama recoge reflejos bajo luz
fuerte. Mitigación vinculante: numerales blancos grandes sobre negro (contraste
máximo), el rosa nunca es fondo de texto pequeño, y cada fase lleva etiqueta y forma
además de color (`aria`/texto: "Guardada", "Guardando…", "Pendiente").

## Unresolved decisions (a builder must not invent)

- Tipografía: sin webfont. El display estarcido del quality bar NO se importa;
  kickers de sección = system sans en mayúsculas con tracking; numerales = system
  sans con `tabular-nums`. Cambiarlo exige spec.
- Ícono/manifest `theme_color` (#0f172a hoy) pasa a #050505; cambio de
  `vite.config.ts`/`index.html` explícito en tasks. El ícono no se rediseña aquí.
- Historial: propuesta: sesiones en día blanco (completadas), la más reciente arriba
  con filo de horizonte. Confirmar en spec.
- Dieta: la ventana de alimentación mapea a fases literales (antes = noche, dentro =
  día, después = apagón). Confirmar en spec.

## Direction contract

THESIS: Una rutina que amanece. Cada fila es una banda de horizonte que sube de
noche a día al completarse; la app rehúsa la lista de tarjetas oscuras con acento
neón de la categoría.

OWN-WORLD: Tierra negra sin profundidad (#050505) a pantalla completa; contenido en
bandas horizontales apiladas. El horizonte cobalto→rosa (#0A33FF → #FF6AAE, degradado
lineal vertical, único degradado permitido) es el material estructural: banda del
día, acción primaria y fila activa. Día blanco (#FFFFFF, paso Day Wash #F7F5FF) solo
para lo guardado y completo, con tinta #050505 encima. Apagón (#3A3A3A, texto al
60 %) para deshabilitado; falla de cue (#E0342C sobre negro, siempre con texto) para
error. Sin cristal, sin sombras difusas, esquinas con radio ≤ 6 px. Kickers en
mayúsculas de plot (system sans, 700, tracking 0.08em, 11–12 px); numerales
tabulares 700–800 a 28–40 px; cuerpo 16 px blanco al 90 %. Controles: rectángulos
≥ 44 px con borde 2 px del color de su banda; primario = horizonte con texto blanco;
guardado = día blanco con tinta negra.

STORY: Abro la app y veo la noche con el horizonte cobalto marcando el día; sé qué
toca y cuánto llevo porque las filas hechas ya son de día. Entro al ejercicio, la
serie activa lleva el filo de horizonte, la anterior está a su lado; toco guardar y
la fila amanece. Al terminar, la pantalla es de día.

FIRST VIEWPORT (Hoy, 390 × 844): franja superior negra de 44 px con RUTINAS GYM como
kicker y "Cerrar sesión" a la derecha. Debajo, banda de horizonte de ~96 px (cobalto
arriba, rosa abajo): título del día 22 px 700 blanco, fecha en kicker, flechas ‹ › como
cuadros de 44 px con borde blanco 2 px en los extremos. Luego las bandas de ejercicio,
72 px cada una, en orden del plan: número tabular 01… (kicker) a la izquierda,
thumbnail 56 px, nombre 16 px 600, "4 × 10" tabular 18 px a la derecha; banda en
noche si no ha empezado, con filo de horizonte de 3 px a la izquierda si tiene series
guardadas hoy, en día blanco si completó todas. Barra inferior fija negra con "Hoy" y
"Dieta" de 44 px; la activa lleva el filo de horizonte de 3 px arriba. Motion: 200 ms
de barrido de luz de abajo hacia arriba al cambiar de fase (`background-position`
sobre un degradado, solo CSS); `prefers-reduced-motion` lo vuelve corte.

FORM: Ciclorama de amanecer (`stagecraft-theater-lighting-cyclorama-dawn`), retadora
competitiva elegida por el usuario sobre la asignada #6 de la lista (señalización de
piso); seed key eee43132.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
