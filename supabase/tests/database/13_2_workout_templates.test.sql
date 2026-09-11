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

select has_table('public', 'workout_templates', 'workout_templates table exists');
select has_table(
  'public',
  'workout_template_exercises',
  'workout_template_exercises table exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.workout_templates'::regclass),
  'workout_templates has RLS enabled'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.workout_template_exercises'::regclass
  ),
  'workout_template_exercises has RLS enabled'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workout_templates'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
      and confdeltype = 'c'
  ),
  'template owners cascade when an auth user is deleted'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workout_template_exercises'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
      and confdeltype = 'c'
  ),
  'template exercise owners cascade when an auth user is deleted'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workout_template_exercises'::regclass
      and contype = 'f'
      and confrelid = 'public.workout_templates'::regclass
      and confdeltype = 'c'
  ),
  'template exercises cascade when their template is deleted'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workout_template_exercises'::regclass
      and contype = 'f'
      and confrelid = 'public.exercises'::regclass
      and confdeltype = 'r'
  ),
  'exercise deletion is restricted while a template references it'
);
select has_index(
  'public',
  'workout_templates',
  'workout_templates_user_updated_at_idx',
  'template user/update index exists'
);
select has_index(
  'public',
  'workout_templates',
  'workout_templates_user_archived_idx',
  'template user/archive index exists'
);
select has_index(
  'public',
  'workout_template_exercises',
  'workout_template_exercises_template_position_key',
  'template exercise position uniqueness index exists'
);
select has_index(
  'public',
  'workout_template_exercises',
  'workout_template_exercises_exercise_id_idx',
  'template exercise reference index exists'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public' and tablename = 'workout_templates'
  ),
  3::bigint,
  'workout_templates defines select, insert, and update policies'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public' and tablename = 'workout_template_exercises'
  ),
  4::bigint,
  'workout_template_exercises defines parent-protected CRUD policies'
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
  '10000000-0000-4000-8000-000000000001',
  'Barbell Bench Press',
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
values
  (
    '20000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a',
    'User A Row',
    'back',
    'cable',
    'weight_reps'
  ),
  (
    '20000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b',
    'User B Press',
    'chest',
    'machine',
    'weight_reps'
  );

insert into public.workout_templates (id, user_id, name)
values (
  '40000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000b',
  'User B Template'
);

select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000001',
      -1, 3, 8, 10
    )
  $statement$),
  'database rejects a negative template exercise position'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000001',
      0, 0, 8, 10
    )
  $statement$),
  'database rejects a nonpositive target set count'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000001',
      0, 3, 0, 10
    )
  $statement$),
  'database rejects a nonpositive minimum rep target'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000001',
      0, 3, 10, 8
    )
  $statement$),
  'database rejects an inverted rep range'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

insert into public.workout_templates (id, user_id, name, notes)
values (
  '40000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  'Push',
  'Template note'
);
select ok(
  exists (
    select 1
    from public.workout_templates
    where id = '40000000-0000-4000-8000-00000000000a'
  ),
  'a user can create and read an owned template'
);
select is(
  (select count(*) from public.workout_templates),
  1::bigint,
  'a user sees only owned templates'
);
select is(
  (
    select count(*)
    from public.workout_templates
    where id = '40000000-0000-4000-8000-00000000000b'
  ),
  0::bigint,
  'a user cannot read another user template'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_templates (id, user_id, name)
    values (
      '40000000-0000-4000-8000-00000000000c',
      '00000000-0000-4000-8000-00000000000b',
      'Cross-owned Template'
    )
  $statement$),
  'a user cannot create a template for another user'
);

update public.workout_templates
set is_archived = true
where id = '40000000-0000-4000-8000-00000000000a';
select is(
  (
    select is_archived
    from public.workout_templates
    where id = '40000000-0000-4000-8000-00000000000a'
  ),
  true,
  'a user can update and archive an owned template'
);

update public.workout_templates
set is_archived = true
where id = '40000000-0000-4000-8000-00000000000b';
delete from public.workout_templates
where id = '40000000-0000-4000-8000-00000000000a';

insert into public.workout_template_exercises (
  id,
  user_id,
  template_id,
  exercise_id,
  position,
  target_sets,
  target_min_reps,
  target_max_reps
)
values (
  '50000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  '10000000-0000-4000-8000-000000000001',
  0,
  3,
  6,
  8
);
select ok(
  exists (
    select 1
    from public.workout_template_exercises
    where id = '50000000-0000-4000-8000-00000000000a'
      and position = 0
  ),
  'a user can add a system exercise with 0-based ordering'
);

insert into public.workout_template_exercises (
  id,
  user_id,
  template_id,
  exercise_id,
  position,
  target_sets,
  target_min_reps,
  target_max_reps
)
values (
  '50000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000000a',
  1,
  3,
  8,
  10
);
select ok(
  exists (
    select 1
    from public.workout_template_exercises
    where id = '50000000-0000-4000-8000-00000000000b'
  ),
  'a user can add an owned custom exercise'
);

select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-00000000000c',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000b',
      2, 3, 8, 10
    )
  $statement$),
  'a user cannot add another user custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-00000000000d',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000b',
      '10000000-0000-4000-8000-000000000001',
      0, 3, 8, 10
    )
  $statement$),
  'a user cannot add an exercise to another user template'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-00000000000e',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001',
      2, 3, 8, 10
    )
  $statement$),
  'a child user ID cannot impersonate another owner'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_template_exercises (
      id, user_id, template_id, exercise_id, position,
      target_sets, target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-00000000000f',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '10000000-0000-4000-8000-000000000001',
      0, 3, 8, 10
    )
  $statement$),
  'duplicate template positions are rejected'
);

select ok(
  pg_temp.statement_fails($statement$
    update public.workout_template_exercises
    set exercise_id = '20000000-0000-4000-8000-00000000000b'
    where id = '50000000-0000-4000-8000-00000000000a'
  $statement$),
  'a child cannot be updated to reference another user exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    update public.workout_template_exercises
    set template_id = '40000000-0000-4000-8000-00000000000b'
    where id = '50000000-0000-4000-8000-00000000000a'
  $statement$),
  'a child cannot be moved to another user template'
);

delete from public.workout_template_exercises
where id = '50000000-0000-4000-8000-00000000000b';
select is(
  (
    select count(*)
    from public.workout_template_exercises
    where id = '50000000-0000-4000-8000-00000000000b'
  ),
  0::bigint,
  'a user can remove an exercise from an owned template'
);

reset role;

select is(
  (
    select is_archived
    from public.workout_templates
    where id = '40000000-0000-4000-8000-00000000000b'
  ),
  false,
  'a user cannot update another user template'
);
select ok(
  exists (
    select 1
    from public.workout_templates
    where id = '40000000-0000-4000-8000-00000000000a'
  ),
  'a user cannot hard-delete an owned template'
);
select ok(
  pg_temp.statement_fails($statement$
    delete from public.exercises
    where id = '10000000-0000-4000-8000-000000000001'
  $statement$),
  'an exercise referenced by a template cannot be deleted'
);

delete from public.workout_templates
where id = '40000000-0000-4000-8000-00000000000a';
select is(
  (
    select count(*)
    from public.workout_template_exercises
    where template_id = '40000000-0000-4000-8000-00000000000a'
  ),
  0::bigint,
  'deleting a template cascades its exercise rows'
);

select * from finish();
rollback;
