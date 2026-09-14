begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(39);

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

select has_table('public', 'exercises', 'exercises table exists');
select has_table(
  'public',
  'exercise_secondary_muscles',
  'exercise_secondary_muscles table exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.exercises'::regclass),
  'exercises has RLS enabled'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.exercise_secondary_muscles'::regclass
  ),
  'exercise_secondary_muscles has RLS enabled'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.exercises'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
      and confdeltype = 'c'
  ),
  'exercise owners cascade when an auth user is deleted'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.exercise_secondary_muscles'::regclass
      and contype = 'f'
      and confrelid = 'public.exercises'::regclass
      and confdeltype = 'c'
  ),
  'secondary muscles cascade when an exercise is deleted'
);
select has_index(
  'public',
  'exercises',
  'exercises_owner_user_id_idx',
  'exercise owner index exists'
);
select has_index('public', 'exercises', 'exercises_name_idx', 'exercise name index exists');
select has_index(
  'public',
  'exercises',
  'exercises_system_archived_idx',
  'exercise system/archive index exists'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'exercises'
      and indexname = 'exercises_system_name_unique_idx'
      and indexdef like 'CREATE UNIQUE INDEX%'
  ),
  'system exercise names have a partial unique index'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'exercises'),
  3::bigint,
  'exercises defines select, insert, and update policies'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public' and tablename = 'exercise_secondary_muscles'
  ),
  4::bigint,
  'secondary muscles defines parent-derived CRUD policies'
);

insert into auth.users (id)
values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

insert into public.exercises (
  id,
  name,
  primary_muscle_group,
  equipment_type,
  measurement_type,
  is_system
)
values (
  'f1000000-0000-4000-8000-000000000001',
  'Test System Bench Press',
  'chest',
  'barbell',
  'weight_reps',
  true
);

insert into public.exercises (
  id,
  owner_user_id,
  name,
  primary_muscle_group,
  equipment_type,
  measurement_type
)
values (
  '20000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000b',
  'User B Press',
  'chest',
  'machine',
  'weight_reps'
);

insert into public.exercise_secondary_muscles (exercise_id, muscle_group)
values
  ('f1000000-0000-4000-8000-000000000001', 'triceps'),
  ('20000000-0000-4000-8000-00000000000b', 'triceps');

select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, owner_user_id, name, primary_muscle_group, equipment_type,
      measurement_type, is_system
    ) values (
      '30000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000a',
      'Invalid Owned System Exercise', 'chest', 'barbell', 'weight_reps', true
    )
  $statement$),
  'database rejects a system exercise with an owner'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, name, primary_muscle_group, equipment_type, measurement_type
    ) values (
      '30000000-0000-4000-8000-000000000002',
      'Invalid Ownerless Custom Exercise', 'chest', 'barbell', 'weight_reps'
    )
  $statement$),
  'database rejects an ownerless custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, name, primary_muscle_group, equipment_type, measurement_type, is_system
    ) values (
      '30000000-0000-4000-8000-000000000003',
      'Invalid Muscle Exercise', 'invalid', 'barbell', 'weight_reps', true
    )
  $statement$),
  'database rejects an invalid primary muscle group'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, name, primary_muscle_group, equipment_type, measurement_type, is_system
    ) values (
      '30000000-0000-4000-8000-000000000004',
      'Invalid Equipment Exercise', 'chest', 'invalid', 'weight_reps', true
    )
  $statement$),
  'database rejects an invalid equipment type'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, name, primary_muscle_group, equipment_type, measurement_type, is_system
    ) values (
      '30000000-0000-4000-8000-000000000005',
      'Invalid Measurement Exercise', 'chest', 'barbell', 'duration', true
    )
  $statement$),
  'database rejects an unsupported measurement type'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercise_secondary_muscles (exercise_id, muscle_group)
    values ('f1000000-0000-4000-8000-000000000001', 'invalid')
  $statement$),
  'database rejects an invalid secondary muscle group'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, name, primary_muscle_group, equipment_type, measurement_type, is_system
    ) values (
      '30000000-0000-4000-8000-000000000006',
      'test system bench press', 'chest', 'barbell', 'weight_reps', true
    )
  $statement$),
  'system exercise names are unique without case sensitivity'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

insert into public.exercises (
  id,
  owner_user_id,
  name,
  primary_muscle_group,
  equipment_type,
  measurement_type
)
values (
  '20000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  'User A Row',
  'back',
  'cable',
  'weight_reps'
);

