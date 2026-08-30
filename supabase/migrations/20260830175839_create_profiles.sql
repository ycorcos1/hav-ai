create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  weight_unit text not null
    constraint profiles_weight_unit_check check (weight_unit in ('lb', 'kg')),
  primary_goal text not null
    constraint profiles_primary_goal_check check (primary_goal in ('strength', 'hypertrophy', 'hybrid')),
  rpe_preference text not null default 'optional'
    constraint profiles_rpe_preference_check check (rpe_preference in ('hidden', 'optional', 'preferred')),
  progression_style text not null default 'balanced'
    constraint profiles_progression_style_check check (progression_style in ('conservative', 'balanced', 'aggressive')),
  default_rest_duration_seconds integer not null default 120
    constraint profiles_default_rest_duration_seconds_check check (default_rest_duration_seconds > 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profile_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
