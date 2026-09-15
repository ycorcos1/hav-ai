create table public.user_exercise_preferences (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  is_favorite boolean not null default false,
  notes text,
  rest_duration_seconds integer
    constraint user_exercise_preferences_rest_duration_check check (
      rest_duration_seconds is null or rest_duration_seconds > 0
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_exercise_preferences_user_exercise_key unique (user_id, exercise_id)
);

create index user_exercise_preferences_user_favorite_updated_idx
  on public.user_exercise_preferences (user_id, is_favorite, updated_at desc);

alter table public.user_exercise_preferences enable row level security;

create policy "Users can read their own exercise preferences"
on public.user_exercise_preferences
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = user_exercise_preferences.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can create their own exercise preferences"
on public.user_exercise_preferences
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = user_exercise_preferences.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can update their own exercise preferences"
on public.user_exercise_preferences
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = user_exercise_preferences.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = user_exercise_preferences.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create policy "Users can delete their own exercise preferences"
on public.user_exercise_preferences
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = user_exercise_preferences.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
);

create trigger set_user_exercise_preferences_server_metadata
before insert or update on public.user_exercise_preferences
for each row
execute function public.set_server_controlled_metadata();

alter table public.sets
add column notes text;
