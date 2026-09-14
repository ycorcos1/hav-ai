begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(114);

create function pg_temp.statement_fails(statement text)
returns boolean
language plpgsql
as $$
begin
  execute statement;
  return false;
exception
  when others then
    return true;
end;
$$;

create function pg_temp.affected_rows(statement text)
returns bigint
language plpgsql
as $$
declare
  affected bigint;
begin
  execute statement;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

select is(
  (
    select count(*)
    from pg_class
    where oid in (
      'public.profiles'::regclass,
      'public.exercises'::regclass,
      'public.exercise_secondary_muscles'::regclass,
      'public.workout_templates'::regclass,
      'public.workout_template_exercises'::regclass,
      'public.workouts'::regclass,
      'public.workout_exercises'::regclass,
      'public.sets'::regclass,
      'public.progression_recommendations'::regclass,
      'public.personal_records'::regclass
    )
      and relrowsecurity
  ),
  10::bigint,
  'RLS is enabled on every current cloud table'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'exercises',
        'exercise_secondary_muscles',
        'workout_templates',
        'workout_template_exercises',
        'workouts',
        'workout_exercises',
        'sets',
        'progression_recommendations',
        'personal_records'
      )
  ),
  37::bigint,
  'all expected Phase 13 RLS policies exist'
);

insert into auth.users (id)
values
  ('a0000000-0000-4000-8000-00000000000a'),
  ('b0000000-0000-4000-8000-00000000000b'),
  ('c0000000-0000-4000-8000-00000000000c');

insert into public.profiles (user_id, weight_unit, primary_goal, display_name)
values
  ('a0000000-0000-4000-8000-00000000000a', 'lb', 'strength', 'User A'),
  ('b0000000-0000-4000-8000-00000000000b', 'kg', 'hypertrophy', 'User B');

insert into public.exercises (
  id, owner_user_id, name, primary_muscle_group, equipment_type,
  measurement_type
)
values
  (
    'fa000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'Security User A Press', 'chest', 'dumbbell', 'weight_reps'
  ),
  (
    'fb000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'Security User B Row', 'back', 'cable', 'weight_reps'
  );

insert into public.exercise_secondary_muscles (exercise_id, muscle_group)
values
  ('fa000000-0000-4000-8000-000000000001', 'triceps'),
  ('fb000000-0000-4000-8000-000000000001', 'biceps');

insert into public.workout_templates (id, user_id, name)
values
  (
    'fa100000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'Security Template A'
  ),
  (
    'fb100000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'Security Template B'
  );

insert into public.workout_template_exercises (
  id, user_id, template_id, exercise_id, position,
  target_sets, target_min_reps, target_max_reps
)
values
  (
    'fa110000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'fa100000-0000-4000-8000-000000000001',
    'fa000000-0000-4000-8000-000000000001', 0, 3, 8, 10
  ),
  (
    'fb110000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'fb100000-0000-4000-8000-000000000001',
    'fb000000-0000-4000-8000-000000000001', 0, 3, 8, 10
  );

insert into public.workouts (
  id, user_id, source_template_id, name, status, started_at
)
values
  (
    'fa200000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'fa100000-0000-4000-8000-000000000001',
    'Security Workout A', 'active', '2026-09-14T12:00:00Z'
  ),
  (
    'fb200000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'fb100000-0000-4000-8000-000000000001',
    'Security Workout B', 'active', '2026-09-14T12:00:00Z'
  );

insert into public.workout_exercises (
  id, user_id, workout_id, exercise_id, position
)
values
  (
    'fa210000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'fa200000-0000-4000-8000-000000000001',
    'fa000000-0000-4000-8000-000000000001', 0
  ),
  (
    'fb210000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'fb200000-0000-4000-8000-000000000001',
    'fb000000-0000-4000-8000-000000000001', 0
  );

insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, weight_kg, reps, completed_at
)
values
  (
    'fa220000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'fa200000-0000-4000-8000-000000000001',
    'fa210000-0000-4000-8000-000000000001',
    'fa000000-0000-4000-8000-000000000001',
    0, 'working', 45, 8, '2026-09-14T12:10:00Z'
  ),
  (
    'fb220000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'fb200000-0000-4000-8000-000000000001',
    'fb210000-0000-4000-8000-000000000001',
    'fb000000-0000-4000-8000-000000000001',
    0, 'working', 50, 8, '2026-09-14T12:10:00Z'
  );

