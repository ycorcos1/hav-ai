begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(15);

select is(
  (select count(*) from public.exercises where is_system),
  60::bigint,
  'the deterministic seed contains 60 system exercises'
);
select ok(
  (select count(*) from public.exercises where is_system) between 50 and 100,
  'the system exercise catalog is within the canonical size range'
);
select is(
  (
    select count(*) from public.exercises
    where is_system and owner_user_id is null
  ),
  60::bigint,
  'every seeded system exercise uses the canonical ownership model'
);
select is(
  (
    select count(*) from public.exercises
    where is_system and not is_archived
  ),
  60::bigint,
  'seeded system exercises are active'
);
select is(
  (
    select count(*)
    from (
      select lower(name)
      from public.exercises
      where is_system
      group by lower(name)
      having count(*) > 1
    ) as duplicate_names
  ),
  0::bigint,
  'system exercise names are unique case-insensitively'
);
select is(
  (
    select count(*) from public.exercises
    where is_system
      and primary_muscle_group in (
        'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
        'hamstrings', 'glutes', 'calves', 'core', 'forearms',
        'full_body', 'other'
      )
      and equipment_type in (
        'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight',
        'smith_machine', 'plate_loaded', 'kettlebell', 'band', 'other'
      )
      and measurement_type in ('weight_reps', 'bodyweight_reps', 'reps_only')
  ),
  60::bigint,
  'all seed enum values match the canonical exercise contract'
);
select is(
  (
    select count(distinct primary_muscle_group)
    from public.exercises
    where is_system
      and primary_muscle_group in (
        'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
        'hamstrings', 'glutes', 'calves', 'core', 'forearms'
      )
  ),
  11::bigint,
  'the catalog covers every major gym muscle group'
);

with expected_fixture (id, name, primary_muscle_group, equipment_type, measurement_type) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'Barbell Bench Press', 'chest', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'Incline Dumbbell Press', 'chest', 'dumbbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'Cable Fly', 'chest', 'cable', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'Barbell Back Squat', 'quads', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'Romanian Deadlift', 'hamstrings', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'Leg Press', 'quads', 'machine', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000007'::uuid, 'Walking Lunge', 'glutes', 'dumbbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000008'::uuid, 'Barbell Deadlift', 'back', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000009'::uuid, 'Lat Pulldown', 'back', 'cable', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000010'::uuid, 'Seated Cable Row', 'back', 'cable', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000011'::uuid, 'Overhead Press', 'shoulders', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000012'::uuid, 'Dumbbell Lateral Raise', 'shoulders', 'dumbbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000013'::uuid, 'Barbell Curl', 'biceps', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000014'::uuid, 'Cable Tricep Pushdown', 'triceps', 'cable', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000015'::uuid, 'Parallel Bar Dip', 'triceps', 'bodyweight', 'bodyweight_reps'),
    ('10000000-0000-4000-8000-000000000016'::uuid, 'Standing Calf Raise', 'calves', 'machine', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000017'::uuid, 'Hanging Knee Raise', 'core', 'bodyweight', 'bodyweight_reps'),
    ('10000000-0000-4000-8000-000000000018'::uuid, 'Plank', 'core', 'bodyweight', 'reps_only'),
    ('10000000-0000-4000-8000-000000000019'::uuid, 'Face Pull', 'shoulders', 'cable', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000020'::uuid, 'Goblet Squat', 'quads', 'kettlebell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000021'::uuid, 'Hip Thrust', 'glutes', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000022'::uuid, 'Incline Dumbbell Curl', 'biceps', 'dumbbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000023'::uuid, 'Close-Grip Bench Press', 'triceps', 'barbell', 'weight_reps'),
    ('10000000-0000-4000-8000-000000000024'::uuid, 'Push-Up', 'chest', 'bodyweight', 'bodyweight_reps')
)
select is(
  (
    select count(*)
    from expected_fixture
    join public.exercises using (
      id, name, primary_muscle_group, equipment_type, measurement_type
    )
    where exercises.is_system
      and exercises.owner_user_id is null
      and not exercises.is_archived
  ),
  24::bigint,
  'all 24 development fixture identities and canonical fields are preserved'
);

