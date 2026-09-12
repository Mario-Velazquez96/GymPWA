# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Mario** — usuario único, uso personal. Abre la app en su **iPhone** (PWA
instalada desde Safari) **en el gimnasio**, entre series, para ver qué toca y
registrar lo que levantó.

Situación confirmada en entrevista (2026-09-12):

- **Con prisa entre series:** registra la serie en los 30–90 s de descanso, con
  una mano y sin ganas de leer.
- **Manos sudadas o con guantes:** los toques son imprecisos; los controles
  deben ser grandes y estar separados.
- **Luz fuerte o reflejos:** el gym tiene luz intensa y pantallas reflejantes;
  el contraste manda sobre la estética.

Evidencia del repositorio, **no confirmada en entrevista:** la sección Dieta se
consulta fuera del gym (cocina y súper) con listas tachables
(`progress/history.md`, features 10–12).

## Product Purpose

Ejecutar y registrar la rutina del día. La app muestra la rutina que toca hoy
(plan mensual activo), guía cada ejercicio (GIF + instrucciones en español +
series/reps objetivo) y registra cada serie (reps y peso) con la sesión
anterior a la vista para saber cuánto cargar. Éxito = cada serie queda
registrada sin fricción y la carga progresa semana a semana.

Desde 2026-09 incluye una sección **Dieta** de solo lectura (plan de comidas,
macros, ventana de alimentación, suplementos) con listas tachables de meal prep
y súper, disponible sin señal.

## Positioning

No compite con nadie: es la superficie de ejecución de un **sistema personal
de dos repos**. Un agente entrenador (repo `Gym`) genera el plan mensual a
partir de un dataset de 1,324 ejercicios y de los pesos **realmente
registrados** en esta app; la app solo ejecuta y registra. La progresión no es
una función más: es el ciclo completo del producto.

## Operating Context

- **Dispositivo:** iPhone, Safari en modo `standalone` (sin barra del
  navegador), una mano, pulgar en la mitad inferior de la pantalla.
- **Red:** datos móviles dentro del gym, conectividad irregular. La rutina del
  día (~6–8 ejercicios con GIFs, ~500 KB) debe cargar rápido; los registros
  requieren conexión; la Dieta funciona sin señal (snapshot local).
- **Ritmo:** sesiones de ~1 h; la app se abre y cierra muchas veces entre
  series. Reabrir el mismo ejercicio el mismo día debe mostrar lo ya guardado.
- **Backend:** Supabase (Postgres + Auth + Storage), RLS como frontera de
  seguridad, capa gratuita. Vercel/Netlify capa gratuita.
- **Ecosistema:** planes, catálogo de ejercicios y plan de dieta los sube el
  repo `Gym`; ambos repos se comunican solo a través de Supabase.

## Capabilities and Constraints

**Pantallas (rutas):** `/login` · `/` **Hoy** (rutina del día, navegación
‹ día ›, estados: descanso, sin rutina, sin plan) · `/ejercicio/:id`
**Ejercicio** (GIF, metas, equipo/músculo, notas del entrenador, pasos, registro
de series, historial) · `/historial/:exerciseId` **Historial** (sesiones por
fecha) · `/dieta` **Dieta** (comidas, macros, ventana, suplementos, meal prep
y súper tachables). Navegación principal: barra inferior fija con **Hoy** y
**Dieta**.

**Registro de series:** una fila por serie objetivo + "Agregar serie";
columna "Anterior: peso × reps"; steppers −/+ (±2.5 kg / ±1 rep) con valor
tappable para teclear; guardado inmediato por fila (editable → guardando →
✓ guardada | error inline). Peso en pasos de 0.5 kg.

**Restricciones duras:**

- Solo lectura sobre planes, ejercicios y dieta. **Escribe únicamente en
  `workout_logs`.** No se crean ni editan rutinas desde la app.
- **Idioma: español (es-MX, "tú").** Unidad canónica **kg**; toggle kg/lb por
  ejercicio guardado en el dispositivo (la BD siempre guarda kg).
