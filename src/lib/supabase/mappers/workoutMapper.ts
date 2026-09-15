import type { Database } from "@/lib/supabase/database.types";
import type { Workout, WorkoutExercise, WorkoutSet } from "@/shared/contracts";

type WorkoutTable = Database["public"]["Tables"]["workouts"];
type WorkoutExerciseTable = Database["public"]["Tables"]["workout_exercises"];
type WorkoutSetTable = Database["public"]["Tables"]["sets"];

export function workoutToCloudUpsert(workout: Workout): WorkoutTable["Insert"] {
  return {
    id: workout.id,
    user_id: workout.userId,
    source_template_id: workout.sourceTemplateId ?? null,
    name: workout.name,
    status: workout.status,
    started_at: workout.startedAt,
    completed_at: workout.completedAt ?? null,
    notes: workout.notes ?? null,
  };
}

export function workoutExerciseToCloudUpsert(
  exercise: WorkoutExercise,
): WorkoutExerciseTable["Insert"] {
  return {
    id: exercise.id,
    user_id: exercise.userId,
    workout_id: exercise.workoutId,
    exercise_id: exercise.exerciseId,
    position: exercise.position,
    target_sets: exercise.targetSets ?? null,
    target_min_reps: exercise.targetMinReps ?? null,
    target_max_reps: exercise.targetMaxReps ?? null,
    target_weight_kg: exercise.targetWeightKg ?? null,
    source_recommendation_id: exercise.sourceRecommendationId ?? null,
    notes: exercise.notes ?? null,
  };
}

export function workoutSetToCloudUpsert(set: WorkoutSet): WorkoutSetTable["Insert"] {
  return {
    id: set.id,
    user_id: set.userId,
    workout_id: set.workoutId,
    workout_exercise_id: set.workoutExerciseId,
    exercise_id: set.exerciseId,
    position: set.position,
    set_type: set.setType,
    weight_kg: set.weightKg ?? null,
    reps: set.reps,
    rpe: set.rpe ?? null,
    notes: set.notes ?? null,
    completed_at: set.completedAt,
  };
}
