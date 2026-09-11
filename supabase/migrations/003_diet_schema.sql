-- 003_diet_schema.sql — Tablas del plan de dieta (contrato PWA ↔ Gym, 3er contrato).
-- Fuente: project-documents/client_requirement_dieta.md §6 (SQL copiado VERBATIM)
--         + índice único parcial "un solo plan active por usuario" (spec 09, R2).
-- Migración de una sola vez (no idempotente): aplicar UNA vez, después de
-- 002_rls.sql y antes de 004_diet_rls.sql.

-- §6 diet_plans — plan de dieta mensual generado por el agente
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

-- Un solo plan `active` por usuario (R2). Más estricto que `plans` (§3.2 solo
-- lo enuncia): upload-diet.mjs debe archivar el anterior ANTES de insertar.
create unique index diet_plans_one_active_per_user
  on diet_plans (user_id) where status = 'active';

-- §6 diet_meals — comidas del plan, en orden del día
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

-- §6 diet_checklist_items — meal prep y lista de súper (listas que se tachan)
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

-- §6 diet_supplements — suplementos (recomendado = false → "no vale la pena")
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

-- §6 diet_sections — bloques informativos en Markdown
create table diet_sections (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references diet_plans(id) on delete cascade,
  position      int not null,
  kind          text not null check (kind in ('reglas','rotacion','libre')),
  title         text not null,
  body_md       text not null,                -- Markdown
  unique (diet_plan_id, position)
);

-- Índices por diet_plan_id (R3): los `unique (diet_plan_id, …)` anteriores ya
-- crean un btree con diet_plan_id como columna inicial, que es el que usan el
-- join anidado de la PWA y las policies de 004. No se añade ninguno más.
