alter table public.workout_exercises
  add constraint workout_exercises_recommendation_source_key
  unique (id, user_id, exercise_id);

create table public.progression_recommendations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  source_workout_id uuid,
  source_workout_exercise_id uuid,
  recommendation_type text not null
    constraint progression_recommendations_type_check check (
      recommendation_type in (
        'increase_weight',
        'maintain_weight',
        'increase_reps',
        'repeat_target',
        'decrease_weight',
        'insufficient_data'
      )
    ),
  recommended_weight_kg numeric
    constraint progression_recommendations_weight_check check (
      recommended_weight_kg is null or recommended_weight_kg >= 0
    ),
  target_sets integer
    constraint progression_recommendations_target_sets_check check (
      target_sets is null or target_sets > 0
    ),
  target_min_reps integer
    constraint progression_recommendations_target_min_reps_check check (
      target_min_reps is null or target_min_reps > 0
    ),
  target_max_reps integer
    constraint progression_recommendations_target_max_reps_check check (
      target_max_reps is null or target_max_reps > 0
    ),
  target_set_reps jsonb
    constraint progression_recommendations_target_set_reps_check check (
      target_set_reps is null
      or (
        jsonb_typeof(target_set_reps) = 'array'
        and jsonb_array_length(target_set_reps) > 0
        and not jsonb_path_exists(target_set_reps, '$[*] ? (@.type() != "number" || @ <= 0)')
        and (target_sets is null or jsonb_array_length(target_set_reps) = target_sets)
      )
    ),
  confidence text not null
    constraint progression_recommendations_confidence_check check (
      confidence in ('low', 'medium', 'high')
    ),
  reason_codes jsonb not null
    constraint progression_recommendations_reason_codes_check check (
      jsonb_typeof(reason_codes) = 'array'
      and reason_codes <@ '[
        "INITIAL_BASELINE_ESTABLISHED",
        "TOP_OF_REP_RANGE_REACHED",
        "REP_RANGE_EXCEEDED",
        "REP_RANGE_MAXED",
        "WITHIN_TARGET_RANGE",
        "BELOW_TARGET_RANGE",
        "TOTAL_REPS_IMPROVED",
        "TOTAL_REPS_DECLINED",
        "PERFORMANCE_REPEATED",
        "RPE_ACCEPTABLE",
        "RPE_HIGH",
        "RPE_IMPROVED",
        "RPE_WORSENED",
        "RPE_UNAVAILABLE",
        "INCOMPLETE_TARGET_SETS",
        "EXTRA_SETS_PERFORMED",
        "MIXED_WORKING_LOADS",
        "SINGLE_SESSION_UNDERPERFORMANCE",
        "REPEATED_UNDERPERFORMANCE",
        "REPEATED_FAILED_PROGRESSION",
        "UNUSUAL_PERFORMANCE_DROP",
        "MULTI_SESSION_STALL",
        "PLATEAU_DETECTED",
        "ESTIMATED_1RM_IMPROVED",
        "ESTIMATED_1RM_DECLINED",
        "SMALLEST_INCREMENT_TOO_LARGE",
        "INSUFFICIENT_HISTORY"
      ]'::jsonb
    ),
  status text not null
    constraint progression_recommendations_status_check check (
      status in ('active', 'consumed', 'superseded')
    ),
  engine_version text not null
    constraint progression_recommendations_engine_version_check check (
      btrim(engine_version) <> ''
    ),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint progression_recommendations_target_rep_range_check check (
    target_min_reps is null
    or target_max_reps is null
    or target_max_reps >= target_min_reps
  ),
  constraint progression_recommendations_source_workout_fkey
    foreign key (source_workout_id, user_id)
    references public.workouts (id, user_id)
    on delete set null (source_workout_id),
  constraint progression_recommendations_source_exercise_fkey
    foreign key (source_workout_exercise_id, user_id, exercise_id)
    references public.workout_exercises (id, user_id, exercise_id)
    on delete set null (source_workout_exercise_id),
  constraint progression_recommendations_source_ancestry_fkey
    foreign key (
      source_workout_exercise_id,
      user_id,
      source_workout_id,
      exercise_id
    )
    references public.workout_exercises (id, user_id, workout_id, exercise_id)
    on delete no action
);

create index progression_recommendations_user_exercise_status_idx
  on public.progression_recommendations (user_id, exercise_id, status);
create unique index progression_recommendations_one_active_idx
  on public.progression_recommendations (user_id, exercise_id)
  where status = 'active';
create index progression_recommendations_source_workout_idx
  on public.progression_recommendations (source_workout_id);
create index progression_recommendations_source_exercise_idx
  on public.progression_recommendations (source_workout_exercise_id);

alter table public.progression_recommendations enable row level security;

create policy "Users can read their own progression recommendations"
on public.progression_recommendations
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own progression recommendations"
on public.progression_recommendations
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = progression_recommendations.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
  and (
    source_workout_id is null
    or exists (
      select 1
      from public.workouts
      where workouts.id = progression_recommendations.source_workout_id
        and workouts.user_id = (select auth.uid())
    )
  )
  and (
    source_workout_exercise_id is null
    or exists (
      select 1
      from public.workout_exercises
      where workout_exercises.id = progression_recommendations.source_workout_exercise_id
        and workout_exercises.user_id = (select auth.uid())
        and workout_exercises.exercise_id = progression_recommendations.exercise_id
        and (
          progression_recommendations.source_workout_id is null
          or workout_exercises.workout_id = progression_recommendations.source_workout_id
        )
    )
  )
);

create policy "Users can update their own progression recommendations"
on public.progression_recommendations
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises
    where exercises.id = progression_recommendations.exercise_id
      and (exercises.is_system or exercises.owner_user_id = (select auth.uid()))
  )
  and (
    source_workout_id is null
    or exists (
      select 1
      from public.workouts
      where workouts.id = progression_recommendations.source_workout_id
        and workouts.user_id = (select auth.uid())
    )
  )
  and (
    source_workout_exercise_id is null
    or exists (
      select 1
      from public.workout_exercises
      where workout_exercises.id = progression_recommendations.source_workout_exercise_id
        and workout_exercises.user_id = (select auth.uid())
        and workout_exercises.exercise_id = progression_recommendations.exercise_id
        and (
          progression_recommendations.source_workout_id is null
          or workout_exercises.workout_id = progression_recommendations.source_workout_id
        )
    )
  )
);

create policy "Users can delete their own progression recommendations"
on public.progression_recommendations
for delete
to authenticated
using (user_id = (select auth.uid()));
