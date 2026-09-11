begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(22);

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

select has_table('public', 'personal_records', 'personal_records table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.personal_records'::regclass),
  'personal_records has RLS enabled'
);
select is(
  (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'personal_records'
  ),
  4::bigint,
  'personal_records defines owned CRUD policies'
);
select has_index(
  'public', 'personal_records', 'personal_records_current_state_key',
  'one current record per user, exercise, and type is enforced'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'personal_records_owned_workout_fkey'
      and confdeltype = 'c'
  ),
  'source workout deletion cascades stale personal-record state'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'personal_records_source_set_fkey'
      and confdeltype = 'c'
  ),
  'source set deletion cascades stale personal-record state'
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
    '10000000-0000-4000-8000-000000000001', null, 'Bench Press', 'chest',
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

insert into public.workouts (id, user_id, name, status, started_at, completed_at)
values
  (
    '30000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a', 'User A Workout', 'completed',
    '2026-09-11T12:00:00Z', '2026-09-11T13:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-00000000000a', 'User A Other Workout', 'completed',
    '2026-09-10T12:00:00Z', '2026-09-10T13:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b', 'User B Workout', 'completed',
    '2026-09-11T12:00:00Z', '2026-09-11T13:00:00Z'
  );

insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position)
values
  (
    '40000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000a',
    '10000000-0000-4000-8000-000000000001', 0
  ),
  (
    '40000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000c',
    '10000000-0000-4000-8000-000000000001', 0
  ),
  (
    '40000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b',
    '30000000-0000-4000-8000-00000000000b',
    '10000000-0000-4000-8000-000000000001', 0
  );

insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, weight_kg, reps, rpe, completed_at
)
values
  (
    '50000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000a',
    '40000000-0000-4000-8000-00000000000a',
    '10000000-0000-4000-8000-000000000001',
    0, 'working', 100, 5, 8.5, '2026-09-11T12:30:00Z'
  ),
  (
    '50000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000000c',
    '40000000-0000-4000-8000-00000000000c',
    '10000000-0000-4000-8000-000000000001',
    0, 'working', 95, 6, 8, '2026-09-10T12:30:00Z'
  ),
  (
    '50000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b',
    '30000000-0000-4000-8000-00000000000b',
    '40000000-0000-4000-8000-00000000000b',
    '10000000-0000-4000-8000-000000000001',
    0, 'working', 90, 8, 8, '2026-09-11T12:30:00Z'
  );

select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001', 'rep_pr',
      '50000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000a', 100,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'rep_pr is rejected as persistent current state'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001', 'max_weight',
      '50000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000a',
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'max-weight state requires a canonical weight value'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      estimated_1rm_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001', 'estimated_1rm',
      '50000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000a', -1,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'negative estimated 1RM is rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

insert into public.personal_records (
  id, user_id, exercise_id, record_type, set_id, workout_id,
  weight_kg, reps, achieved_at
)
values (
  '60000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '10000000-0000-4000-8000-000000000001', 'max_weight',
  '50000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a', 100, 5,
  '2026-09-11T12:30:00Z'
);
select ok(
  exists (
    select 1 from public.personal_records
    where id = '60000000-0000-4000-8000-00000000000a'
      and record_type = 'max_weight' and weight_kg = 100
  ),
  'valid max-weight current state succeeds'
);

insert into public.personal_records (
  id, user_id, exercise_id, record_type, set_id, workout_id,
  weight_kg, reps, estimated_1rm_kg, achieved_at
)
values (
  '60000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000a',
  '10000000-0000-4000-8000-000000000001', 'estimated_1rm',
  '50000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a', 100, 5, 116.6667,
  '2026-09-11T12:30:00Z'
);
select ok(
  exists (
    select 1 from public.personal_records
    where id = '60000000-0000-4000-8000-00000000000b'
      and record_type = 'estimated_1rm' and estimated_1rm_kg = 116.6667
  ),
  'valid estimated-1RM current state succeeds'
);
select is((select count(*) from public.personal_records), 2::bigint, 'a user reads only owned PR state');

select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001', 'max_weight',
      '50000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000a', 101,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'duplicate current state for the same user, exercise, and type is rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000001', 'max_weight',
      '50000000-0000-4000-8000-00000000000b',
      '30000000-0000-4000-8000-00000000000b', 90,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'a user cannot create PR state for another user'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000b', 'max_weight',
      '50000000-0000-4000-8000-00000000000b',
      '30000000-0000-4000-8000-00000000000b', 90,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'another user custom exercise and source graph cannot be referenced'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000007',
      '00000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001', 'max_weight',
      '50000000-0000-4000-8000-00000000000b',
      '30000000-0000-4000-8000-00000000000b', 90,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'another user source set and workout cannot be referenced'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001', 'max_weight',
      '50000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000c', 100,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'source set must belong to the declared source workout'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.personal_records (
      id, user_id, exercise_id, record_type, set_id, workout_id,
      weight_kg, achieved_at
    ) values (
      '60000000-0000-4000-8000-000000000009',
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000a', 'max_weight',
      '50000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000a', 100,
      '2026-09-11T12:30:00Z'
    )
  $statement$),
  'source set exercise must match the personal-record exercise'
);

update public.personal_records
set weight_kg = 102.5
where id = '60000000-0000-4000-8000-00000000000a';
select is(
  (select weight_kg from public.personal_records where id = '60000000-0000-4000-8000-00000000000a'),
  102.5::numeric,
  'a user can update owned current PR state'
);

reset role;

insert into public.personal_records (
  id, user_id, exercise_id, record_type, set_id, workout_id,
  weight_kg, reps, achieved_at
)
values (
  '60000000-0000-4000-8000-00000000000c',
  '00000000-0000-4000-8000-00000000000b',
  '10000000-0000-4000-8000-000000000001', 'max_weight',
  '50000000-0000-4000-8000-00000000000b',
  '30000000-0000-4000-8000-00000000000b', 90, 8,
  '2026-09-11T12:30:00Z'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
update public.personal_records
set weight_kg = 1
where id = '60000000-0000-4000-8000-00000000000c';
reset role;
select is(
  (select weight_kg from public.personal_records where id = '60000000-0000-4000-8000-00000000000c'),
  90::numeric,
  'a user cannot update another user PR state'
);

delete from public.sets where id = '50000000-0000-4000-8000-00000000000a';
select is(
  (
    select count(*) from public.personal_records
    where user_id = '00000000-0000-4000-8000-00000000000a'
  ),
  0::bigint,
  'deleting a source set removes stale current PR state'
);

delete from public.workouts where id = '30000000-0000-4000-8000-00000000000b';
select is(
  (
    select count(*) from public.personal_records
    where user_id = '00000000-0000-4000-8000-00000000000b'
  ),
  0::bigint,
  'deleting a source workout removes stale current PR state'
);

select * from finish();
rollback;
