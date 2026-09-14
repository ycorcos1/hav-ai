begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(32);

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

select has_table('public', 'progression_recommendations', 'recommendations table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.progression_recommendations'::regclass),
  'recommendations has RLS enabled'
);
select is(
  (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'progression_recommendations'
  ),
  4::bigint,
  'recommendations defines owned CRUD policies'
);
select has_index(
  'public', 'progression_recommendations',
  'progression_recommendations_user_exercise_status_idx',
  'recommendation status lookup index exists'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'progression_recommendations'
      and indexname = 'progression_recommendations_one_active_idx'
      and indexdef like 'CREATE UNIQUE INDEX%WHERE (status = %'
  ),
  'one active recommendation per user and exercise is enforced'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'progression_recommendations_source_workout_fkey'
      and confdeltype = 'n'
  ),
  'source workout deletion uses SET NULL'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'progression_recommendations_source_exercise_fkey'
      and confdeltype = 'n'
  ),
  'source workout exercise deletion uses SET NULL'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'progression_recommendations_source_ancestry_fkey'
      and confdeltype = 'a'
  ),
  'source workout ancestry has an independent consistency constraint'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'progression_recommendations'
      and column_name = 'source_set_id'
  ),
  'the canonical recommendation model has no source-set field'
);

insert into auth.users (id)
values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

insert into public.exercises (
  id, owner_user_id, name, primary_muscle_group, equipment_type,
  measurement_type, is_system
)
values
  (
    'f1000000-0000-4000-8000-000000000001', null, 'Bench Press', 'chest',
    'barbell', 'weight_reps', true
  ),
  (
    '20000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a', 'User A Row', 'back',
    'cable', 'weight_reps', false
  ),
  (
    '20000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b', 'User B Press', 'chest',
    'machine', 'weight_reps', false
  );

insert into public.workouts (id, user_id, name, status, started_at)
values
  (
    '30000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a', 'User A Workout',
    'completed', '2026-09-11T12:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b', 'User B Workout',
    'completed', '2026-09-11T12:00:00Z'
  );

insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position)
values
  (
    '40000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000a',
    'f1000000-0000-4000-8000-000000000001', 0
  ),
  (
    '40000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-00000000000a', 1
  ),
  (
    '40000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b',
    '30000000-0000-4000-8000-00000000000b',
    'f1000000-0000-4000-8000-000000000001', 0
  );

select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'unknown', 'high',
      '["WITHIN_TARGET_RANGE"]', 'active', 'progression-v1'
    )
  $statement$),
  'invalid recommendation type is rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', 'certain',
      '["WITHIN_TARGET_RANGE"]', 'active', 'progression-v1'
    )
  $statement$),
  'invalid confidence is rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', 'high',
      '["WITHIN_TARGET_RANGE"]', 'pending', 'progression-v1'
    )
  $statement$),
  'invalid status is rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, recommended_weight_kg,
      confidence, reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', -1,
      'high', '["WITHIN_TARGET_RANGE"]', 'active', 'progression-v1'
    )
  $statement$),
  'negative recommended weight is rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, target_sets,
      target_min_reps, target_max_reps, confidence, reason_codes, status,
      engine_version
    ) values (
      '50000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', 0,
      10, 8, 'high', '["WITHIN_TARGET_RANGE"]', 'active', 'progression-v1'
    )
  $statement$),
  'invalid target structure is rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, target_sets,
      target_set_reps, confidence, reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'increase_reps', 3,
      '[8, 8]', 'high', '["TOTAL_REPS_IMPROVED"]', 'active', 'progression-v1'
    )
  $statement$),
  'target-set reps must match target set count'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000007',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', 'high',
      '["NOT_A_REASON"]', 'active', 'progression-v1'
    )
  $statement$),
  'unknown reason code is rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', 'high',
      '{}', 'active', 'progression-v1'
    )
  $statement$),
  'reason codes must be a JSON array'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000009',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', 'high',
      '["WITHIN_TARGET_RANGE"]', 'active', ' '
    )
  $statement$),
  'blank engine version is rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

