import type { Workout, WorkoutExercise, WorkoutSet } from "@/shared/contracts";

import { fromNullable, toNullable } from "./mappingUtils";
import type {
  LocalPersistenceMetadata,
  LocalWorkoutExerciseRow,
  LocalWorkoutRow,
  LocalWorkoutSetRow,
} from "./rows";

export type WorkoutSetPersistenceMetadata = LocalPersistenceMetadata & {
  deletedAt?: string;
};

export function workoutSetFromRow(row: LocalWorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    workoutExerciseId: row.workout_exercise_id,
    exerciseId: row.exercise_id,
    position: row.position,
    setType: row.set_type,
    weightKg: fromNullable(row.weight_kg),
    reps: row.reps,
    rpe: fromNullable(row.rpe),
    notes: fromNullable(row.notes),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workoutSetToRow(
  set: WorkoutSet,
  metadata: WorkoutSetPersistenceMetadata,
): LocalWorkoutSetRow {
  return {
    id: set.id,
    user_id: set.userId,
    workout_id: set.workoutId,
    workout_exercise_id: set.workoutExerciseId,
    exercise_id: set.exerciseId,
    position: set.position,
    set_type: set.setType,
    weight_kg: toNullable(set.weightKg),
    reps: set.reps,
    rpe: toNullable(set.rpe),
    notes: toNullable(set.notes),
    completed_at: set.completedAt,
    sync_status: metadata.syncStatus,
    deleted_at: toNullable(metadata.deletedAt),
    created_at: set.createdAt,
    updated_at: set.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}

export function workoutExerciseFromRow(
  row: LocalWorkoutExerciseRow,
  sets: WorkoutSet[],
): WorkoutExercise {
  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    position: row.position,
    targetSets: fromNullable(row.target_sets),
    targetMinReps: fromNullable(row.target_min_reps),
    targetMaxReps: fromNullable(row.target_max_reps),
    targetWeightKg: fromNullable(row.target_weight_kg),
    sourceRecommendationId: fromNullable(row.source_recommendation_id),
    notes: fromNullable(row.notes),
    sets,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workoutExerciseToRow(
  exercise: WorkoutExercise,
  metadata: LocalPersistenceMetadata,
): LocalWorkoutExerciseRow {
  return {
    id: exercise.id,
    user_id: exercise.userId,
    workout_id: exercise.workoutId,
    exercise_id: exercise.exerciseId,
    position: exercise.position,
    target_sets: toNullable(exercise.targetSets),
    target_min_reps: toNullable(exercise.targetMinReps),
    target_max_reps: toNullable(exercise.targetMaxReps),
    target_weight_kg: toNullable(exercise.targetWeightKg),
    source_recommendation_id: toNullable(exercise.sourceRecommendationId),
    notes: toNullable(exercise.notes),
    sync_status: metadata.syncStatus,
    created_at: exercise.createdAt,
    updated_at: exercise.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}

export function workoutFromRow(row: LocalWorkoutRow, exercises: WorkoutExercise[]): Workout {
  return {
    id: row.id,
    userId: row.user_id,
    sourceTemplateId: fromNullable(row.source_template_id),
    name: row.name,
    status: row.status,
    startedAt: row.started_at,
    completedAt: fromNullable(row.completed_at),
    notes: fromNullable(row.notes),
    exercises,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workoutToRow(
  workout: Workout,
  metadata: LocalPersistenceMetadata,
): LocalWorkoutRow {
  return {
    id: workout.id,
    user_id: workout.userId,
    source_template_id: toNullable(workout.sourceTemplateId),
    name: workout.name,
    status: workout.status,
    started_at: workout.startedAt,
    completed_at: toNullable(workout.completedAt),
    notes: toNullable(workout.notes),
    sync_status: metadata.syncStatus,
    created_at: workout.createdAt,
    updated_at: workout.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}
