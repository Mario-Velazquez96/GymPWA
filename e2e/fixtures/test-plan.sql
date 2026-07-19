-- e2e/fixtures/test-plan.sql — Fixture manual para verificar 03_today_view.
--
-- CÓMO USAR: pega este archivo completo en el SQL editor de Supabase (corre
-- con rol privilegiado — la app NUNCA escribe estas tablas; RLS solo permite
-- escribirlas vía service key desde el repo Gym).
--
-- Idempotente: borra y reinserta su propio plan ('Plan de prueba E2E') en cada
-- ejecución; los borrados cascadean a plan_days/plan_exercises.
--
-- Contrato entre repos: el catálogo `exercises` pertenece al repo Gym. Aquí
-- solo se insertan 3 filas mínimas con IDs reales del contrato
-- ('0001'..'0003') y ON CONFLICT (id) DO NOTHING, para que el seed real del
-- repo Gym pueda convivir/llegar después sin chocar.
--
-- Fechas relativas a current_date para que "hoy" siempre caiga dentro del plan:
--   plan:            current_date - 3 .. current_date + 3  (prueba el clamping de flechas)
--   ayer:            día de entrenamiento (navegación hacia atrás)
--   hoy:             día de entrenamiento con 3 ejercicios
--   mañana:          día de descanso (is_rest, título 'Descanso')
--   +2 y +3:         sin plan_day → "Sin rutina asignada para este día"
--
-- Supone que el usuario no tiene otro plan 'active' (getActivePlan toma 1).

begin;

-- 1) Ejercicios placeholder (el repo Gym es el dueño del catálogo real)
insert into exercises
  (id, name, body_part, equipment, target, muscle_group,
   secondary_muscles, instructions_es, instruction_steps_es, image_url, gif_url)
values
  ('0001', 'Ejercicio E2E 1 — press de banca', 'chest', 'barbell', 'pectorals', 'chest',
   '{}', 'Instrucciones de prueba del ejercicio 1 (placeholder del fixture E2E).',
   array['Paso 1 de prueba', 'Paso 2 de prueba'],
   'https://placehold.co/180x180.png?text=0001', 'https://placehold.co/180x180.gif?text=0001'),
  ('0002', 'Ejercicio E2E 2 — remo con barra', 'back', 'barbell', 'upper back', 'back',
   '{}', 'Instrucciones de prueba del ejercicio 2 (placeholder del fixture E2E).',
   array['Paso 1 de prueba', 'Paso 2 de prueba'],
   'https://placehold.co/180x180.png?text=0002', 'https://placehold.co/180x180.gif?text=0002'),
  ('0003', 'Ejercicio E2E 3 — curl de bíceps', 'upper arms', 'dumbbell', 'biceps', 'arms',
   '{}', 'Instrucciones de prueba del ejercicio 3 (placeholder del fixture E2E).',
   array['Paso 1 de prueba', 'Paso 2 de prueba'],
   'https://placehold.co/180x180.png?text=0003', 'https://placehold.co/180x180.gif?text=0003')
on conflict (id) do nothing;

-- 2) Plan + días + ejercicios del día, resolviendo el user_id por email
do $$
declare
  v_user uuid;
  v_plan uuid;
  v_day_today uuid;
begin
  select id into v_user from auth.users where email = 'mariovt860@gmail.com';
  if v_user is null then
    raise exception 'No existe auth.users con email mariovt860@gmail.com — crea el usuario primero';
  end if;

  -- Idempotencia: fuera el plan del fixture de corridas anteriores
  delete from plans where user_id = v_user and name = 'Plan de prueba E2E';

  insert into plans (user_id, name, goal, start_date, end_date, status)
  values (v_user, 'Plan de prueba E2E', 'Fixture para verificar 03_today_view',
          current_date - 3, current_date + 3, 'active')
  returning id into v_plan;

  -- Ayer: día de entrenamiento (sin ejercicios; prueba la flecha ‹)
  insert into plan_days (plan_id, day_date, title, is_rest)
  values (v_plan, current_date - 1, 'Pierna (prueba)', false);

  -- Hoy: día de entrenamiento con 3 ejercicios ordenados por position
  insert into plan_days (plan_id, day_date, title, is_rest)
  values (v_plan, current_date, 'Pecho y espalda (prueba)', false)
  returning id into v_day_today;

  insert into plan_exercises
    (plan_day_id, exercise_id, position, target_sets, target_reps, rest_seconds, notes)
  values
    (v_day_today, '0001', 1, 4, '8-12', 90, null),
    (v_day_today, '0002', 2, 3, '10', 60, null),
    (v_day_today, '0003', 3, 3, 'al fallo', 60, 'Última serie al fallo');

  -- Mañana: descanso (estado "Día de descanso")
  insert into plan_days (plan_id, day_date, title, is_rest)
  values (v_plan, current_date + 1, 'Descanso', true);
end $$;

commit;
