begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(36);

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

select is(
  (
    select count(*)
    from pg_constraint
    where contype = 'f'
      and connamespace = 'public'::regnamespace
  ),
  28::bigint,
  'the complete Phase 13 schema has the expected foreign-key inventory'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'workout_template_exercises_owned_template_fkey'
      and conrelid = 'public.workout_template_exercises'::regclass
      and confrelid = 'public.workout_templates'::regclass
      and confdeltype = 'c'
      and pg_get_constraintdef(oid) like
        'FOREIGN KEY (template_id, user_id) REFERENCES workout_templates(id, user_id)%'
  ),
  'template exercise ownership uses a cascading composite foreign key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'workouts_owned_source_template_fkey'
      and conrelid = 'public.workouts'::regclass
      and confrelid = 'public.workout_templates'::regclass
      and confdeltype = 'n'
      and pg_get_constraintdef(oid) like
        'FOREIGN KEY (source_template_id, user_id) REFERENCES workout_templates(id, user_id)%SET NULL (source_template_id)'
  ),
  'workout source-template ownership uses a composite SET NULL foreign key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_owned_source_recommendation_fkey'
      and conrelid = 'public.workout_exercises'::regclass
      and confrelid = 'public.progression_recommendations'::regclass
      and confdeltype = 'n'
      and pg_get_constraintdef(oid) like
        'FOREIGN KEY (source_recommendation_id, user_id) REFERENCES progression_recommendations(id, user_id)%SET NULL (source_recommendation_id)'
  ),
  'workout recommendation snapshots use an owned SET NULL foreign key'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'profiles_user_id_fkey' and confdeltype = 'c'
  ),
  'profile ownership cascades from auth users'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'exercises_owner_user_id_fkey' and confdeltype = 'c'
  ),
  'custom exercise ownership cascades from auth users'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'exercise_secondary_muscles_exercise_id_fkey' and confdeltype = 'c'
  ),
  'secondary muscles cascade with their exercise'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'workout_template_exercises_exercise_id_fkey' and confdeltype = 'r'
  ),
  'template history restricts referenced exercise deletion'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'workout_exercises_owned_workout_fkey' and confdeltype = 'c'
  ),
  'workout exercises cascade with owned workouts'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'workout_exercises_exercise_id_fkey' and confdeltype = 'r'
  ),
  'workout history restricts referenced exercise deletion'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'sets_owned_workout_fkey' and confdeltype = 'c'
  ),
  'sets cascade with owned workouts'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'sets_workout_exercise_identity_fkey' and confdeltype = 'c'
  ),
  'sets cascade with their exact workout exercise ancestry'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'sets_exercise_id_fkey' and confdeltype = 'r'
  ),
  'set history restricts referenced exercise deletion'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'progression_recommendations_source_workout_fkey' and confdeltype = 'n'
  ),
  'recommendation source workout deletion uses SET NULL'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'progression_recommendations_source_exercise_fkey' and confdeltype = 'n'
  ),
  'recommendation source workout-exercise deletion uses SET NULL'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'progression_recommendations_source_ancestry_fkey' and confdeltype = 'a'
  ),
  'recommendation source ancestry remains declaratively protected'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'personal_records_owned_workout_fkey' and confdeltype = 'c'
  ),
  'personal records cascade with source workouts'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'personal_records_source_set_fkey' and confdeltype = 'c'
  ),
  'personal records cascade with exact source-set ancestry'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'personal_records_exercise_id_fkey' and confdeltype = 'r'
  ),
  'personal-record history restricts referenced exercise deletion'
);

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
      'public.personal_records'::regclass,
      'public.user_exercise_preferences'::regclass
    ) and relrowsecurity
  ),
  11::bigint,
  'all current private cloud tables retain RLS'
);

insert into auth.users (id)
values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

insert into public.exercises (
  id, owner_user_id, name, primary_muscle_group, equipment_type,
  measurement_type, is_system
)
values (
  'f1000000-0000-4000-8000-000000000001', null, 'Bench Press', 'chest',
  'barbell', 'weight_reps', true
);

insert into public.workout_templates (id, user_id, name)
values
  (
    '20000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a', 'User A Template'
  ),
  (
    '20000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b', 'User B Template'
  );

select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '21000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001', 0, 3, 8, 10
    )
  $statement$),
  'database constraints reject a cross-owner template child'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workouts (
      id, user_id, source_template_id, name, status, started_at
    ) values (
      '30000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000b',
      'Invalid Snapshot', 'active', '2026-09-14T12:00:00Z'
    )
  $statement$),
  'database constraints reject a cross-owner source template'
);

insert into public.workout_template_exercises (
  id, user_id, template_id, exercise_id, position,
  target_sets, target_min_reps, target_max_reps
)
values (
  '21000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001', 0, 3, 8, 10
);

