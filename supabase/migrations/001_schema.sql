-- 001_schema.sql — Tablas + índice del contrato entre repos (PWA ↔ Gym).
-- Fuente: project-documents/solution_design.md §3.1–3.5 (SQL copiado VERBATIM).
-- Migración de una sola vez (no idempotente): aplicar UNA vez, antes de 002_rls.sql.

-- §3.1 exercises — catálogo (importado 1 vez desde el dataset)
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

-- §3.2 plans — plan mensual generado por el agente
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

-- §3.3 plan_days — un día del plan
create table plan_days (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references plans(id) on delete cascade,
  day_date  date not null,                 -- fecha concreta del día
  title     text,                          -- ej. "Pecho y tríceps", "Descanso"
  is_rest   boolean not null default false,
  unique (plan_id, day_date)
);

-- §3.4 plan_exercises — ejercicios asignados a un día
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

-- §3.5 workout_logs — lo que el usuario realmente hizo
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

-- Check constraints de workout_logs (R2 — spec 01, design.md)
alter table workout_logs
  add constraint workout_logs_set_number_check check (set_number >= 1),
  add constraint workout_logs_reps_check       check (reps >= 1),
  add constraint workout_logs_weight_check     check (weight_kg >= 0);
