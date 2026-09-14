create function public.set_server_controlled_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  metadata_now timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    new.created_at = metadata_now;
  else
    new.created_at = old.created_at;
  end if;

  new.updated_at = metadata_now;
  return new;
end;
$$;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  metadata_now timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    new.created_at = metadata_now;
  else
    new.created_at = old.created_at;
  end if;

  new.updated_at = metadata_now;
  return new;
end;
$$;

drop trigger set_profile_updated_at on public.profiles;
create trigger set_profile_updated_at
before insert or update on public.profiles
for each row
execute function public.set_profile_updated_at();

create trigger set_exercises_server_metadata
before insert or update on public.exercises
for each row
execute function public.set_server_controlled_metadata();

create trigger set_workout_templates_server_metadata
before insert or update on public.workout_templates
for each row
execute function public.set_server_controlled_metadata();

create trigger set_workout_template_exercises_server_metadata
before insert or update on public.workout_template_exercises
for each row
execute function public.set_server_controlled_metadata();

create trigger set_workouts_server_metadata
before insert or update on public.workouts
for each row
execute function public.set_server_controlled_metadata();

create trigger set_workout_exercises_server_metadata
before insert or update on public.workout_exercises
for each row
execute function public.set_server_controlled_metadata();

create trigger set_sets_server_metadata
before insert or update on public.sets
for each row
execute function public.set_server_controlled_metadata();

create trigger set_progression_recommendations_server_metadata
before insert or update on public.progression_recommendations
for each row
execute function public.set_server_controlled_metadata();

create trigger set_personal_records_server_metadata
before insert or update on public.personal_records
for each row
execute function public.set_server_controlled_metadata();
