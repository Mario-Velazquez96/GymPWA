# Client Requirement — Sección de Dieta en la PWA

**Fecha:** 2026-09-10
**Cliente / Usuario final:** Mario (mariovt860@gmail.com) — usuario único, uso personal.
**Documentos hermanos:** [client_requirement.md](client_requirement.md) · [solution_design.md](solution_design.md)

## 1. Objetivo

Agregar a la PWA una sección **Dieta** donde Mario consulte, desde el iPhone, el
plan de alimentación vigente que le generó el agente: cuántas calorías y
macronutrientes le tocan, en qué ventana horaria come, qué lleva cada comida y
las reglas de seguimiento.

Hoy ese plan vive en un documento suelto fuera de la app. El problema es el
mismo que ya resolvimos con las rutinas: la información que se usa a diario
tiene que estar en el mismo lugar donde ya se entra a diario.

## 2. Contexto del ecosistema

No cambia el modelo de los dos repos: **el agente escribe, la PWA lee.**

| Repo | Responsabilidad sobre la dieta |
|---|---|
| `Gym` (agente entrenador) | Genera el plan de dieta a partir del InBody, la rutina y las preferencias de Mario; lo valida y lo sube a Supabase con la service key. |
| Repo PWA | Muestra el plan vigente. **No** lo edita ni lo crea. |

El plan de dieta es mensual y va en paralelo al plan de entrenamiento: se
renueva cuando se renueva la rutina, y se recalcula cuando hay un InBody nuevo.

## 3. Requerimientos funcionales

### RF-D1 — Acceso a la sección
- Nueva entrada **Dieta** en la navegación principal, al mismo nivel que "Hoy" e "Historial".
- Muestra siempre el plan de dieta con `status = 'active'` del usuario. Si no hay ninguno, un estado vacío que lo diga ("Aún no tienes un plan de dieta asignado").

### RF-D2 — Resumen de objetivos diarios
Arriba de todo, los cuatro números del día: **kcal, proteína, carbohidrato y grasa**.
Deben leerse de un vistazo, sin scroll.

### RF-D3 — Ventana de alimentación
- Mostrar la ventana horaria del plan (ej. 10:00–18:00) y **el estado actual**: dentro o fuera de la ventana.
- Si está fuera, indicar cuánto falta para la próxima comida; si está dentro, cuál es la siguiente comida del día y a qué hora.
- La hora se calcula con la del dispositivo (zona `America/Mexico_City`), igual que la pantalla "Hoy" calcula el día.

### RF-D4 — Comidas del plan
Por cada comida, en el orden del plan:
- Título y hora (ej. "Desayuno fuerte · 10:00").
- Calorías y gramos de proteína de esa comida.
- Contenido: lista de componentes con sus porciones (ej. "250 g de proteína cocida", "1½ tazas de arroz").
- Notas de la comida, si las hay.

### RF-D5 — Qué cocinar (meal prep)
La rutina de cocina del domingo que deja resuelta la semana. **Es una lista de
tareas que se va tachando mientras se cocina**, no un párrafo:
- Cada renglón es una preparación con su cantidad ("1.6 kg de pechuga: mitad asada en fajitas, mitad deshebrada en tinga").
- Se marca como hecha con un toque; el estado se guarda en el dispositivo (`localStorage`), no en la base — es una ayuda de la sesión de cocina, no un dato del plan.
- Botón para **desmarcar todo**, porque la lista se repite cada semana.
- Debajo, la **rotación de la semana**: qué comida corresponde a cada día (tabla lunes-domingo).

### RF-D6 — Lista de súper semanal
El mismo mecanismo de tachado que el meal prep, pensado para usarse caminando
por el pasillo del súper:
- Renglones con producto y cantidad ("Pechuga de pollo · 1.6 kg").
- **Agrupados por categoría** (proteínas, despensa, frutas y verduras, suplementos) para no ir y venir entre pasillos.
- Tachado local por dispositivo, con "desmarcar todo" para reutilizarla la semana siguiente.
- Debe funcionar **sin señal** (ver RF-D9): en muchos súper no entra el dato.

