begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(51);

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

select has_table(
  'public', 'user_exercise_preferences',
  'user_exercise_preferences table exists'
);
select columns_are(
  'public',
  'user_exercise_preferences',
  array[
    'id', 'user_id', 'exercise_id', 'is_favorite', 'notes',
    'rest_duration_seconds', 'created_at', 'updated_at'
  ],
  'preference columns match the canonical cloud contract'
);
select col_type_is(
  'public', 'user_exercise_preferences', 'id', 'uuid',
  'preference ID is a client-generated UUID'
);
select col_type_is(
  'public', 'user_exercise_preferences', 'is_favorite', 'boolean',
  'favorite state is boolean'
);
select col_default_is(
  'public', 'user_exercise_preferences', 'is_favorite', 'false',
  'favorite state defaults to false'
);
select col_is_null(
  'public', 'user_exercise_preferences', 'notes',
  'persistent exercise notes are nullable'
);
select col_is_null(
  'public', 'user_exercise_preferences', 'rest_duration_seconds',
  'rest-duration overrides are nullable'
);
select col_type_is(
  'public', 'user_exercise_preferences', 'rest_duration_seconds', 'integer',
  'rest-duration overrides are integer seconds'
);
select col_is_pk(
  'public', 'user_exercise_preferences', 'id',
  'preference ID is the primary key'
);
select has_index(
  'public', 'user_exercise_preferences',
  'user_exercise_preferences_user_exercise_key',
  'one preference row is allowed per user and exercise'
);
select has_index(
  'public', 'user_exercise_preferences',
  'user_exercise_preferences_user_favorite_updated_idx',
  'favorite discovery index exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_exercise_preferences'::regclass),
  'user exercise preferences have RLS enabled'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public' and tablename = 'user_exercise_preferences'
  ),
  4::bigint,
  'preferences define owner-scoped CRUD policies'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_exercise_preferences'::regclass
      and confrelid = 'auth.users'::regclass
      and confdeltype = 'c'
  ),
  'preferences cascade when their auth user is deleted'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_exercise_preferences'::regclass
      and confrelid = 'public.exercises'::regclass
      and confdeltype = 'c'
  ),
  'preferences cascade when their exercise is deleted'
);
select is(
  (
    select count(*)
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table = 'user_exercise_preferences'
      and trigger_name = 'set_user_exercise_preferences_server_metadata'
      and event_manipulation in ('INSERT', 'UPDATE')
  ),
  2::bigint,
  'preference metadata trigger covers inserts and updates'
);
select has_column('public', 'sets', 'notes', 'sets include notes');
select col_type_is('public', 'sets', 'notes', 'text', 'set notes use text');
select col_is_null('public', 'sets', 'notes', 'set notes are nullable');

insert into auth.users (id)
values
  ('d0000000-0000-4000-8000-00000000000a'),
  ('d0000000-0000-4000-8000-00000000000b'),
  ('d0000000-0000-4000-8000-00000000000c'),
  ('d0000000-0000-4000-8000-00000000000d');

insert into public.exercises (
  id, owner_user_id, name, primary_muscle_group, equipment_type, measurement_type
)
values
  (
    'da000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-00000000000a',
    'Task 13.11 User A Press', 'chest', 'dumbbell', 'weight_reps'
  ),
  (
    'db000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-00000000000b',
    'Task 13.11 User B Row', 'back', 'cable', 'weight_reps'
  ),
  (
    'dc000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-00000000000c',
    'Task 13.11 Cascade User Exercise', 'quads', 'machine', 'weight_reps'
  ),
  (
    'dd000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-00000000000d',
    'Task 13.11 Cascade Exercise', 'core', 'bodyweight', 'reps_only'
  );

insert into public.user_exercise_preferences (
  id, user_id, exercise_id, is_favorite, notes, rest_duration_seconds
)
values
  (
    'db100000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-00000000000b',
    'db000000-0000-4000-8000-000000000001', true, 'User B note', 150
  ),
  (
    'dc100000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-00000000000c',
    'dc000000-0000-4000-8000-000000000001', false, null, null
  ),
  (
    'dd100000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-00000000000d',
    'dd000000-0000-4000-8000-000000000001', false, null, null
  );

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select count(*) from public.user_exercise_preferences),
  0::bigint,
  'anonymous clients cannot read exercise preferences'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub', 'd0000000-0000-4000-8000-00000000000a', true
);