- **Touch targets ≥ 44 px** (`min-h-11`), números grandes para peso/reps,
  acciones primarias alcanzables con el pulgar (abajo). Steppers, no teclado,
  siempre que se pueda.
- Todo estado asíncrono tiene carga, vacío y error con "Reintentar" explícitos.
- Contrato cross-repo intocable: IDs de ejercicio `"0001"`–`"1324"` y el
  esquema de tablas de `project-documents/solution_design.md` §3.
- Solo la anon key vive en este repo; las `VITE_*` son públicas.
- Stack fijo: React + Vite + TypeScript, Tailwind CSS v4 (`@import
  "tailwindcss"`, sin `tailwind.config`), React Router, `vite-plugin-pwa`,
  pnpm, Vitest + RTL + Playwright. Sin dependencias nuevas fuera de un spec
  aprobado.

**Hechos de producto sin decidir:**

- `13_fix_lb_prefill_validation` (`pending`): una serie capturada en lb puede
  precargar un kg fuera de la rejilla de 0.5 y bloquear "Guardar serie". La
  opción de arreglo (A–F en `progress/current.md`) la decide el humano.
- Modo offline con cola de sincronización para los registros: mejora futura,
  no comprometida.

## Brand Commitments

- **Nombre:** "Rutinas Gym" (título), "Rutinas" (nombre corto en el iPhone).
  Se conserva.
- **Look actual (slate oscuro + acento sky):** **no vinculante.** En entrevista
  se eligió rediseño total; el look vigente es solo evidencia de lo que no se
  quiere. El ícono actual tampoco es vinculante.
- **Sin colores, tipografías ni referencias obligatorias** declaradas por el
  usuario.
- **Atribución obligatoria** de la media de ejercicios en la pantalla
  Ejercicio: `© Gym visual — https://gymvisual.com/` (licencia: uso personal;
  revisar antes de cualquier publicación).

## Evidence on Hand

- **1,324 ejercicios reales** con nombre, instrucciones en español, thumbnail
  e GIF (180×180, © Gym Visual) en Supabase Storage (tabla `exercises`).
- **Plan real activo:** "Recomposición en casa — Septiembre 2026"
  (2026-08-29 → 2026-09-27); ~154 filas reales en `workout_logs`. La app está
  en uso diario.
- **Dieta:** tablas `diet_*` creadas y vacías; hasta que el repo `Gym` suba un
  plan, `/dieta` muestra su estado vacío real ("Aún no tienes un plan de dieta
  asignado").
- **Ausencias que no se deben fabricar:** no hay logo, no hay ilustraciones ni
  fotografía propia, no hay testimonios ni métricas de marketing (usuario
  único, sin superficie de persuasión).

## Product Principles

1. **La serie se registra en un toque y medio.** Prefill de la sesión anterior,
   stepper, guardar. Todo lo que añada un paso resta.
2. **Legible a un brazo de distancia bajo luz de gym.** Números de peso y reps
   como protagonistas; contraste alto por defecto; nada que exija leer texto
   largo entre series.
3. **"Anterior" siempre a la vista.** La progresión es el producto: lo que
   levantaste la última vez acompaña a cada fila, nunca a un tap de distancia.
4. **Toques grandes y separados.** Manos sudadas y guantes: ≥ 44 px, espacio
   entre acciones opuestas (−/+, guardar/agregar), primarias abajo.
5. **La app nunca miente sobre el estado.** Guardado, guardando, error, sin
   señal y plan guardado se distinguen sin ambigüedad, y no solo por color.

## Accessibility & Inclusion

Sin requerimiento específico establecido (entrevista: "ninguna conocida"). Se
sostienen como base: contraste alto legible bajo luz intensa, touch targets
≥ 44 px, estados distinguibles por forma/texto además de color, `role="status"`
y `role="alert"` en estados asíncronos (ya presentes en el código).