select ok(
  exists (
    select 1
    from public.exercises
    where id = '20000000-0000-4000-8000-00000000000a'
  ),
  'a user can insert an owned custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, name, primary_muscle_group, equipment_type, measurement_type, is_system
    ) values (
      '30000000-0000-4000-8000-000000000007',
      'Impersonated System Exercise', 'back', 'cable', 'weight_reps', true
    )
  $statement$),
  'an authenticated user cannot create a system exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercises (
      id, owner_user_id, name, primary_muscle_group, equipment_type, measurement_type
    ) values (
      '30000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-00000000000b',
      'Cross-owned Exercise', 'back', 'cable', 'weight_reps'
    )
  $statement$),
  'a user cannot create a custom exercise for another user'
);
select is(
  (
    select count(*)
    from public.exercises
    where id in (
      'f1000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-00000000000a'
    )
  ),
  2::bigint,
  'a user sees the system and owned fixture exercises'
);
select ok(
  exists (
    select 1 from public.exercises where id = 'f1000000-0000-4000-8000-000000000001'
  ),
  'a user can read a system exercise'
);
select ok(
  exists (
    select 1 from public.exercises where id = '20000000-0000-4000-8000-00000000000a'
  ),
  'a user can read an owned custom exercise'
);
select is(
  (
    select count(*)
    from public.exercises
    where id = '20000000-0000-4000-8000-00000000000b'
  ),
  0::bigint,
  'a user cannot read another user custom exercise'
);

update public.exercises
set is_archived = true
where id = '20000000-0000-4000-8000-00000000000a';
select is(
  (
    select is_archived
    from public.exercises
    where id = '20000000-0000-4000-8000-00000000000a'
  ),
  true,
  'a user can archive an owned custom exercise'
);

update public.exercises
set is_archived = true
where id in (
  'f1000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-00000000000b'
);
delete from public.exercises
where id in (
  '20000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000000b'
);

select is(
  (
    select count(*)
    from public.exercise_secondary_muscles
    where exercise_id = 'f1000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'a user can read system exercise secondary muscles'
);

insert into public.exercise_secondary_muscles (exercise_id, muscle_group)
values ('20000000-0000-4000-8000-00000000000a', 'biceps');
select ok(
  exists (
    select 1
    from public.exercise_secondary_muscles
    where exercise_id = '20000000-0000-4000-8000-00000000000a'
      and muscle_group = 'biceps'
  ),
  'a user can create a secondary muscle for an owned custom exercise'
);

update public.exercise_secondary_muscles
set muscle_group = 'forearms'
where exercise_id = '20000000-0000-4000-8000-00000000000a'
  and muscle_group = 'biceps';
select ok(
  exists (
    select 1
    from public.exercise_secondary_muscles
    where exercise_id = '20000000-0000-4000-8000-00000000000a'
      and muscle_group = 'forearms'
  ),
  'a user can update a secondary muscle for an owned custom exercise'
);

delete from public.exercise_secondary_muscles
where exercise_id = '20000000-0000-4000-8000-00000000000a'
  and muscle_group = 'forearms';
select is(
  (
    select count(*)
    from public.exercise_secondary_muscles
    where exercise_id = '20000000-0000-4000-8000-00000000000a'
  ),
  0::bigint,
  'a user can delete a secondary muscle for an owned custom exercise'
);

select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercise_secondary_muscles (exercise_id, muscle_group)
    values ('20000000-0000-4000-8000-00000000000b', 'biceps')
  $statement$),
  'a user cannot add a secondary muscle to another user custom exercise'
);

update public.exercise_secondary_muscles
set muscle_group = 'biceps'
where exercise_id = '20000000-0000-4000-8000-00000000000b';
delete from public.exercise_secondary_muscles
where exercise_id = '20000000-0000-4000-8000-00000000000b';

reset role;

select is(
  (
    select is_archived
    from public.exercises
    where id = 'f1000000-0000-4000-8000-000000000001'
  ),
  false,
  'a user cannot update or archive a system exercise'
);
select is(
  (
    select is_archived
    from public.exercises
    where id = '20000000-0000-4000-8000-00000000000b'
  ),
  false,
  'a user cannot update another user custom exercise'
);
select ok(
  exists (
    select 1
    from public.exercises
    where id = '20000000-0000-4000-8000-00000000000a'
  ),
  'a user cannot hard-delete an owned custom exercise'
);
select ok(
  exists (
    select 1
    from public.exercises
    where id = '20000000-0000-4000-8000-00000000000b'
  ),
  'a user cannot delete another user custom exercise'
);
select ok(
  exists (
    select 1
    from public.exercise_secondary_muscles
    where exercise_id = '20000000-0000-4000-8000-00000000000b'
      and muscle_group = 'triceps'
  ),
  'another user cannot update or delete private secondary muscles'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.exercise_secondary_muscles (exercise_id, muscle_group)
    values ('f1000000-0000-4000-8000-000000000001', 'triceps')
  $statement$),
  'duplicate secondary muscle relationships are rejected'
);

insert into public.exercises (
  id,
  owner_user_id,
  name,
  primary_muscle_group,
  equipment_type,
  measurement_type
)
values (
  '20000000-0000-4000-8000-00000000000c',
  '00000000-0000-4000-8000-00000000000a',
  'Cascade Exercise',
  'back',
  'cable',
  'weight_reps'
);
insert into public.exercise_secondary_muscles (exercise_id, muscle_group)
values ('20000000-0000-4000-8000-00000000000c', 'biceps');
delete from public.exercises where id = '20000000-0000-4000-8000-00000000000c';
select is(
  (
    select count(*)
    from public.exercise_secondary_muscles
    where exercise_id = '20000000-0000-4000-8000-00000000000c'
  ),
  0::bigint,
  'deleting an exercise cascades its secondary muscles'
);

select * from finish();
rollback;
