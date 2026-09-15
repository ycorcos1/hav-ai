begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(21);

select has_function(
  'public', 'set_server_controlled_metadata', array[]::text[],
  'generic server metadata trigger function exists'
);
select has_function(
  'public', 'set_profile_updated_at', array[]::text[],
  'the existing profile metadata function remains available'
);
select is(
  (
    select count(distinct event_object_table)
    from information_schema.triggers
    where trigger_schema = 'public'
      and trigger_name like 'set_%metadata'
  ),
  9::bigint,
  'all nine new Phase 13 entity tables have metadata triggers'
);
select is(
  (
    select count(*)
    from information_schema.triggers
    where trigger_schema = 'public'
      and trigger_name like 'set_%metadata'
      and event_manipulation in ('INSERT', 'UPDATE')
  ),
  18::bigint,
  'generic metadata triggers cover both inserts and updates'
);
select is(
  (
    select count(*)
    from information_schema.triggers
    where trigger_schema = 'public'
      and trigger_name = 'set_profile_updated_at'
      and event_manipulation in ('INSERT', 'UPDATE')
  ),
  2::bigint,
  'the profile trigger covers inserts and updates'
);
select ok(
  not exists (
    select 1
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table = 'exercise_secondary_muscles'
  ),
  'relationship-only secondary muscles have no fabricated metadata trigger'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercise_secondary_muscles'
      and column_name in ('created_at', 'updated_at')
  ),
  'relationship-only secondary muscles have no fabricated metadata columns'
);

insert into auth.users (id)
values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

