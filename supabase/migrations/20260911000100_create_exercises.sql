create table public.exercises (
  id uuid primary key,
  owner_user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  primary_muscle_group text not null
    constraint exercises_primary_muscle_group_check check (
      primary_muscle_group in (
        'chest',
        'back',
        'shoulders',
        'biceps',
        'triceps',
        'quads',
        'hamstrings',
        'glutes',
        'calves',
        'core',
        'forearms',
        'full_body',
        'other'
      )
    ),
  equipment_type text not null
    constraint exercises_equipment_type_check check (
      equipment_type in (
        'barbell',
        'dumbbell',
        'machine',
        'cable',
        'bodyweight',
        'smith_machine',
        'plate_loaded',
        'kettlebell',
        'band',
        'other'
      )
    ),
  measurement_type text not null
    constraint exercises_measurement_type_check check (
      measurement_type in ('weight_reps', 'bodyweight_reps', 'reps_only')
    ),
  is_system boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_ownership_check check (
    (is_system and owner_user_id is null)
    or (not is_system and owner_user_id is not null)
  )
);

create table public.exercise_secondary_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle_group text not null
    constraint exercise_secondary_muscles_muscle_group_check check (
      muscle_group in (
        'chest',
        'back',
        'shoulders',
        'biceps',
        'triceps',
        'quads',
        'hamstrings',
        'glutes',
        'calves',
        'core',
        'forearms',
        'full_body',
        'other'
      )
    ),
  primary key (exercise_id, muscle_group)
);

create index exercises_owner_user_id_idx on public.exercises (owner_user_id);
create index exercises_name_idx on public.exercises (name);
create index exercises_system_archived_idx on public.exercises (is_system, is_archived);
create unique index exercises_system_name_unique_idx
  on public.exercises (lower(name))
  where is_system;

alter table public.exercises enable row level security;
alter table public.exercise_secondary_muscles enable row level security;

create policy "Authenticated users can read accessible exercises"
on public.exercises
for select
to authenticated
using (is_system or owner_user_id = (select auth.uid()));

create policy "Users can create their own custom exercises"
on public.exercises
for insert
to authenticated
with check (not is_system and owner_user_id = (select auth.uid()));

create policy "Users can update their own custom exercises"
on public.exercises
for update
to authenticated
using (not is_system and owner_user_id = (select auth.uid()))
with check (not is_system and owner_user_id = (select auth.uid()));

create policy "Authenticated users can read accessible secondary muscles"
on public.exercise_secondary_muscles
for select
to authenticated
using (
  exists (
    select 1
    from public.exercises
    where exercises.id = exercise_secondary_muscles.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can create secondary muscles for their custom exercises"
on public.exercise_secondary_muscles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.exercises
    where exercises.id = exercise_secondary_muscles.exercise_id
      and not exercises.is_system
      and exercises.owner_user_id = (select auth.uid())
  )
);

create policy "Users can update secondary muscles for their custom exercises"
on public.exercise_secondary_muscles
for update
to authenticated
using (
  exists (
    select 1
    from public.exercises
    where exercises.id = exercise_secondary_muscles.exercise_id
      and not exercises.is_system
      and exercises.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.exercises
    where exercises.id = exercise_secondary_muscles.exercise_id
      and not exercises.is_system
      and exercises.owner_user_id = (select auth.uid())
  )
);

create policy "Users can delete secondary muscles from their custom exercises"
on public.exercise_secondary_muscles
for delete
to authenticated
using (
  exists (
    select 1
    from public.exercises
    where exercises.id = exercise_secondary_muscles.exercise_id
      and not exercises.is_system
      and exercises.owner_user_id = (select auth.uid())
  )
);