insert into public.progression_recommendations (
  id, user_id, exercise_id, source_workout_id,
  source_workout_exercise_id, recommendation_type, confidence,
  reason_codes, status, engine_version
)
values
  (
    'fa230000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'fa000000-0000-4000-8000-000000000001',
    'fa200000-0000-4000-8000-000000000001',
    'fa210000-0000-4000-8000-000000000001',
    'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
    'active', 'progression-v1'
  ),
  (
    'fb230000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'fb000000-0000-4000-8000-000000000001',
    'fb200000-0000-4000-8000-000000000001',
    'fb210000-0000-4000-8000-000000000001',
    'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
    'active', 'progression-v1'
  );

update public.workout_exercises
set source_recommendation_id = case user_id
  when 'a0000000-0000-4000-8000-00000000000a'
    then 'fa230000-0000-4000-8000-000000000001'::uuid
  else 'fb230000-0000-4000-8000-000000000001'::uuid
end;

insert into public.personal_records (
  id, user_id, exercise_id, record_type, set_id, workout_id,
  weight_kg, reps, achieved_at
)
values
  (
    'fa240000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-00000000000a',
    'fa000000-0000-4000-8000-000000000001',
    'max_weight', 'fa220000-0000-4000-8000-000000000001',
    'fa200000-0000-4000-8000-000000000001',
    45, 8, '2026-09-14T12:10:00Z'
  ),
  (
    'fb240000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-00000000000b',
    'fb000000-0000-4000-8000-000000000001',
    'max_weight', 'fb220000-0000-4000-8000-000000000001',
    'fb200000-0000-4000-8000-000000000001',
    50, 8, '2026-09-14T12:10:00Z'
  );

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select count(*) from public.exercises where is_system),
  0::bigint,
  'anonymous clients cannot read system exercises without an authenticated policy'
);
select is(
  (select count(*) from public.profiles),
  0::bigint,
  'anonymous clients cannot read private profiles'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);