insert into public.workouts (
  id, user_id, source_template_id, name, status, started_at
)
values
  (
    '30000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-00000000000a',
    'User A Workout', 'completed', '2026-09-14T12:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b',
    '20000000-0000-4000-8000-00000000000b',
    'User B Workout', 'completed', '2026-09-14T12:00:00Z'
  );

insert into public.workout_exercises (
  id, user_id, workout_id, exercise_id, position
)
values
  (
    '40000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000a',
    'f1000000-0000-4000-8000-000000000001', 0
  ),
  (
    '40000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b',
    '30000000-0000-4000-8000-00000000000b',
    'f1000000-0000-4000-8000-000000000001', 0
  );

insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, weight_kg, reps, completed_at
)
values (
  '50000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001',
  0, 'working', 100, 8, '2026-09-14T12:10:00Z'
);

insert into public.progression_recommendations (
  id, user_id, exercise_id, source_workout_id,
  source_workout_exercise_id, recommendation_type, confidence,
  reason_codes, status, engine_version
)
values
  (
    '60000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a',
    'f1000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-00000000000a',
    '40000000-0000-4000-8000-00000000000a',
    'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
    'active', 'progression-v1'
  ),
  (
    '60000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b',
    'f1000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-00000000000b',
    '40000000-0000-4000-8000-00000000000b',
    'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
    'active', 'progression-v1'
  );

update public.workout_exercises
set source_recommendation_id = '60000000-0000-4000-8000-00000000000a'
where id = '40000000-0000-4000-8000-00000000000a';
select is(
  (
    select source_recommendation_id
    from public.workout_exercises
    where id = '40000000-0000-4000-8000-00000000000a'
  ),
  '60000000-0000-4000-8000-00000000000a'::uuid,
  'an owned recommendation can be snapshotted into a workout exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    update public.workout_exercises
    set source_recommendation_id = '60000000-0000-4000-8000-00000000000b'
    where id = '40000000-0000-4000-8000-00000000000a'
  $statement$),
  'database constraints reject a cross-owner recommendation snapshot'
);

delete from public.progression_recommendations
where id = '60000000-0000-4000-8000-00000000000a';
select is(
  (
    select source_recommendation_id
    from public.workout_exercises
    where id = '40000000-0000-4000-8000-00000000000a'
  ),
  null::uuid,
  'deleting a recommendation clears the snapshot link without deleting history'
);

insert into public.personal_records (
  id, user_id, exercise_id, record_type, set_id, workout_id,
  weight_kg, reps, achieved_at
)
values (
  '70000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001', 'max_weight',
  '50000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a',
  100, 8, '2026-09-14T12:10:00Z'
);

delete from public.workout_templates
where id = '20000000-0000-4000-8000-00000000000a';
select is(
  (
    select count(*) from public.workout_template_exercises
    where template_id = '20000000-0000-4000-8000-00000000000a'
  ),
  0::bigint,
  'deleting a template cascades its configuration rows'
);
select ok(
  exists (
    select 1 from public.workouts
    where id = '30000000-0000-4000-8000-00000000000a'
      and source_template_id is null
  ),
  'deleting a template preserves workout history and clears its source link'
);

select ok(
  pg_temp.statement_fails($statement$
    delete from public.exercises
    where id = 'f1000000-0000-4000-8000-000000000001'
  $statement$),
  'referenced exercises remain protected by RESTRICT'
);

delete from public.workouts
where id = '30000000-0000-4000-8000-00000000000a';
select is(
  (
    select count(*) from public.workout_exercises
    where workout_id = '30000000-0000-4000-8000-00000000000a'
  ),
  0::bigint,
  'deleting a workout cascades its exercise rows'
);
select is(
  (
    select count(*) from public.sets
    where workout_id = '30000000-0000-4000-8000-00000000000a'
  ),
  0::bigint,
  'deleting a workout cascades its sets'
);
select is(
  (
    select count(*) from public.personal_records
    where workout_id = '30000000-0000-4000-8000-00000000000a'
  ),
  0::bigint,
  'deleting authoritative workout history removes derived PR state'
);
select ok(
  exists (
    select 1 from public.progression_recommendations
    where id = '60000000-0000-4000-8000-00000000000b'
      and source_workout_id = '30000000-0000-4000-8000-00000000000b'
      and source_workout_exercise_id = '40000000-0000-4000-8000-00000000000b'
  ),
  'unrelated recommendation source history remains unchanged'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'workout_templates_id_user_id_key' and contype = 'u'
  ),
  'template ownership has a composite referenced key'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'progression_recommendations_id_user_id_key' and contype = 'u'
  ),
  'recommendation ownership has a composite referenced key'
);
select ok(
  not exists (
    select 1 from pg_constraint
    where conname in (
      'workout_template_exercises_template_id_fkey',
      'workouts_source_template_id_fkey'
    )
  ),
  'superseded non-owned template foreign keys are absent'
);
select ok(
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_exercise_preferences'
  ),
  'Task 13.11 preference storage is present'
);

select * from finish();
rollback;