with expected_secondary (exercise_id, muscle_group) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'shoulders'),
    ('10000000-0000-4000-8000-000000000001'::uuid, 'triceps'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'shoulders'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'triceps'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'glutes'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'hamstrings'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'back'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'glutes'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'glutes'),
    ('10000000-0000-4000-8000-000000000007'::uuid, 'hamstrings'),
    ('10000000-0000-4000-8000-000000000007'::uuid, 'quads'),
    ('10000000-0000-4000-8000-000000000008'::uuid, 'glutes'),
    ('10000000-0000-4000-8000-000000000008'::uuid, 'hamstrings'),
    ('10000000-0000-4000-8000-000000000009'::uuid, 'biceps'),
    ('10000000-0000-4000-8000-000000000010'::uuid, 'biceps'),
    ('10000000-0000-4000-8000-000000000011'::uuid, 'triceps'),
    ('10000000-0000-4000-8000-000000000013'::uuid, 'forearms'),
    ('10000000-0000-4000-8000-000000000015'::uuid, 'chest'),
    ('10000000-0000-4000-8000-000000000015'::uuid, 'shoulders'),
    ('10000000-0000-4000-8000-000000000019'::uuid, 'back'),
    ('10000000-0000-4000-8000-000000000020'::uuid, 'glutes'),
    ('10000000-0000-4000-8000-000000000021'::uuid, 'hamstrings'),
    ('10000000-0000-4000-8000-000000000022'::uuid, 'forearms'),
    ('10000000-0000-4000-8000-000000000023'::uuid, 'chest'),
    ('10000000-0000-4000-8000-000000000023'::uuid, 'shoulders'),
    ('10000000-0000-4000-8000-000000000024'::uuid, 'shoulders'),
    ('10000000-0000-4000-8000-000000000024'::uuid, 'triceps')
)
select is(
  (
    select count(*)
    from expected_secondary
    join public.exercise_secondary_muscles using (exercise_id, muscle_group)
  ),
  27::bigint,
  'the development fixture secondary-muscle relationships are preserved'
);
select is(
  (
    select count(*) from public.exercise_secondary_muscles
    where exercise_id between
      '10000000-0000-4000-8000-000000000001'::uuid and
      '10000000-0000-4000-8000-000000000024'::uuid
  ),
  27::bigint,
  'the original fixture has no unexpected secondary-muscle relationships'
);
select is(
  (select count(*) from public.exercise_secondary_muscles),
  55::bigint,
  'the seed contains 55 deliberate secondary-muscle relationships'
);
select is(
  (
    select count(*)
    from public.exercise_secondary_muscles
    join public.exercises on exercises.id = exercise_secondary_muscles.exercise_id
    where exercises.is_system and exercises.owner_user_id is null
  ),
  55::bigint,
  'every secondary-muscle row belongs to a seeded system exercise'
);
select is(
  (
    select count(*)
    from (
      select exercise_id, muscle_group
      from public.exercise_secondary_muscles
      group by exercise_id, muscle_group
      having count(*) > 1
    ) as duplicate_secondary
  ),
  0::bigint,
  'secondary-muscle relationships contain no duplicates'
);
select is(
  (
    select
      (select count(*) from public.profiles)
      + (select count(*) from public.workout_templates)
      + (select count(*) from public.workout_template_exercises)
      + (select count(*) from public.workouts)
      + (select count(*) from public.workout_exercises)
      + (select count(*) from public.sets)
      + (select count(*) from public.progression_recommendations)
      + (select count(*) from public.personal_records)
  ),
  0::bigint,
  'the seed creates no fake user or workout-domain data'
);

select is(
  (select count(*) from public.exercises where not is_system),
  0::bigint,
  'the system seed creates no custom exercises'
);

select * from finish();
rollback;
