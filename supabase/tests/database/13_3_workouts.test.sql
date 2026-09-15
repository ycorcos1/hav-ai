begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(54);

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

select has_table('public', 'workouts', 'workouts table exists');
select has_table('public', 'workout_exercises', 'workout_exercises table exists');
select has_table('public', 'sets', 'sets table exists');
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sets'
      and column_name = 'notes'
      and is_nullable = 'YES'
  ),
  'sets include the nullable notes field added by Task 13.11'
);
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_exercises'
      and column_name = 'source_recommendation_id'
      and is_nullable = 'YES'
  ),
  'workout exercises include a nullable recommendation snapshot source'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workout_exercises'::regclass
      and confrelid::regclass::text = 'progression_recommendations'
      and confdeltype = 'n'
  ),
  'recommendation snapshot foreign key is completed after its table exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.workouts'::regclass),
  'workouts has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.workout_exercises'::regclass),
  'workout_exercises has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.sets'::regclass),
  'sets has RLS enabled'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'workouts'),
  4::bigint,
  'workouts defines owned CRUD policies'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'workout_exercises'),
  4::bigint,
  'workout_exercises defines parent-protected CRUD policies'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'sets'),
  4::bigint,
  'sets defines graph-protected CRUD policies'
);
select has_index('public', 'workouts', 'workouts_user_completed_at_idx', 'workout history index exists');
select has_index('public', 'workouts', 'workouts_user_started_at_idx', 'workout start index exists');
select has_index('public', 'workouts', 'workouts_user_status_idx', 'workout status index exists');
select has_index(
  'public', 'workout_exercises', 'workout_exercises_workout_position_key',
  'workout exercise positions are unique'
);
select has_index(
  'public', 'workout_exercises', 'workout_exercises_user_exercise_idx',
  'workout exercise history index exists'
);
select has_index('public', 'sets', 'sets_workout_id_idx', 'set workout index exists');
select has_index(
  'public', 'sets', 'sets_workout_exercise_position_key',
  'set positions are unique per workout exercise'
);
select has_index(
  'public', 'sets', 'sets_user_exercise_completed_at_idx',
  'set exercise history index exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'workout_exercises_owned_workout_fkey'
      and conrelid = 'public.workout_exercises'::regclass
      and confdeltype = 'c'
  ),
  'workout exercise ownership is enforced by a cascading composite foreign key'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'sets_owned_workout_fkey'
      and conrelid = 'public.sets'::regclass
      and confdeltype = 'c'
  ),
  'set ownership is enforced against its workout'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'sets_workout_exercise_identity_fkey'
      and conrelid = 'public.sets'::regclass
      and confdeltype = 'c'
  ),
  'set workout and exercise identity are enforced against its workout exercise'
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

insert into public.workout_templates (id, user_id, name)
values
  (
    '30000000-0000-4000-8000-00000000000a',
    '00000000-0000-4000-8000-00000000000a', 'User A Push'
  ),
  (
    '30000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-00000000000b', 'User B Push'
  );

insert into public.workouts (id, user_id, name, status, started_at)
values (
  '40000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000b',
  'User B Workout', 'active', '2026-09-11T12:00:00Z'
);

insert into public.workout_exercises (
  id, user_id, workout_id, exercise_id, position
)
values (
  '50000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000b',
  '40000000-0000-4000-8000-00000000000b',
  'f1000000-0000-4000-8000-000000000001', 0
);

select ok(
  pg_temp.statement_fails($statement$
    insert into public.workouts (id, user_id, name, status, started_at)
    values (
      '40000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000a',
      'Invalid', 'paused', '2026-09-11T12:00:00Z'
    )
  $statement$),
  'database rejects an invalid workout status'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position, target_sets
    ) values (
      '50000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001', -1, 3
    )
  $statement$),
  'database rejects a negative workout exercise position'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position, target_sets
    ) values (
      '50000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001', 1, 0
    )
  $statement$),
  'database rejects nonpositive target sets'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position,
      target_min_reps, target_max_reps
    ) values (
      '50000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001', 1, 10, 8
    )
  $statement$),
  'database rejects an inverted target rep range'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (
      id, user_id, workout_id, exercise_id, position, target_weight_kg
    ) values (
      '50000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001', 1, -1
    )
  $statement$),
  'database rejects a negative target weight'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);

insert into public.workouts (
  id, user_id, source_template_id, name, status, started_at, notes
)
values (
  '40000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000000a',
  'Push Snapshot', 'active', '2026-09-11T13:00:00Z', 'Workout note'
);
select ok(
  exists (
    select 1 from public.workouts
    where id = '40000000-0000-4000-8000-00000000000a'
      and name = 'Push Snapshot'
  ),
  'a user can create and read an owned workout snapshot'
);
select is((select count(*) from public.workouts), 1::bigint, 'a user sees only owned workouts');
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workouts (id, user_id, source_template_id, name, status, started_at)
    values (
      '40000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000000b',
      'Foreign Template', 'active', '2026-09-11T13:00:00Z'
    )
  $statement$),
  'a user cannot snapshot another user template'
);

update public.workouts
set status = 'completed', completed_at = '2026-09-11T14:00:00Z'
where id = '40000000-0000-4000-8000-00000000000a';
select is(
  (select status from public.workouts where id = '40000000-0000-4000-8000-00000000000a'),
  'completed',
  'a user can update an owned workout'
);
update public.workouts
set name = 'Attacker update'
where id = '40000000-0000-4000-8000-00000000000b';

