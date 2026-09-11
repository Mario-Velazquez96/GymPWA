-- 004_diet_rls.sql — RLS de SOLO LECTURA en las cinco tablas de dieta (5 policies).
-- Fuente: specs/09_diet_schema_and_rls/design.md (calcado de 002_rls.sql).
-- Aplicar DESPUÉS de 003_diet_schema.sql. Migración de una sola vez (no idempotente).
--
-- Sin policies de insert/update/delete: la PWA no puede escribir estas tablas
-- (criterio 9 de client_requirement_dieta §8); la service key del repo Gym
-- (upload-diet.mjs) pasa por alto RLS y es la única vía de escritura.

alter table diet_plans           enable row level security;
alter table diet_meals           enable row level security;
alter table diet_checklist_items enable row level security;
alter table diet_supplements     enable row level security;
alter table diet_sections        enable row level security;

create policy diet_plans_select on diet_plans
  for select to authenticated using (user_id = auth.uid());

create policy diet_meals_select on diet_meals
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_meals.diet_plan_id and p.user_id = auth.uid()));

create policy diet_checklist_items_select on diet_checklist_items
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_checklist_items.diet_plan_id and p.user_id = auth.uid()));

create policy diet_supplements_select on diet_supplements
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_supplements.diet_plan_id and p.user_id = auth.uid()));

create policy diet_sections_select on diet_sections
  for select to authenticated using (
    exists (select 1 from diet_plans p
            where p.id = diet_sections.diet_plan_id and p.user_id = auth.uid()));