### RF-D7 — Suplementos
Lista de lo que toma, no un texto corrido. Por cada suplemento:
- Nombre, **dosis** y **momento** ("Creatina monohidratada · 5 g · diario, con el café de las 7:00").
- Nota breve con el porqué o la advertencia ("Sube ~1 kg de agua las primeras 2 semanas; es agua en el músculo, no grasa").
- Marca visual de **recomendado / no recomendado**: el plan también dice explícitamente qué *no* vale la pena comprar (quemadores, BCAA, L-carnitina), y esa lista evita gastos cada vez que alguien le recomiende algo en la tienda.

### RF-D8 — Otras secciones informativas
Bloques de texto libre que acompañan al plan (reglas y seguimiento, pesaje
semanal, criterios de ajuste), con título y contenido en Markdown,
**colapsables** para que no estorben la consulta diaria.

### RF-D9 — Formato del contenido
El texto que escribe el agente viene en **Markdown básico** (negritas, listas,
tablas simples). La app lo renderiza; no muestra los asteriscos en crudo.

### RF-D10 — Disponibilidad offline
La sección Dieta completa debe quedar cacheada por el service worker: es texto
ligero y se consulta en la cocina y en el súper, donde puede no haber señal.

## 4. Fuera de alcance (v1)

- **Contar calorías o registrar comidas.** La dieta se consulta, no se registra. Si más adelante se quiere adherencia, es otro requerimiento.
- **Editar el plan desde la app.** Igual que las rutinas: lo genera el agente.
- **Base de datos de alimentos.** Las porciones son texto descriptivo, no un catálogo.

## 5. Fase 2 (propuesto, no v1)

### RF-D11 — Registro de peso semanal
El plan pide pesarse los viernes en ayunas y ajustar según la tendencia. Sería
la primera cosa que la PWA **escribe** además de `workout_logs`:
- Un campo simple para capturar peso (y opcionalmente % de grasa del InBody).
- Gráfica de tendencia de las últimas 8-12 semanas.
- El agente leería esos registros, igual que hoy lee `workout_logs`, para decidir si sube o baja calorías el mes siguiente.

## 6. Modelo de datos propuesto

Sigue las convenciones de `solution_design.md` §3: `uuid` como PK, `user_id`
contra `auth.users`, un solo plan `active` por usuario, y RLS de solo lectura
para la app.

```sql
create table diet_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id),
  name           text not null,              -- "Recomposición — Septiembre 2026"
  goal           text,                       -- contexto que originó el plan (InBody, actividad)
  start_date     date not null,
  end_date       date not null,
  status         text not null default 'active' check (status in ('active','archived')),
  kcal_objetivo  int not null,
  proteina_g     int not null,
  carbohidrato_g int not null,
  grasa_g        int not null,
  ventana_inicio time,                       -- null = sin ventana de ayuno
  ventana_fin    time,
  created_at     timestamptz not null default now()
);

create table diet_meals (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  position      int not null,                 -- orden dentro del día
  title         text not null,                -- "Desayuno fuerte"
  hora          time,                         -- 10:00
  kcal          int,
  proteina_g    int,
  items         text[] not null default '{}', -- componentes con porción, uno por renglón
  notes         text,
  unique (diet_plan_id, position)
);

-- Meal prep y lista de súper comparten estructura: son listas que se tachan.
create table diet_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  kind          text not null check (kind in ('meal_prep','super')),
  position      int not null,
  categoria     text,                         -- "Proteínas", "Despensa"… (agrupa la lista de súper)
  item          text not null,                -- "Pechuga de pollo"
  cantidad      text,                         -- "1.6 kg" — texto, no número: hay "4 latas" y "al gusto"
  unique (diet_plan_id, kind, position)
);

create table diet_supplements (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  position      int not null,
  nombre        text not null,                -- "Creatina monohidratada"
  dosis         text,                         -- "5 g"
  momento       text,                         -- "Diario, con el café de las 7:00"
  nota          text,                         -- porqué o advertencia
  recomendado   boolean not null default true,-- false = la lista de lo que NO vale la pena
  unique (diet_plan_id, position)
);

create table diet_sections (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  position      int not null,
  kind          text not null check (kind in ('reglas','rotacion','libre')),
  title         text not null,
  body_md       text not null,                -- Markdown
  unique (diet_plan_id, position)
);
```