insert into public.workout_exercises (
  id, user_id, workout_id, exercise_id, position,
  target_sets, target_min_reps, target_max_reps, target_weight_kg, notes
)
values (
  '50000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001', 0, 3, 6, 8, 83.9146,
  'Snapshot configuration'
);
select ok(
  exists (
    select 1 from public.workout_exercises
    where id = '50000000-0000-4000-8000-00000000000a'
      and position = 0 and target_weight_kg = 83.9146
  ),
  'an owned workout accepts a system exercise snapshot'
);
insert into public.workout_exercises (
  id, user_id, workout_id, exercise_id, position
)
values (
  '50000000-0000-4000-8000-00000000000c',
  '00000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000000a', 1
);
select ok(
  exists (
    select 1 from public.workout_exercises
    where id = '50000000-0000-4000-8000-00000000000c'
  ),
  'an owned workout accepts an owned custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position)
    values (
      '50000000-0000-4000-8000-00000000000d',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001', 1
    )
  $statement$),
  'a user cannot add an exercise to another user workout'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position)
    values (
      '50000000-0000-4000-8000-00000000000e',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000b', 2
    )
  $statement$),
  'a user cannot add another user custom exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position)
    values (
      '50000000-0000-4000-8000-00000000000f',
      '00000000-0000-4000-8000-00000000000b',
      '40000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001', 2
    )
  $statement$),
  'a child user ID cannot diverge from the workout owner'
);

insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, weight_kg, reps, rpe, completed_at
)
values (
  '60000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  '50000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001',
  0, 'working', 83.9146, 8, 8.5, '2026-09-11T13:10:00Z'
);
select ok(
  exists (
    select 1 from public.sets
    where id = '60000000-0000-4000-8000-00000000000a'
      and reps = 8 and rpe = 8.5
  ),
  'a valid owned working set succeeds'
);
insert into public.sets (
  id, user_id, workout_id, workout_exercise_id, exercise_id,
  position, set_type, reps, completed_at
)
values (
  '60000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-00000000000a',
  '40000000-0000-4000-8000-00000000000a',
  '50000000-0000-4000-8000-00000000000a',
  'f1000000-0000-4000-8000-000000000001',
  1, 'warmup', 10, '2026-09-11T13:05:00Z'
);
select ok(
  exists (
    select 1 from public.sets
    where id = '60000000-0000-4000-8000-00000000000b'
      and set_type = 'warmup' and weight_kg is null
  ),
  'warm-up and bodyweight-compatible nullable weight semantics are preserved'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000b',
      '50000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001',
      0, 'working', 8, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'a user cannot add a set to another user workout graph'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000000b',
      'f1000000-0000-4000-8000-000000000001',
      2, 'working', 8, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'a user cannot reference another user workout exercise'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000b',
      '50000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      2, 'working', 8, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'database rejects mismatched workout and workout exercise ancestry'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000000a',
      2, 'working', 8, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'database rejects a set exercise mismatch'
);

select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      -1, 'working', 8, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'database rejects a negative set position'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      2, 'working', -1, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'database rejects negative reps'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, rpe, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000007',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      2, 'working', 8, 5.5, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'database rejects RPE below the canonical range'
);
select ok(
  pg_temp.statement_fails($statement$
    insert into public.sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id,
      position, set_type, reps, completed_at
    ) values (
      '60000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-00000000000a',
      '40000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000000a',
      'f1000000-0000-4000-8000-000000000001',
      2, 'drop', 8, '2026-09-11T13:10:00Z'
    )
  $statement$),
  'database rejects an unsupported set type'
);

delete from public.sets where id = '60000000-0000-4000-8000-00000000000b';
select is(
  (select count(*) from public.sets where id = '60000000-0000-4000-8000-00000000000b'),
  0::bigint,
  'a user can delete an owned set'
);

reset role;

select is(
  (select name from public.workouts where id = '40000000-0000-4000-8000-00000000000b'),
  'User B Workout',
  'a user cannot update another user workout'
);
select ok(
  pg_temp.statement_fails($statement$
    delete from public.exercises
    where id = 'f1000000-0000-4000-8000-000000000001'
  $statement$),
  'referenced exercises cannot be deleted'
);

delete from public.workout_templates
where id = '30000000-0000-4000-8000-00000000000a';
select ok(
  exists (
    select 1 from public.workouts
    where id = '40000000-0000-4000-8000-00000000000a'
      and source_template_id is null
  ),
  'template deletion nulls the source while preserving workout history'
);

delete from public.workouts
where id = '40000000-0000-4000-8000-00000000000a';
select is(
  (select count(*) from public.workout_exercises where workout_id = '40000000-0000-4000-8000-00000000000a'),
  0::bigint,
  'workout deletion cascades workout exercises'
);
select is(
  (select count(*) from public.sets where workout_id = '40000000-0000-4000-8000-00000000000a'),
  0::bigint,
  'workout deletion cascades sets'
);

delete from auth.users where id = '00000000-0000-4000-8000-00000000000b';
select is(
  (select count(*) from public.workouts where user_id = '00000000-0000-4000-8000-00000000000b'),
  0::bigint,
  'auth user deletion cascades owned workouts'
);

select * from finish();
rollback;