select ok(
  exists (
    select 1 from public.exercises
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'User A can read a canonical system exercise'
);
select ok(
  exists (
    select 1 from public.exercise_secondary_muscles
    where exercise_id = '10000000-0000-4000-8000-000000000001'
  ),
  'User A can read secondary muscles for a system exercise'
);
select is((select count(*) from public.profiles where user_id = 'a0000000-0000-4000-8000-00000000000a'), 1::bigint, 'User A reads own profile');
select is((select count(*) from public.profiles where user_id = 'b0000000-0000-4000-8000-00000000000b'), 0::bigint, 'User A cannot read User B profile');
select is((select count(*) from public.exercises where id = 'fa000000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own custom exercise');
select is((select count(*) from public.exercises where id = 'fb000000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B custom exercise');
select is((select count(*) from public.exercise_secondary_muscles where exercise_id = 'fa000000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own custom exercise secondary muscles');
select is((select count(*) from public.exercise_secondary_muscles where exercise_id = 'fb000000-0000-4000-8000-000000000001'), 0::bigint, 'User B private secondary muscles do not leak to User A');
select is((select count(*) from public.workout_templates where id = 'fa100000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own template');
select is((select count(*) from public.workout_templates where id = 'fb100000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B template');
select is((select count(*) from public.workout_template_exercises where id = 'fa110000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own template exercise');
select is((select count(*) from public.workout_template_exercises where id = 'fb110000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B template exercise');
select is((select count(*) from public.workouts where id = 'fa200000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own workout');
select is((select count(*) from public.workouts where id = 'fb200000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B workout');
select is((select count(*) from public.workout_exercises where id = 'fa210000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own workout exercise');
select is((select count(*) from public.workout_exercises where id = 'fb210000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B workout exercise');
select is((select count(*) from public.sets where id = 'fa220000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own set');
select is((select count(*) from public.sets where id = 'fb220000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B set');
select is((select count(*) from public.progression_recommendations where id = 'fa230000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own recommendation');
select is((select count(*) from public.progression_recommendations where id = 'fb230000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B recommendation');
select is((select count(*) from public.personal_records where id = 'fa240000-0000-4000-8000-000000000001'), 1::bigint, 'User A reads own personal record');
select is((select count(*) from public.personal_records where id = 'fb240000-0000-4000-8000-000000000001'), 0::bigint, 'User A cannot read User B personal record');
select is(
  pg_temp.affected_rows($statement$
    update public.profiles
    set display_name = 'User A Updated'
    where user_id = 'a0000000-0000-4000-8000-00000000000a'
  $statement$),
  1::bigint,
  'User A can update own profile'
);
select is(
  (
    select display_name from public.profiles
    where user_id = 'a0000000-0000-4000-8000-00000000000a'
  ),
  'User A Updated',
  'User A reads the own-profile update'
);

select ok(
  pg_temp.statement_fails($statement$
    insert into public.profiles (
      user_id, weight_unit, primary_goal, created_at, updated_at
    ) values (
      'c0000000-0000-4000-8000-00000000000c', 'lb', 'hybrid',
      '1900-01-01', '1900-01-01'
    )
  $statement$),
  'User A cannot create a profile for another auth user with forged metadata'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.profiles (user_id, weight_unit, primary_goal)
    values ('b0000000-0000-4000-8000-00000000000b', 'lb', 'hybrid')
    on conflict (user_id) do update set primary_goal = excluded.primary_goal
  $statement$),
  'User A cannot replace User B profile'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, owner_user_id, name, primary_muscle_group, equipment_type,
      measurement_type, created_at, updated_at
    ) values (
      'fc000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-00000000000b',
      'Forged User B Exercise', 'chest', 'barbell', 'weight_reps',
      '1900-01-01', '1900-01-01'
    )
  $statement$),
  'User A cannot create a custom exercise owned by User B'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, name, primary_muscle_group, equipment_type, measurement_type, is_system
    ) values (
      'fc000000-0000-4000-8000-000000000002',
      'Forged System Exercise', 'chest', 'barbell', 'weight_reps', true
    )
  $statement$),
  'User A cannot create a system exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_templates (id, user_id, name)
    values (
      'fc100000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-00000000000b', 'Forged Template'
    )
  $statement$),
  'User A cannot create a template owned by User B'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      'fc110000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-00000000000a',
      'fb100000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', 1, 3, 8, 10
    )
  $statement$),
  'User A cannot add a template exercise beneath User B template'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      'fc110000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-00000000000a',
      'fa100000-0000-4000-8000-000000000001',
      'fb000000-0000-4000-8000-000000000001', 1, 3, 8, 10
    )
  $statement$),
  'User A cannot attach User B custom exercise to User A template'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workouts (id, user_id, name, status, started_at)
    values (
      'fc200000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-00000000000b',
      'Forged Workout', 'active', '2026-09-14T12:00:00Z'
    )
  $statement$),
  'User A cannot create a workout owned by User B'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workouts (
      id, user_id, source_template_id, name, status, started_at
    ) values (
      'fc200000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-00000000000a',
      'fb100000-0000-4000-8000-000000000001',
      'Cross Template Workout', 'active', '2026-09-14T12:00:00Z'
    )
  $statement$),
  'User A cannot source a workout from User B template'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position
    ) values (
      'fc210000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-00000000000a',
      'fb200000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', 1
    )
  $statement$),
  'User A cannot add a workout exercise beneath User B workout'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position
    ) values (
      'fc210000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-00000000000a',
      'fa200000-0000-4000-8000-000000000001',
      'fb000000-0000-4000-8000-000000000001', 1
    )
  $statement$),
  'User A cannot attach User B custom exercise to User A workout'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position,
      source_recommendation_id
    ) values (
      'fc210000-0000-4000-8000-000000000003',
      'a0000000-0000-4000-8000-00000000000a',
      'fa200000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', 1,
      'fb230000-0000-4000-8000-000000000001'
    )
  $statement$),
  'User A cannot attach User B recommendation to User A workout exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      'fc220000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-00000000000a',
      'fb200000-0000-4000-8000-000000000001',
      'fb210000-0000-4000-8000-000000000001',
      'fb000000-0000-4000-8000-000000000001',
      1, 'working', 8, '2026-09-14T12:15:00Z'
    )
  $statement$),
  'User A cannot create a set beneath User B workout graph'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      'fc220000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-00000000000a',
      'fa200000-0000-4000-8000-000000000001',
      'fb210000-0000-4000-8000-000000000001',
      'fb000000-0000-4000-8000-000000000001',
      1, 'working', 8, '2026-09-14T12:15:00Z'
    )
  $statement$),
  'User A cannot combine own workout with User B workout exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      'fc220000-0000-4000-8000-000000000003',
      'a0000000-0000-4000-8000-00000000000a',
      'fa200000-0000-4000-8000-000000000001',
      'fa210000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      1, 'working', 8, '2026-09-14T12:15:00Z'
    )
  $statement$),
  'set exercise must match its workout exercise ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      'fc230000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000001',
      'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
      'active', 'progression-v1'
    )
  $statement$),
  'User A cannot create a recommendation owned by User B'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      'fc230000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-00000000000a',
      'fb000000-0000-4000-8000-000000000001',
      'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
      'active', 'progression-v1'
    )
  $statement$),
  'User A cannot create a recommendation for User B custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id,
      recommendation_type, confidence, reason_codes, status, engine_version
    ) values (
      'fc230000-0000-4000-8000-000000000003',
      'a0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001',
      'fb200000-0000-4000-8000-000000000001',
      'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
      'active', 'progression-v1'
    )
  $statement$),
  'User A cannot source a recommendation from User B workout'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id,
      source_workout_exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      'fc230000-0000-4000-8000-000000000004',
      'a0000000-0000-4000-8000-00000000000a',
      'fb000000-0000-4000-8000-000000000001',
      'fb200000-0000-4000-8000-000000000001',
      'fb210000-0000-4000-8000-000000000001',
      'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
      'active', 'progression-v1'
    )
  $statement$),
  'User A cannot source a recommendation from User B workout exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id,
      source_workout_exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      'fc230000-0000-4000-8000-000000000005',
      'a0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001',
      'fa200000-0000-4000-8000-000000000001',
      'fa210000-0000-4000-8000-000000000001',
      'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
      'active', 'progression-v1'
    )
  $statement$),
  'recommendation exercise must match its source workout exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      'fc240000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-00000000000b',
      'fb000000-0000-4000-8000-000000000001',
      'max_weight', 'fb220000-0000-4000-8000-000000000001',
      'fb200000-0000-4000-8000-000000000001',
      50, '2026-09-14T12:10:00Z'
    )
  $statement$),
  'User A cannot create a personal record owned by User B'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      'fc240000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-00000000000a',
      'fb000000-0000-4000-8000-000000000001',
      'max_weight', 'fb220000-0000-4000-8000-000000000001',
      'fb200000-0000-4000-8000-000000000001',
      50, '2026-09-14T12:10:00Z'
    )
  $statement$),
  'User A cannot create a personal record from User B history'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      'fc240000-0000-4000-8000-000000000003',
      'a0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001',
      'max_weight', 'fa220000-0000-4000-8000-000000000001',
      'fa200000-0000-4000-8000-000000000001',
      45, '2026-09-14T12:10:00Z'
    )
  $statement$),
  'personal record exercise must match its source set ancestry'
);