insert into public.user_exercise_preferences (
  id, user_id, exercise_id, is_favorite, notes, rest_duration_seconds,
  created_at, updated_at
)
values (
  'da100000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-00000000000a',
  '10000000-0000-4000-8000-000000000001',
  true, 'Keep shoulders packed', 120, '1900-01-01', '1900-01-01'
);
select ok(
  exists (
    select 1
    from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000001'
      and is_favorite
      and notes = 'Keep shoulders packed'
      and rest_duration_seconds = 120
  ),
  'User A can persist complete preference state for a system exercise'
);
select ok(
  (
    select created_at = updated_at and created_at > '1900-01-01'::timestamptz
    from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000001'
  ),
  'preference insert ignores client-supplied metadata'
);

insert into public.user_exercise_preferences (
  id, user_id, exercise_id, is_favorite, notes
)
values (
  'da100000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-00000000000a',
  'da000000-0000-4000-8000-000000000001', false, ''
);
select is(
  (
    select notes
    from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000002'
  ),
  '',
  'empty preference note text is stored without database normalization'
);
select is(
  (
    select rest_duration_seconds
    from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000002'
  ),
  null,
  'a missing rest override remains null'
);
select is(
  (select count(*) from public.user_exercise_preferences),
  2::bigint,
  'User A reads only User A preferences'
);
select is(
  (
    select count(*)
    from public.user_exercise_preferences
    where id = 'db100000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'User A cannot read User B preference'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.user_exercise_preferences (id, user_id, exercise_id)
    values (
      'da100000-0000-4000-8000-000000000003',
      'd0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001'
    )
  $statement$),
  'the unique user/exercise identity rejects duplicate preference rows'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.user_exercise_preferences (id, user_id, exercise_id)
    values (
      'da100000-0000-4000-8000-000000000004',
      'd0000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000002'
    )
  $statement$),
  'User A cannot insert a preference claiming User B ownership'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.user_exercise_preferences (id, user_id, exercise_id)
    values (
      'da100000-0000-4000-8000-000000000005',
      'd0000000-0000-4000-8000-00000000000a',
      'db000000-0000-4000-8000-000000000001'
    )
  $statement$),
  'User A cannot reference User B private custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.user_exercise_preferences (
      id, user_id, exercise_id, rest_duration_seconds
    ) values (
      'da100000-0000-4000-8000-000000000006',
      'd0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000002', 0
    )
  $statement$),
  'zero-second rest overrides are rejected'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.user_exercise_preferences (
      id, user_id, exercise_id, rest_duration_seconds
    ) values (
      'da100000-0000-4000-8000-000000000007',
      'd0000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000002', -1
    )
  $statement$),
  'negative rest overrides are rejected'
);

create temporary table preference_metadata_before as
select created_at, updated_at
from public.user_exercise_preferences
where id = 'da100000-0000-4000-8000-000000000001';

select pg_sleep(0.01);
update public.user_exercise_preferences
set is_favorite = false,
    notes = null,
    rest_duration_seconds = 90,
    created_at = '1900-01-01',
    updated_at = '1900-01-01'
where id = 'da100000-0000-4000-8000-000000000001';