insert into public.progression_recommendations (
  id, user_id, exercise_id, source_workout_id, source_workout_exercise_id,
  recommendation_type, recommended_weight_kg, target_sets,
  target_min_reps, target_max_reps, target_set_reps, confidence,
  reason_codes, status, engine_version
)
values (
  '50000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  'increase_reps', 83.9146, 3, 6, 8, '[8, 8, 8]', 'high',
  '["TOP_OF_REP_RANGE_REACHED", "RPE_ACCEPTABLE"]',
  'active', 'progression-v1'
);
select ok(
  exists (
    select 1 from public.progression_recommendations
    where id = '50000000-0000-4000-8000-00000000000a'
      and target_set_reps = '[8, 8, 8]'::jsonb
  ),
  'an owned recommendation preserves canonical structured targets'
);
select is(
  (select count(*) from public.progression_recommendations),
  1::bigint,
  'a user sees only owned recommendations'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-00000000000b',
      '00000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001', 'repeat_target', 'medium',
      '["PERFORMANCE_REPEATED"]', 'consumed', 'progression-v1'
    )
  $statement$),
  'a user cannot create a recommendation for another user'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-00000000000c',
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000b', 'repeat_target', 'medium',
      '["PERFORMANCE_REPEATED"]', 'consumed', 'progression-v1'
    )
  $statement$),
  'a user cannot reference another user custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id, recommendation_type,
      confidence, reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-00000000000d',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-00000000000b', 'repeat_target', 'medium',
      '["PERFORMANCE_REPEATED"]', 'consumed', 'progression-v1'
    )
  $statement$),
  'a user cannot reference another user source workout'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id, source_workout_exercise_id,
      recommendation_type, confidence, reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-00000000000e',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      'repeat_target', 'medium', '["PERFORMANCE_REPEATED"]',
      'consumed', 'progression-v1'
    )
  $statement$),
  'a user cannot reference another user source workout exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, source_workout_id, source_workout_exercise_id,
      recommendation_type, confidence, reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-00000000000f',
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      'repeat_target', 'medium', '["PERFORMANCE_REPEATED"]',
      'consumed', 'progression-v1'
    )
  $statement$),
  'source workout exercise must match the recommendation exercise'
);

update public.progression_recommendations
set status = 'consumed', consumed_at = '2026-09-11T14:00:00Z'
where id = '50000000-0000-4000-8000-00000000000a';
select is(
  (select status from public.progression_recommendations where id = '50000000-0000-4000-8000-00000000000a'),
  'consumed',
  'a user can consume an owned recommendation'
);

insert into public.progression_recommendations (
  id, user_id, exercise_id, recommendation_type, confidence,
  reason_codes, status, engine_version
)
values (
  '50000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001',
  'repeat_target', 'medium', '["PERFORMANCE_REPEATED"]',
  'active', 'progression-v1'
);
select ok(
  exists (
    select 1 from public.progression_recommendations
    where id = '50000000-0000-4000-8000-000000000010'
      and source_workout_id is null
      and source_workout_exercise_id is null
  ),
  'a recommendation with null source fields remains valid'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.progression_recommendations (
      id, user_id, exercise_id, recommendation_type, confidence,
      reason_codes, status, engine_version
    ) values (
      '50000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      'repeat_target', 'medium', '["PERFORMANCE_REPEATED"]',
      'active', 'progression-v1'
    )
  $statement$),
  'a second active recommendation for the same user and exercise is rejected'
);

delete from public.progression_recommendations
where id = '50000000-0000-4000-8000-000000000010';
select is(
  (
    select count(*) from public.progression_recommendations
    where id = '50000000-0000-4000-8000-000000000010'
  ),
  0::bigint,
  'a user can delete an owned recommendation'
);

reset role;

insert into public.progression_recommendations (
  id, user_id, exercise_id, source_workout_id, source_workout_exercise_id,
  recommendation_type, confidence, reason_codes, status, engine_version
)
values (
  '50000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000b',
  'f1000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-00000000000b',
  '40000000-0000-4000-8000-00000000000b',
  'repeat_target', 'medium', '["PERFORMANCE_REPEATED"]',
  'consumed', 'progression-v1'
);
select is(
  (
    select count(*) from public.progression_recommendations
    where user_id = '00000000-0000-4000-8000-00000000000b'
  ),
  1::bigint,
  'another user recommendation exists outside the authenticated view'
);

delete from public.workout_exercises
where id = '40000000-0000-4000-8000-00000000000a';
select ok(
  exists (
    select 1 from public.progression_recommendations
    where id = '50000000-0000-4000-8000-00000000000a'
      and source_workout_id = '30000000-0000-4000-8000-00000000000a'
      and source_workout_exercise_id is null
  ),
  'deleting a source workout exercise clears only that source link'
);

delete from public.workouts
where id = '30000000-0000-4000-8000-00000000000b';
select ok(
  exists (
    select 1 from public.progression_recommendations
    where id = '50000000-0000-4000-8000-00000000000b'
      and source_workout_id is null
      and source_workout_exercise_id is null
  ),
  'deleting a source workout preserves recommendation history with cleared links'
);

select * from finish();
rollback;
