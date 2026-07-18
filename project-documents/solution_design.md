# Solution Design — App de Rutinas de Gimnasio (PWA + Agente Entrenador)

**Fecha:** 2026-07-18
**Documento hermano:** [client_requirement.md](client_requirement.md)

## 1. Arquitectura general

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Repo Gym (este repo)   │        │  Supabase (free tier)        │
│                         │        │                              │
│  exercises-dataset/     │ carga  │  Postgres:                   │
│   └ exercises.json ─────┼──────► │   exercises                  │
│   └ images/, videos/ ───┼──────► │  Storage: exercise-media     │
│                         │        │                              │
│  Agente entrenador ─────┼──────► │   plans / plan_days /        │
│   (genera plan mensual) │  sube  │   plan_exercises             │
│                         │ ◄──────┼   workout_logs (lee historial│
│                         │        │   para progresar cargas)     │
└─────────────────────────┘        └──────────────┬───────────────┘
                                                  │ REST/JS SDK + Auth
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │  Repo PWA (nuevo)            │
                                   │  React + Vite + PWA          │
                                   │  Deploy: Vercel/Netlify      │
                                   │  iPhone: Safari → Home Screen│
                                   └──────────────────────────────┘
```

- La PWA **nunca** lee el repo Gym; solo habla con Supabase.
- El agente **nunca** habla con la PWA; solo escribe/lee en Supabase.
- **Contrato entre repos:** los IDs de ejercicio `"0001"`–`"1324"` + el esquema de tablas de la sección 3.

## 2. Stack

| Capa | Elección | Justificación |
|---|---|---|
| Backend / BD | Supabase free tier (Postgres + Auth + Storage) | Auth lista, SDK JS, API REST autogenerada, sin servidor propio. |
| Frontend | React + Vite, plugin PWA (`vite-plugin-pwa`) | PWA instalable en iPhone, service worker para cache de assets. |
| Hosting frontend | Vercel o Netlify (free) | Deploy por git push, HTTPS incluido (requisito de PWA). |
| Agente entrenador | Skill/agente de Claude Code en repo Gym + scripts Node.js | Genera el plan como JSON validado y lo sube vía `@supabase/supabase-js` con service key. |
| Media | Supabase Storage, bucket `exercise-media` | GIFs/imágenes servidos por CDN de Supabase; la app referencia URLs públicas. |

## 3. Modelo de datos (Postgres / Supabase)

### 3.1 `exercises` — catálogo (importado 1 vez desde el dataset)

```sql
create table exercises (
  id            text primary key,          -- "0001".."1324" (contrato entre repos)
  name          text not null,
  body_part     text not null,             -- "chest", "back", "upper legs", ...
  equipment     text not null,             -- "dumbbell", "barbell", "body weight", ...
  target        text not null,             -- músculo objetivo
  muscle_group  text not null,
  secondary_muscles text[] not null default '{}',
  instructions_es   text not null,         -- instrucciones completas en español
  instruction_steps_es text[] not null,    -- pasos ordenados en español
  image_url     text not null,             -- URL pública en Storage (thumbnail 180x180)
  gif_url       text not null,             -- URL pública en Storage (GIF 180x180)
  attribution   text not null default '© Gym visual — https://gymvisual.com/'
);
```

> Solo se importan los campos en español; el dataset trae 10 idiomas pero la app es monolingüe.

### 3.2 `plans` — plan mensual generado por el agente

```sql
create table plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id),
  name        text not null,               -- ej. "Hipertrofia — Agosto 2026"
  goal        text,                        -- metas en texto libre que originaron el plan
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'active' check (status in ('active','archived')),
  created_at  timestamptz not null default now()
);
```

Regla: **un solo plan `active` por usuario**; al subir un plan nuevo, el agente archiva el anterior.

### 3.3 `plan_days` — un día del plan

```sql
create table plan_days (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references plans(id) on delete cascade,
  day_date  date not null,                 -- fecha concreta del día
  title     text,                          -- ej. "Pecho y tríceps", "Descanso"
  is_rest   boolean not null default false,
  unique (plan_id, day_date)
);
```

### 3.4 `plan_exercises` — ejercicios asignados a un día

```sql
create table plan_exercises (
  id           uuid primary key default gen_random_uuid(),
  plan_day_id  uuid not null references plan_days(id) on delete cascade,
  exercise_id  text not null references exercises(id),
  position     int not null,               -- orden dentro del día
  target_sets  int not null,               -- series objetivo
  target_reps  text not null,              -- ej. "8-12", "5", "al fallo"
  rest_seconds int,                        -- descanso sugerido entre series
  notes        text,                       -- indicaciones del agente ("subir 2.5kg si completas todas las series")
  unique (plan_day_id, position)
);
```

### 3.5 `workout_logs` — lo que el usuario realmente hizo

```sql
create table workout_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id),
  exercise_id   text not null references exercises(id),
  plan_exercise_id uuid references plan_exercises(id), -- nullable: permite log libre
  performed_at  date not null default current_date,
  set_number    int not null,              -- 1, 2, 3...
  reps          int not null,
  weight_kg     numeric(6,2) not null,     -- 0 para ejercicios de peso corporal
  created_at    timestamptz not null default now()
);
create index on workout_logs (user_id, exercise_id, performed_at desc);
```

La comparación "¿cuánto cargué la última vez?" es:

```sql
select performed_at, set_number, reps, weight_kg
from workout_logs
where user_id = :uid and exercise_id = :eid
  and performed_at < current_date