select ok(
  (
    select not is_favorite and notes is null and rest_duration_seconds = 90
    from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000001'
  ),
  'User A can update favorite, clear notes, and change the rest override'
);
select ok(
  (
    select current.created_at = before.created_at
      and current.updated_at > before.updated_at
    from public.user_exercise_preferences as current
    cross join preference_metadata_before as before
    where current.id = 'da100000-0000-4000-8000-000000000001'
  ),
  'preference updates preserve created_at and advance server updated_at'
);
select is(
  pg_temp.affected_rows($statement$
    update public.user_exercise_preferences
    set notes = 'stolen'
    where id = 'db100000-0000-4000-8000-000000000001'
  $statement$),
  0::bigint,
  'User A cannot update User B preference'
);
select ok(
  pg_temp.statement_fails($statement$
    update public.user_exercise_preferences
    set user_id = 'd0000000-0000-4000-8000-00000000000b'
    where id = 'da100000-0000-4000-8000-000000000001'
  $statement$),
  'User A cannot transfer preference ownership'
);
select is(
  pg_temp.affected_rows($statement$
    delete from public.user_exercise_preferences
    where id = 'db100000-0000-4000-8000-000000000001'
  $statement$),
  0::bigint,
  'User A cannot delete User B preference'
);
select is(
  pg_temp.affected_rows($statement$
    delete from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000002'
  $statement$),
  1::bigint,
  'User A can delete an own preference'
);
select is(
  (
    select count(*)
    from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'own preference deletion removes the row'
);

insert into public.workouts (id, user_id, name, status, started_at)
values (
  'da200000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-00000000000a',
  'Task 13.11 Set Notes Workout', 'completed', '2026-09-14T12:00:00Z'
);
insert into public.workout_exercises (
  id, user_id, workout_id, exercise_id, position
)
values (
  'da210000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-00000000000a',
  'da200000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', 0
);
insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, reps, completed_at
)
values (
  'da220000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-00000000000a',
  'da200000-0000-4000-8000-000000000001',
  'da210000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  0, 'working', 8, '2026-09-14T12:10:00Z'
);
insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, reps, notes, completed_at
)
values (
  'da220000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-00000000000a',
  'da200000-0000-4000-8000-000000000001',
  'da210000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  1, 'working', 10, 'Slow eccentric', '2026-09-14T12:12:00Z'
);
select is(
  (
    select notes from public.sets
    where id = 'da220000-0000-4000-8000-000000000001'
  ),
  null,
  'set inserts without notes remain valid and null'
);
select is(
  (
    select notes from public.sets
    where id = 'da220000-0000-4000-8000-000000000002'
  ),
  'Slow eccentric',
  'set inserts preserve note text'
);
update public.sets
set notes = 'Pause at the bottom'
where id = 'da220000-0000-4000-8000-000000000001';
select is(
  (
    select notes from public.sets
    where id = 'da220000-0000-4000-8000-000000000001'
  ),
  'Pause at the bottom',
  'set notes can be added and changed'
);
update public.sets
set notes = null
where id = 'da220000-0000-4000-8000-000000000001';
select is(
  (
    select notes from public.sets
    where id = 'da220000-0000-4000-8000-000000000001'
  ),
  null,
  'set notes can be cleared'
);
select ok(
  exists (
    select 1
    from public.sets
    where id = 'da220000-0000-4000-8000-000000000002'
      and user_id = 'd0000000-0000-4000-8000-00000000000a'
      and workout_id = 'da200000-0000-4000-8000-000000000001'
      and workout_exercise_id = 'da210000-0000-4000-8000-000000000001'
      and exercise_id = '10000000-0000-4000-8000-000000000001'
  ),
  'set notes preserve existing ownership and ancestry behavior'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub', 'd0000000-0000-4000-8000-00000000000b', true
);

select is(
  (
    select count(*)
    from public.user_exercise_preferences
    where id = 'db100000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'User B reads User B preference'
);
select is(
  (
    select count(*)
    from public.user_exercise_preferences
    where id = 'da100000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'User B cannot read User A preference'
);
select is(
  pg_temp.affected_rows($statement$
    update public.user_exercise_preferences
    set notes = 'User B updated note'
    where id = 'db100000-0000-4000-8000-000000000001'
  $statement$),
  1::bigint,
  'User B can update User B preference'
);

reset role;

delete from auth.users where id = 'd0000000-0000-4000-8000-00000000000c';
select is(
  (
    select count(*)
    from public.user_exercise_preferences
    where id = 'dc100000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'deleting an auth user cascades its preference'
);
delete from public.exercises where id = 'dd000000-0000-4000-8000-000000000001';
select is(
  (
    select count(*)
    from public.user_exercise_preferences
    where id = 'dd100000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'deleting an exercise cascades its preference'
);
select is(
  (
    select notes
    from public.user_exercise_preferences
    where id = 'db100000-0000-4000-8000-000000000001'
  ),
  'User B updated note',
  'rejected User A mutations preserve User B preference'
);
select ok(
  exists (
    select 1
    from public.workouts
    where id = 'da200000-0000-4000-8000-000000000001'
      and notes is null
  ),
  'existing workout notes remain present and nullable'
);
select is(
  (select count(*) from public.user_exercise_preferences),
  2::bigint,
  'only intentional non-cascaded preference fixtures remain'
);

select * from finish();
rollback;
