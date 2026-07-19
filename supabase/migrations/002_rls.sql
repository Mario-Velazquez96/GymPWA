-- 002_rls.sql — Habilita RLS en las cinco tablas y define las ocho policies.
-- Fuente: specs/01_supabase_schema_and_rls/design.md (§3.6 de solution_design).
-- Aplicar DESPUÉS de 001_schema.sql. Migración de una sola vez (no idempotente).
--
-- Sin policies de escritura en las cuatro tablas de solo lectura: la app no
-- puede escribirlas y la service key del repo Gym pasa por alto RLS (RF-6).

alter table exercises      enable row level security;
alter table plans          enable row level security;
alter table plan_days      enable row level security;
alter table plan_exercises enable row level security;
alter table workout_logs   enable row level security;

create policy exercises_select on exercises
  for select to authenticated using (true);

create policy plans_select on plans
  for select to authenticated using (user_id = auth.uid());

create policy plan_days_select on plan_days
  for select to authenticated using (
    exists (select 1 from plans p
            where p.id = plan_days.plan_id and p.user_id = auth.uid()));

create policy plan_exercises_select on plan_exercises
  for select to authenticated using (
    exists (select 1 from plan_days d join plans p on p.id = d.plan_id
            where d.id = plan_exercises.plan_day_id and p.user_id = auth.uid()));

create policy workout_logs_select on workout_logs
  for select to authenticated using (user_id = auth.uid());
create policy workout_logs_insert on workout_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy workout_logs_update on workout_logs
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy workout_logs_delete on workout_logs
  for delete to authenticated using (user_id = auth.uid());
