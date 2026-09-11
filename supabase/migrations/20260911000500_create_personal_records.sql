alter table public.sets
  add constraint sets_personal_record_source_key
  unique (id, user_id, workout_id, exercise_id);

create table public.personal_records (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  record_type text not null
    constraint personal_records_type_check check (
      record_type in ('max_weight', 'estimated_1rm')
    ),
  set_id uuid not null,
  workout_id uuid not null,
  weight_kg numeric
    constraint personal_records_weight_check check (
      weight_kg is null or weight_kg >= 0
    ),
  reps integer
    constraint personal_records_reps_check check (
      reps is null or reps >= 0
    ),
  estimated_1rm_kg numeric
    constraint personal_records_estimated_1rm_check check (
      estimated_1rm_kg is null or estimated_1rm_kg >= 0
    ),
  achieved_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_records_value_check check (
    (record_type = 'max_weight' and weight_kg is not null)
    or (record_type = 'estimated_1rm' and estimated_1rm_kg is not null)
  ),
  constraint personal_records_current_state_key
    unique (user_id, exercise_id, record_type),
  constraint personal_records_owned_workout_fkey
    foreign key (workout_id, user_id)
    references public.workouts (id, user_id)
    on delete cascade,
  constraint personal_records_source_set_fkey
    foreign key (set_id, user_id, workout_id, exercise_id)
    references public.sets (id, user_id, workout_id, exercise_id)
    on delete cascade
);

create index personal_records_set_id_idx
  on public.personal_records (set_id);
create index personal_records_workout_id_idx
  on public.personal_records (workout_id);

alter table public.personal_records enable row level security;

create policy "Users can read their own personal records"
on public.personal_records
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own personal records"
on public.personal_records
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = personal_records.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
  and exists (
    select 1
    from public.workouts
    where workouts.id = personal_records.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.sets
    where sets.id = personal_records.set_id
      and sets.user_id = (select auth.uid())
      and sets.workout_id = personal_records.workout_id
      and sets.exercise_id = personal_records.exercise_id
  )
);

create policy "Users can update their own personal records"
on public.personal_records
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = personal_records.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
  and exists (
    select 1
    from public.workouts
    where workouts.id = personal_records.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.sets
    where sets.id = personal_records.set_id
      and sets.user_id = (select auth.uid())
      and sets.workout_id = personal_records.workout_id
      and sets.exercise_id = personal_records.exercise_id
  )
);

create policy "Users can delete their own personal records"
on public.personal_records
for delete
to authenticated
using (user_id = (select auth.uid()));
