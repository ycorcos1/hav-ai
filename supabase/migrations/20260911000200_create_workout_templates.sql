create table public.workout_templates (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_template_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null
    constraint workout_template_exercises_position_check check (position >= 0),
  target_sets integer not null
    constraint workout_template_exercises_target_sets_check check (target_sets > 0),
  target_min_reps integer not null
    constraint workout_template_exercises_target_min_reps_check check (target_min_reps > 0),
  target_max_reps integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_template_exercises_target_rep_range_check check (
    target_max_reps >= target_min_reps
  ),
  constraint workout_template_exercises_template_position_key unique (template_id, position)
);

create index workout_templates_user_updated_at_idx
  on public.workout_templates (user_id, updated_at desc);
create index workout_templates_user_archived_idx
  on public.workout_templates (user_id, is_archived);
create index workout_template_exercises_user_id_idx
  on public.workout_template_exercises (user_id);
create index workout_template_exercises_exercise_id_idx
  on public.workout_template_exercises (exercise_id);

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;

create policy "Users can read their own workout templates"
on public.workout_templates
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own workout templates"
on public.workout_templates
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own workout templates"
on public.workout_templates
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can read exercises in their own workout templates"
on public.workout_template_exercises
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_template_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can add exercises to their own workout templates"
on public.workout_template_exercises
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_template_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can update exercises in their own workout templates"
on public.workout_template_exercises
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_template_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_template_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can remove exercises from their own workout templates"
on public.workout_template_exercises
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id = workout_template_exercises.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);