select ok(pg_temp.statement_fails($statement$ insert into public.exercise_secondary_muscles (exercise_id, muscle_group) values ('fb000000-0000-4000-8000-000000000001', 'triceps') $statement$), 'User A cannot add secondary muscles to User B custom exercise');
select is(pg_temp.affected_rows($statement$ update public.exercise_secondary_muscles set muscle_group = 'triceps' where exercise_id = 'fb000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B secondary muscles');
select is(pg_temp.affected_rows($statement$ delete from public.exercise_secondary_muscles where exercise_id = 'fb000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B secondary muscles');
select is(pg_temp.affected_rows($statement$ update public.exercises set is_archived = true where id = '10000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot archive a system exercise');
select is(pg_temp.affected_rows($statement$ delete from public.exercises where id = '10000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete a system exercise');
select is(pg_temp.affected_rows($statement$ update public.exercises set is_system = false, owner_user_id = 'a0000000-0000-4000-8000-00000000000a' where id = '10000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot convert a system exercise into a custom exercise');
select ok(pg_temp.statement_fails($statement$ update public.exercises set is_system = true, owner_user_id = null where id = 'fa000000-0000-4000-8000-000000000001' $statement$), 'User A cannot convert own custom exercise into a system exercise');
select ok(pg_temp.statement_fails($statement$ update public.exercises set owner_user_id = 'b0000000-0000-4000-8000-00000000000b' where id = 'fa000000-0000-4000-8000-000000000001' $statement$), 'User A cannot transfer own custom exercise to User B');
select is(pg_temp.affected_rows($statement$ update public.exercises set owner_user_id = 'a0000000-0000-4000-8000-00000000000a' where id = 'fb000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot convert User B custom exercise into own data');

select is(pg_temp.affected_rows($statement$ update public.profiles set display_name = 'Attacked', updated_at = '1900-01-01' where user_id = 'b0000000-0000-4000-8000-00000000000b' $statement$), 0::bigint, 'User A cannot update User B profile or metadata');
select is(pg_temp.affected_rows($statement$ update public.exercises set name = 'Attacked' where id = 'fb000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B custom exercise');
select is(pg_temp.affected_rows($statement$ update public.workout_templates set name = 'Attacked' where id = 'fb100000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B template');
select is(pg_temp.affected_rows($statement$ update public.workout_template_exercises set notes = 'Attacked' where id = 'fb110000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B template exercise');
select is(pg_temp.affected_rows($statement$ update public.workouts set name = 'Attacked' where id = 'fb200000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B workout');
select is(pg_temp.affected_rows($statement$ update public.workout_exercises set notes = 'Attacked' where id = 'fb210000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B workout exercise');
select is(pg_temp.affected_rows($statement$ update public.sets set reps = 99 where id = 'fb220000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B set');
select is(pg_temp.affected_rows($statement$ update public.progression_recommendations set engine_version = 'attacked' where id = 'fb230000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B recommendation');
select is(pg_temp.affected_rows($statement$ update public.personal_records set weight_kg = 999 where id = 'fb240000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot update User B personal record');

select ok(pg_temp.statement_fails($statement$ update public.profiles set user_id = 'b0000000-0000-4000-8000-00000000000b' where user_id = 'a0000000-0000-4000-8000-00000000000a' $statement$), 'User A cannot transfer own profile to User B');
select ok(pg_temp.statement_fails($statement$ update public.workout_templates set user_id = 'b0000000-0000-4000-8000-00000000000b' where id = 'fa100000-0000-4000-8000-000000000001' $statement$), 'User A cannot transfer own template to User B');
select ok(pg_temp.statement_fails($statement$ update public.workouts set user_id = 'b0000000-0000-4000-8000-00000000000b' where id = 'fa200000-0000-4000-8000-000000000001' $statement$), 'User A cannot transfer own workout to User B');
select ok(pg_temp.statement_fails($statement$ update public.workout_exercises set user_id = 'b0000000-0000-4000-8000-00000000000b' where id = 'fa210000-0000-4000-8000-000000000001' $statement$), 'User A cannot transfer own workout exercise to User B');
select ok(pg_temp.statement_fails($statement$ update public.sets set user_id = 'b0000000-0000-4000-8000-00000000000b' where id = 'fa220000-0000-4000-8000-000000000001' $statement$), 'User A cannot transfer own set to User B');
select ok(pg_temp.statement_fails($statement$ update public.progression_recommendations set user_id = 'b0000000-0000-4000-8000-00000000000b' where id = 'fa230000-0000-4000-8000-000000000001' $statement$), 'User A cannot transfer own recommendation to User B');
select ok(pg_temp.statement_fails($statement$ update public.personal_records set user_id = 'b0000000-0000-4000-8000-00000000000b' where id = 'fa240000-0000-4000-8000-000000000001' $statement$), 'User A cannot transfer own personal record to User B');

select is(pg_temp.affected_rows($statement$ delete from public.profiles where user_id = 'b0000000-0000-4000-8000-00000000000b' $statement$), 0::bigint, 'User A cannot delete User B profile');
select is(pg_temp.affected_rows($statement$ delete from public.exercises where id = 'fb000000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B custom exercise');
select is(pg_temp.affected_rows($statement$ delete from public.workout_templates where id = 'fb100000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B template');
select is(pg_temp.affected_rows($statement$ delete from public.workout_template_exercises where id = 'fb110000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B template exercise');
select is(pg_temp.affected_rows($statement$ delete from public.workouts where id = 'fb200000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B workout');
select is(pg_temp.affected_rows($statement$ delete from public.workout_exercises where id = 'fb210000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B workout exercise');
select is(pg_temp.affected_rows($statement$ delete from public.sets where id = 'fb220000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B set');
select is(pg_temp.affected_rows($statement$ delete from public.progression_recommendations where id = 'fb230000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B recommendation');
select is(pg_temp.affected_rows($statement$ delete from public.personal_records where id = 'fb240000-0000-4000-8000-000000000001' $statement$), 0::bigint, 'User A cannot delete User B personal record');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);

select is((select count(*) from public.profiles where user_id = 'a0000000-0000-4000-8000-00000000000a'), 0::bigint, 'User B cannot read User A profile');
select is((select count(*) from public.exercises where id = 'fa000000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A custom exercise');
select is((select count(*) from public.exercise_secondary_muscles where exercise_id = 'fa000000-0000-4000-8000-000000000001'), 0::bigint, 'User A private secondary muscles do not leak to User B');
select is((select count(*) from public.workout_templates where id = 'fa100000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A template');
select is((select count(*) from public.workout_template_exercises where id = 'fa110000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A template exercise');
select is((select count(*) from public.workouts where id = 'fa200000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A workout');
select is((select count(*) from public.workout_exercises where id = 'fa210000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A workout exercise');
select is((select count(*) from public.sets where id = 'fa220000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A set');
select is((select count(*) from public.progression_recommendations where id = 'fa230000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A recommendation');
select is((select count(*) from public.personal_records where id = 'fa240000-0000-4000-8000-000000000001'), 0::bigint, 'User B cannot read User A personal record');
select is(
  (
    select count(*)
    from (
      select 1 from public.profiles where user_id = 'b0000000-0000-4000-8000-00000000000b'
      union all select 1 from public.exercises where id = 'fb000000-0000-4000-8000-000000000001'
      union all select 1 from public.exercise_secondary_muscles where exercise_id = 'fb000000-0000-4000-8000-000000000001'
      union all select 1 from public.workout_templates where id = 'fb100000-0000-4000-8000-000000000001'
      union all select 1 from public.workout_template_exercises where id = 'fb110000-0000-4000-8000-000000000001'
      union all select 1 from public.workouts where id = 'fb200000-0000-4000-8000-000000000001'
      union all select 1 from public.workout_exercises where id = 'fb210000-0000-4000-8000-000000000001'
      union all select 1 from public.sets where id = 'fb220000-0000-4000-8000-000000000001'
      union all select 1 from public.progression_recommendations where id = 'fb230000-0000-4000-8000-000000000001'
      union all select 1 from public.personal_records where id = 'fb240000-0000-4000-8000-000000000001'
    ) as own_rows
  ),
  10::bigint,
  'User B can still read every own fixture after User A attacks'
);

reset role;

select is(
  (
    select count(*)
    from (
      select 1 from public.profiles where user_id = 'b0000000-0000-4000-8000-00000000000b'
      union all select 1 from public.exercises where id = 'fb000000-0000-4000-8000-000000000001'
      union all select 1 from public.exercise_secondary_muscles where exercise_id = 'fb000000-0000-4000-8000-000000000001'
      union all select 1 from public.workout_templates where id = 'fb100000-0000-4000-8000-000000000001'
      union all select 1 from public.workout_template_exercises where id = 'fb110000-0000-4000-8000-000000000001'
      union all select 1 from public.workouts where id = 'fb200000-0000-4000-8000-000000000001'
      union all select 1 from public.workout_exercises where id = 'fb210000-0000-4000-8000-000000000001'
      union all select 1 from public.sets where id = 'fb220000-0000-4000-8000-000000000001'
      union all select 1 from public.progression_recommendations where id = 'fb230000-0000-4000-8000-000000000001'
      union all select 1 from public.personal_records where id = 'fb240000-0000-4000-8000-000000000001'
    ) as preserved_rows
  ),
  10::bigint,
  'all User B private rows remain persisted after cross-user attacks'
);
select is((select display_name from public.profiles where user_id = 'b0000000-0000-4000-8000-00000000000b'), 'User B', 'User B profile metadata was not changed');
select is((select name from public.exercises where id = 'fb000000-0000-4000-8000-000000000001'), 'Security User B Row', 'User B custom exercise was not changed');
select is((select name from public.workout_templates where id = 'fb100000-0000-4000-8000-000000000001'), 'Security Template B', 'User B template was not changed');
select is((select name from public.workouts where id = 'fb200000-0000-4000-8000-000000000001'), 'Security Workout B', 'User B workout was not changed');
select is((select reps from public.sets where id = 'fb220000-0000-4000-8000-000000000001'), 8, 'User B set was not changed');
select is((select engine_version from public.progression_recommendations where id = 'fb230000-0000-4000-8000-000000000001'), 'progression-v1', 'User B recommendation was not changed');
select is((select weight_kg from public.personal_records where id = 'fb240000-0000-4000-8000-000000000001'), 50::numeric, 'User B personal record was not changed');

select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      'fc110000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-00000000000a',
      'fb100000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', 2, 3, 8, 10
    )
  $statement$),
  'owned-template foreign key independently rejects cross-user parent ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workouts (
      id, user_id, source_template_id, name, status, started_at
    ) values (
      'fc200000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-00000000000a',
      'fb100000-0000-4000-8000-000000000001',
      'Invalid Source', 'active', '2026-09-14T12:00:00Z'
    )
  $statement$),
  'owned-source-template foreign key independently rejects cross-user ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position
    ) values (
      'fc210000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-00000000000a',
      'fb200000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', 2
    )
  $statement$),
  'owned-workout foreign key independently rejects cross-user workout exercise ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      'fc220000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-00000000000a',
      'fb200000-0000-4000-8000-000000000001',
      'fb210000-0000-4000-8000-000000000001',
      'fb000000-0000-4000-8000-000000000001',
      2, 'working', 8, '2026-09-14T12:15:00Z'
    )
  $statement$),
  'set foreign keys independently reject cross-user workout ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      'fc220000-0000-4000-8000-000000000011',
      'a0000000-0000-4000-8000-00000000000a',
      'fa200000-0000-4000-8000-000000000001',
      'fa210000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      2, 'working', 8, '2026-09-14T12:15:00Z'
    )
  $statement$),
  'set identity foreign key independently rejects exercise inconsistency'
);
select ok(
  pg_temp.statement_fails($statement$
    update public.workout_exercises
    set source_recommendation_id = 'fb230000-0000-4000-8000-000000000001'
    where id = 'fa210000-0000-4000-8000-000000000001'
  $statement$),
  'recommendation ownership foreign key independently rejects cross-user source linkage'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id,
      source_workout_exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      'fc230000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-00000000000a',
      'fb000000-0000-4000-8000-000000000001',
      'fb200000-0000-4000-8000-000000000001',
      'fb210000-0000-4000-8000-000000000001',
      'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
      'active', 'progression-v1'
    )
  $statement$),
  'recommendation foreign keys independently reject cross-user source ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id,
      source_workout_exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      'fc230000-0000-4000-8000-000000000011',
      'a0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001',
      'fa200000-0000-4000-8000-000000000001',
      'fa210000-0000-4000-8000-000000000001',
      'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
      'active', 'progression-v1'
    )
  $statement$),
  'recommendation foreign keys independently reject source exercise mismatch'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      'fc240000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-00000000000a',
      'fb000000-0000-4000-8000-000000000001',
      'max_weight', 'fb220000-0000-4000-8000-000000000001',
      'fb200000-0000-4000-8000-000000000001',
      50, '2026-09-14T12:10:00Z'
    )
  $statement$),
  'personal-record foreign keys independently reject cross-user source ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      'fc240000-0000-4000-8000-000000000011',
      'a0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001',
      'max_weight', 'fa220000-0000-4000-8000-000000000001',
      'fa200000-0000-4000-8000-000000000001',
      45, '2026-09-14T12:10:00Z'
    )
  $statement$),
  'personal-record source-set foreign key independently rejects exercise mismatch'
);

select * from finish();
rollback;