insert into public.profiles (
  user_id, weight_unit, primary_goal, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-00000000000a', 'lb', 'hybrid',
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.profiles (user_id, weight_unit, primary_goal)
values ('00000000-0000-4000-8000-00000000000b', 'kg', 'strength');
select ok(
  (
    select created_at = updated_at and created_at > '1900-01-01T00:00:00Z'
    from public.profiles
    where user_id = '00000000-0000-4000-8000-00000000000a'
  ),
  'profile insert ignores client-supplied metadata values'
);
select ok(
  (
    select created_at is not null and updated_at is not null
    from public.profiles
    where user_id = '00000000-0000-4000-8000-00000000000b'
  ),
  'profile insert succeeds when metadata is omitted'
);

insert into public.exercises (
  id, owner_user_id, name, primary_muscle_group, equipment_type,
  measurement_type, is_system, created_at, updated_at
)
values (
  'f1000000-0000-4000-8000-000000000001', null, 'Bench Press', 'chest',
  'barbell', 'weight_reps', true,
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.workout_templates (
  id, user_id, name, created_at, updated_at
)
values (
  '20000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a', 'Push',
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.workout_template_exercises (
  id, user_id, template_id, exercise_id, position,
  target_sets, target_min_reps, target_max_reps, created_at, updated_at
)
values (
  '21000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001', 0, 3, 8, 10,
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.workouts (
  id, user_id, source_template_id, name, status, started_at,
  completed_at, created_at, updated_at
)
values (
  '30000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000000a', 'Push Session', 'completed',
  '2026-09-14T12:00:00Z', '2026-09-14T13:00:00Z',
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.workout_exercises (
  id, user_id, workout_id, exercise_id, position, created_at, updated_at
)
values (
  '40000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001', 0,
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, weight_kg, reps, completed_at, created_at, updated_at
)
values (
  '50000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001',
  0, 'working', 100, 8, '2026-09-14T12:10:00Z',
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.progression_recommendations (
  id, user_id, exercise_id, source_workout_id,
  source_workout_exercise_id, recommendation_type, confidence,
  reason_codes, status, engine_version, consumed_at, created_at, updated_at
)
values (
  '60000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  'repeat_target', 'high', '["WITHIN_TARGET_RANGE"]',
  'consumed', 'progression-v1', '2026-09-14T13:05:00Z',
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);
insert into public.personal_records (
  id, user_id, exercise_id, record_type, set_id, workout_id,
  weight_kg, reps, achieved_at, created_at, updated_at
)
values (
  '70000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001', 'max_weight',
  '50000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a',
  100, 8, '2026-09-14T12:10:00Z',
  '1900-01-01T00:00:00Z', '1900-01-01T00:00:00Z'
);

select is(
  (
    select count(*)
    from (
      select created_at, updated_at from public.exercises
      where id = 'f1000000-0000-4000-8000-000000000001'
      union all select created_at, updated_at from public.workout_templates
      where id = '20000000-0000-4000-8000-00000000000a'
      union all select created_at, updated_at from public.workout_template_exercises
      where id = '21000000-0000-4000-8000-00000000000a'
      union all select created_at, updated_at from public.workouts
      where id = '30000000-0000-4000-8000-00000000000a'
      union all select created_at, updated_at from public.workout_exercises
      where id = '40000000-0000-4000-8000-00000000000a'
      union all select created_at, updated_at from public.sets
      where id = '50000000-0000-4000-8000-00000000000a'
      union all select created_at, updated_at from public.progression_recommendations
      where id = '60000000-0000-4000-8000-00000000000a'
      union all select created_at, updated_at from public.personal_records
      where id = '70000000-0000-4000-8000-00000000000a'
    ) as metadata_rows
    where created_at = updated_at
      and created_at > '1900-01-01T00:00:00Z'
  ),
  8::bigint,
  'all new entity inserts ignore client-supplied metadata values'
);

create temporary table metadata_before (
  table_name text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null
) on commit drop;

insert into metadata_before
select 'profiles', created_at, updated_at from public.profiles
where user_id = '00000000-0000-4000-8000-00000000000a'
union all select 'exercises', created_at, updated_at from public.exercises
where id = 'f1000000-0000-4000-8000-000000000001'
union all select 'workout_templates', created_at, updated_at from public.workout_templates
where id = '20000000-0000-4000-8000-00000000000a'
union all select 'workout_template_exercises', created_at, updated_at
from public.workout_template_exercises
where id = '21000000-0000-4000-8000-00000000000a'
union all select 'workouts', created_at, updated_at from public.workouts
where id = '30000000-0000-4000-8000-00000000000a'
union all select 'workout_exercises', created_at, updated_at from public.workout_exercises
where id = '40000000-0000-4000-8000-00000000000a'
union all select 'sets', created_at, updated_at from public.sets
where id = '50000000-0000-4000-8000-00000000000a'
union all select 'progression_recommendations', created_at, updated_at
from public.progression_recommendations
where id = '60000000-0000-4000-8000-00000000000a'
union all select 'personal_records', created_at, updated_at from public.personal_records
where id = '70000000-0000-4000-8000-00000000000a';

select pg_sleep(0.01);

update public.profiles
set display_name = 'Updated', created_at = '1900-01-01', updated_at = '1900-01-01'
where user_id = '00000000-0000-4000-8000-00000000000a';
update public.exercises
set name = 'Updated Bench Press', created_at = '1900-01-01', updated_at = '1900-01-01'
where id = 'f1000000-0000-4000-8000-000000000001';
update public.workout_templates
set name = 'Updated Push', created_at = '1900-01-01', updated_at = '1900-01-01'
where id = '20000000-0000-4000-8000-00000000000a';
update public.workout_template_exercises
set notes = 'Updated', created_at = '1900-01-01', updated_at = '1900-01-01'
where id = '21000000-0000-4000-8000-00000000000a';
update public.workouts
set name = 'Updated Session', created_at = '1900-01-01', updated_at = '1900-01-01'
where id = '30000000-0000-4000-8000-00000000000a';
update public.workout_exercises
set notes = 'Updated', created_at = '1900-01-01', updated_at = '1900-01-01'
where id = '40000000-0000-4000-8000-00000000000a';
update public.sets
set reps = 9, created_at = '1900-01-01', updated_at = '1900-01-01'
where id = '50000000-0000-4000-8000-00000000000a';
update public.progression_recommendations
set engine_version = 'progression-v1.1', created_at = '1900-01-01', updated_at = '1900-01-01'
where id = '60000000-0000-4000-8000-00000000000a';
update public.personal_records
set reps = 9, created_at = '1900-01-01', updated_at = '1900-01-01'
where id = '70000000-0000-4000-8000-00000000000a';

select is(
  (
    select count(*)
    from (
      select 'profiles' as table_name, created_at, updated_at from public.profiles
      where user_id = '00000000-0000-4000-8000-00000000000a'
      union all select 'exercises', created_at, updated_at from public.exercises
      union all select 'workout_templates', created_at, updated_at from public.workout_templates
      union all select 'workout_template_exercises', created_at, updated_at
      from public.workout_template_exercises
      union all select 'workouts', created_at, updated_at from public.workouts
      union all select 'workout_exercises', created_at, updated_at from public.workout_exercises
      union all select 'sets', created_at, updated_at from public.sets
      union all select 'progression_recommendations', created_at, updated_at
      from public.progression_recommendations
      union all select 'personal_records', created_at, updated_at from public.personal_records
    ) as after_rows
    join metadata_before using (table_name)
    where after_rows.created_at = metadata_before.created_at
      and after_rows.updated_at > metadata_before.updated_at
  ),
  9::bigint,
  'updates preserve created_at and advance server-controlled updated_at'
);
select is(
  (select started_at from public.workouts where id = '30000000-0000-4000-8000-00000000000a'),
  '2026-09-14T12:00:00Z'::timestamptz,
  'workout started_at remains an unchanged domain-event timestamp'
);
select is(
  (select completed_at from public.workouts where id = '30000000-0000-4000-8000-00000000000a'),
  '2026-09-14T13:00:00Z'::timestamptz,
  'workout completed_at remains an unchanged domain-event timestamp'
);
select is(
  (select completed_at from public.sets where id = '50000000-0000-4000-8000-00000000000a'),
  '2026-09-14T12:10:00Z'::timestamptz,
  'set completed_at remains an unchanged domain-event timestamp'
);
select is(
  (
    select consumed_at from public.progression_recommendations
    where id = '60000000-0000-4000-8000-00000000000a'
  ),
  '2026-09-14T13:05:00Z'::timestamptz,
  'recommendation consumed_at remains an unchanged domain-event timestamp'
);
select is(
  (
    select achieved_at from public.personal_records
    where id = '70000000-0000-4000-8000-00000000000a'
  ),
  '2026-09-14T12:10:00Z'::timestamptz,
  'personal-record achieved_at remains an unchanged domain-event timestamp'
);

select is(
  (
    select count(*)
    from pg_trigger
    where not tgisinternal
      and tgrelid in (
        'public.profiles'::regclass,
        'public.exercises'::regclass,
        'public.workout_templates'::regclass,
        'public.workout_template_exercises'::regclass,
        'public.workouts'::regclass,
        'public.workout_exercises'::regclass,
        'public.sets'::regclass,
        'public.progression_recommendations'::regclass,
        'public.personal_records'::regclass,
        'public.user_exercise_preferences'::regclass
      )
  ),
  10::bigint,
  'exactly one metadata trigger is installed on every applicable entity table'
);
select ok(
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_exercise_preferences'
  ),
  'Task 13.11 preference storage is present'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and column_name = 'server_updated_at'
  ),
  'local synchronization metadata was not added to cloud tables'
);
select is(
  (
    select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  ),
  11::bigint,
  'no unexpected public table was added'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.personal_records'::regclass),
  'RLS remains enabled after metadata hardening'
);

select * from finish();
rollback;