order by performed_at desc, set_number
limit 10;  -- las series de la sesión anterior
```

### 3.6 Seguridad (RLS)

- `exercises`: lectura pública (o para usuarios autenticados); escritura solo con service key.
- `plans`, `plan_days`, `plan_exercises`: `select` solo donde `user_id = auth.uid()` (vía join al plan); escritura solo con service key (el agente).
- `workout_logs`: `select/insert/update/delete` solo donde `user_id = auth.uid()`.

## 4. La PWA (repo nuevo)

### 4.1 Pantallas

1. **Login** — email + password (Supabase Auth).
2. **Hoy** (pantalla principal) — rutina del día actual: título del día, lista de ejercicios con thumbnail, series objetivo y un check de progreso. Selector para navegar a otros días del plan.
3. **Ejercicio** — GIF animado, instrucciones en español (pasos), series objetivo, y el **registro**: filas de series con steppers grandes de peso (±2.5 kg) y reps (±1); al lado, columna "anterior" con lo de la última sesión. Botón "Guardar serie" por fila.
4. **Historial** (secundaria) — por ejercicio, evolución de peso/reps por fecha.

### 4.2 Decisiones de UX (uso en el gym)

- Mobile-first, botones grandes, operable con una mano; steppers en lugar de teclado siempre que se pueda.
- Autocompletar cada serie con el peso/reps de la sesión anterior como valor inicial (solo ajustas si cambió).
- Guardado inmediato por serie (una fila = un insert), nada de formularios largos.
- Service worker cachea el shell de la app y los GIFs vistos; los logs requieren conexión (los gyms tienen datos/wifi; modo offline con cola de sincronización queda como mejora futura).

### 4.3 PWA en iPhone

- `manifest.json` con `display: "standalone"`, iconos, tema.
- Instalación: Safari → Compartir → "Agregar a pantalla de inicio".
- HTTPS obligatorio (lo dan Vercel/Netlify por defecto).

## 5. El agente entrenador (repo Gym)

### 5.1 Flujo

1. Mario da sus metas en lenguaje natural (objetivo, días/semana, equipo disponible, limitaciones).
2. El agente (skill de Claude Code con persona de entrenador experto):
   - Lee `exercises-dataset/data/exercises.json` y filtra por equipo disponible y grupos musculares según el split elegido (ej. push/pull/legs, upper/lower, full body).
   - Si hay historial en `workout_logs`, lo consulta para fijar pesos/progresión inicial.
   - Genera `plan.json` con la estructura de las tablas `plans/plan_days/plan_exercises`.
3. Un script Node.js valida `plan.json` (todos los `exercise_id` existen, fechas correctas) y lo sube a Supabase con la service key, archivando el plan activo anterior.

### 5.2 Formato intermedio `plan.json`

```json
{
  "name": "Hipertrofia — Agosto 2026",
  "goal": "texto de metas del usuario",
  "start_date": "2026-08-03",
  "end_date": "2026-08-30",
  "days": [
    {
      "day_date": "2026-08-03",
      "title": "Pecho y tríceps",
      "is_rest": false,
      "exercises": [
        { "exercise_id": "0025", "position": 1, "target_sets": 4, "target_reps": "8-10", "rest_seconds": 120, "notes": "..." }
      ]
    },
    { "day_date": "2026-08-04", "title": "Descanso", "is_rest": true, "exercises": [] }
  ]
}
```

Este formato es **el segundo contrato** del sistema: el agente lo produce, el script de subida lo consume.

### 5.3 Scripts en el repo Gym (por construir)

| Script | Función |
|---|---|
| `scripts/seed-exercises.js` | Carga única: sube catálogo a `exercises` y media al bucket `exercise-media`. |
| `scripts/upload-plan.js` | Valida `plan.json` y lo inserta en `plans/plan_days/plan_exercises`; archiva el plan anterior. |
| `scripts/fetch-history.js` | Descarga el historial de `workout_logs` del usuario para que el agente lo use al progresar cargas. |
| `.env` (no versionado) | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `USER_ID`. |

## 6. Orden de implementación sugerido

1. Crear proyecto Supabase, correr el SQL de la sección 3, configurar RLS y crear el usuario de Mario.
2. Repo Gym: `seed-exercises.js` → catálogo y media en Supabase.
3. Repo PWA: login + pantalla "Hoy" leyendo un plan de prueba insertado a mano.
4. Repo PWA: pantalla de ejercicio con registro de series y comparación con sesión anterior.
5. Repo Gym: skill del agente entrenador + `upload-plan.js`; generar el primer plan real con las metas de Mario.
6. Pulido PWA: manifest/instalación en iPhone, cache de GIFs, historial.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Free tier de Supabase pausa proyectos inactivos (~1 semana sin uso) | El uso es diario/semanal; si pasa, se reactiva desde el dashboard en un click. |
| 139 MB de media vs límite de Storage free (1 GB) | Cabe holgado; subir tal cual a 180×180. |
| GIFs pesados en datos móviles | Solo se cargan los ~6–8 del día; service worker los cachea tras la primera vista. |
| Licencia Gym Visual | Uso personal OK con atribución; no publicar comercialmente sin licencia propia. |
| Agente genera IDs inexistentes o fechas inválidas | `upload-plan.js` valida contra el catálogo y rechaza el plan completo antes de tocar la BD. |