> El estado de tachado de las listas **no se guarda en la base**: vive en
> `localStorage` del dispositivo. Es estado de una sesión de cocina o de compras,
> no un dato del plan, y así la lista se reutiliza cada semana sin escribir nada.

**RLS**, calcado del de `plans`:
- `select` donde `user_id = auth.uid()` (las hijas, vía join a `diet_plans`).
- Escritura **solo con service key**. La PWA no tiene policies de `insert`/`update` sobre estas tablas.

> Este esquema es un contrato entre los dos repos, igual que el de la sección 3
> del diseño: la PWA lo tipa en `src/lib/types.ts` y no se cambia de un lado sin
> avisar al otro.

## 7. Lo que agrega el repo `Gym`

| Pieza | Función |
|---|---|
| `dieta/YYYY-MM.json` | Formato intermedio del plan de dieta — el tercer contrato del sistema, análogo a `plan.json`. |
| `scripts/upload-diet.mjs` | Valida el JSON (macros consistentes, fechas locales, secciones con `kind` válido) y lo sube archivando el plan de dieta anterior. Con `--validar` corre offline. |
| Skill del agente | Extender `/entrenador` (o una skill hermana) para que genere la dieta a partir del InBody, la rutina vigente y las preferencias. |

Forma del JSON:

```json
{
  "name": "Recomposición — Septiembre 2026",
  "goal": "InBody 07-09-2026: 93.4 kg, 28.9% grasa, TMB 1804 kcal…",
  "start_date": "2026-09-01",
  "end_date": "2026-09-30",
  "kcal_objetivo": 2000,
  "proteina_g": 160,
  "carbohidrato_g": 195,
  "grasa_g": 65,
  "ventana_inicio": "10:00",
  "ventana_fin": "18:00",
  "comidas": [
    {
      "title": "Desayuno fuerte",
      "hora": "10:00",
      "kcal": 1050,
      "proteina_g": 85,
      "items": ["250 g de proteína cocida", "1½ tazas de arroz o 3 tortillas", "…"],
      "notes": "Es la comida post-entreno."
    }
  ],
  "meal_prep": [
    { "item": "Pechuga: mitad asada en fajitas, mitad deshebrada en tinga", "cantidad": "1.6 kg" },
    { "item": "Frijoles de olla", "cantidad": "1 kg (o 4 latas)" }
  ],
  "super": [
    { "categoria": "Proteínas", "item": "Pechuga de pollo", "cantidad": "1.6 kg" },
    { "categoria": "Suplementos", "item": "Creatina monohidratada", "cantidad": "300 g" }
  ],
  "suplementos": [
    {
      "nombre": "Creatina monohidratada",
      "dosis": "5 g",
      "momento": "Diario, con el café de las 7:00",
      "nota": "Sin fase de carga. Sube ~1 kg de agua las primeras 2 semanas.",
      "recomendado": true
    },
    { "nombre": "Quemadores, BCAA, L-carnitina", "nota": "Dinero tirado.", "recomendado": false }
  ],
  "secciones": [
    { "kind": "reglas", "title": "Reglas y seguimiento", "body_md": "- Proteína primero…" },
    { "kind": "rotacion", "title": "Rotación de la semana", "body_md": "| Día | Desayuno | Comida |…" }
  ]
}
```

## 8. Criterios de aceptación

1. Con un plan activo en la base, la sección Dieta muestra macros, ventana y comidas sin recargar la app.
2. A las 09:00 la app indica que faltan 60 minutos para el desayuno; a las 19:00, que la ventana está cerrada.
3. Las secciones se abren y cierran, y el Markdown se ve renderizado (sin asteriscos visibles).
4. En la lista de súper, al tocar un renglón se tacha; al cerrar y reabrir la app sigue tachado; "desmarcar todo" la deja limpia.
5. La lista de súper se ve agrupada por categoría y el meal prep en el orden en que conviene cocinar.
6. Los suplementos distinguen visualmente los recomendados de los que no, con dosis y momento legibles de un vistazo.
7. **En modo avión**, tras haber abierto la sección una vez, el plan completo —comidas, meal prep, súper y suplementos— sigue visible y las listas se pueden seguir tachando.
8. Sin plan activo, se ve el estado vacío y ningún error en consola.
9. La PWA no puede escribir en `diet_plans`: un `insert` desde el cliente falla por RLS.
