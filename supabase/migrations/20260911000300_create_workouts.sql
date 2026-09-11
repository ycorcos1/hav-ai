create table public.workouts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_template_id uuid references public.workout_templates (id) on delete set null,
  name text not null,
  status text not null
    constraint workouts_status_check check (status in ('active', 'completed', 'discarded')),
  started_at timestamptz not null,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workouts_id_user_id_key unique (id, user_id)
);

create table public.workout_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid not null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null
    constraint workout_exercises_position_check check (position >= 0),
  target_sets integer
    constraint workout_exercises_target_sets_check check (target_sets is null or target_sets > 0),
  target_min_reps integer
    constraint workout_exercises_target_min_reps_check check (
      target_min_reps is null or target_min_reps > 0
    ),
  target_max_reps integer
    constraint workout_exercises_target_max_reps_check check (
      target_max_reps is null or target_max_reps > 0
    ),
  target_weight_kg numeric
    constraint workout_exercises_target_weight_check check (
      target_weight_kg is null or target_weight_kg >= 0
    ),
  source_recommendation_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercises_target_rep_range_check check (
    target_min_reps is null
    or target_max_reps is null
    or target_max_reps >= target_min_reps
  ),
  constraint workout_exercises_workout_position_key unique (workout_id, position),
  constraint workout_exercises_identity_key unique (id, user_id, workout_id, exercise_id),
  constraint workout_exercises_owned_workout_fkey
    foreign key (workout_id, user_id)
    references public.workouts (id, user_id)
    on delete cascade
);

create table public.sets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid not null,
  workout_exercise_id uuid not null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null
    constraint sets_position_check check (position >= 0),
  set_type text not null
    constraint sets_set_type_check check (set_type in ('working', 'warmup')),
  weight_kg numeric
    constraint sets_weight_check check (weight_kg is null or weight_kg >= 0),
  reps integer not null
    constraint sets_reps_check check (reps >= 0),
  rpe numeric
    constraint sets_rpe_check check (rpe is null or (rpe >= 6 and rpe <= 10)),
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sets_workout_exercise_position_key unique (workout_exercise_id, position),
  constraint sets_owned_workout_fkey
    foreign key (workout_id, user_id)
    references public.workouts (id, user_id)
    on delete cascade,
  constraint sets_workout_exercise_identity_fkey
    foreign key (workout_exercise_id, user_id, workout_id, exercise_id)
    references public.workout_exercises (id, user_id, workout_id, exercise_id)
    on delete cascade
);

create index workouts_user_completed_at_idx
  on public.workouts (user_id, completed_at desc);
create index workouts_user_started_at_idx
  on public.workouts (user_id, started_at desc);
create index workouts_user_status_idx
  on public.workouts (user_id, status);
create index workouts_source_template_id_idx
  on public.workouts (source_template_id);
create index workout_exercises_user_exercise_idx
  on public.workout_exercises (user_id, exercise_id);
create index workout_exercises_exercise_id_idx
  on public.workout_exercises (exercise_id);
create index sets_workout_id_idx
  on public.sets (workout_id);
create index sets_user_exercise_completed_at_idx
  on public.sets (user_id, exercise_id, completed_at desc);
create index sets_exercise_id_idx
  on public.sets (exercise_id);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets enable row level security;

create policy "Users can read their own workouts"
on public.workouts
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own workouts"
on public.workouts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    source_template_id is null
    or exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workouts.source_template_id
        and workout_templates.user_id = (select auth.uid())
    )
  )
);

create policy "Users can update their own workouts"
on public.workouts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    source_template_id is null
    or exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workouts.source_template_id
        and workout_templates.user_id = (select auth.uid())
    )
  )
);

create policy "Users can delete their own workouts"
on public.workouts
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can read exercises in their own workouts"
on public.workout_exercises
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can add exercises to their own workouts"
on public.workout_exercises
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can update exercises in their own workouts"
on public.workout_exercises
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can remove exercises from their own workouts"
on public.workout_exercises
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
  )
);

create policy "Users can read sets in their own workouts"
on public.sets
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = sets.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.workout_exercises
    where workout_exercises.id = sets.workout_exercise_id
      and workout_exercises.user_id = (select auth.uid())
      and workout_exercises.workout_id = sets.workout_id
      and workout_exercises.exercise_id = sets.exercise_id
  )
);

create policy "Users can add sets to their own workouts"
on public.sets
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = sets.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.workout_exercises
    where workout_exercises.id = sets.workout_exercise_id
      and workout_exercises.user_id = (select auth.uid())
      and workout_exercises.workout_id = sets.workout_id
      and workout_exercises.exercise_id = sets.exercise_id
  )
);

create policy "Users can update sets in their own workouts"
on public.sets
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = sets.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.workout_exercises
    where workout_exercises.id = sets.workout_exercise_id
      and workout_exercises.user_id = (select auth.uid())
      and workout_exercises.workout_id = sets.workout_id
      and workout_exercises.exercise_id = sets.exercise_id
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = sets.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.workout_exercises
    where workout_exercises.id = sets.workout_exercise_id
      and workout_exercises.user_id = (select auth.uid())
      and workout_exercises.workout_id = sets.workout_id
      and workout_exercises.exercise_id = sets.exercise_id
  )
);

create policy "Users can remove sets from their own workouts"
on public.sets
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workouts
    where workouts.id = sets.workout_id
      and workouts.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.workout_exercises
    where workout_exercises.id = sets.workout_exercise_id
      and workout_exercises.user_id = (select auth.uid())
      and workout_exercises.workout_id = sets.workout_id
      and workout_exercises.exercise_id = sets.exercise_id
  )
);
