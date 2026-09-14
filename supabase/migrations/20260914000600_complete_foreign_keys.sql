alter table public.workout_templates
  add constraint workout_templates_id_user_id_key
  unique (id, user_id);

alter table public.progression_recommendations
  add constraint progression_recommendations_id_user_id_key
  unique (id, user_id);

alter table public.workout_template_exercises
  drop constraint workout_template_exercises_template_id_fkey,
  add constraint workout_template_exercises_owned_template_fkey
    foreign key (template_id, user_id)
    references public.workout_templates (id, user_id)
    on delete cascade;

alter table public.workouts
  drop constraint workouts_source_template_id_fkey,
  add constraint workouts_owned_source_template_fkey
    foreign key (source_template_id, user_id)
    references public.workout_templates (id, user_id)
    on delete set null (source_template_id);

alter table public.workout_exercises
  add constraint workout_exercises_owned_source_recommendation_fkey
    foreign key (source_recommendation_id, user_id)
    references public.progression_recommendations (id, user_id)
    on delete set null (source_recommendation_id);
