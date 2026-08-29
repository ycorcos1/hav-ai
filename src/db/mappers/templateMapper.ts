import type { WorkoutTemplate, WorkoutTemplateExercise } from "@/shared/contracts";

import {
  fromNullable,
  fromSQLiteBoolean,
  toNullable,
  toSQLiteBoolean,
} from "./mappingUtils";
import type {
  LocalPersistenceMetadata,
  LocalWorkoutTemplateExerciseRow,
  LocalWorkoutTemplateRow,
} from "./rows";

export function workoutTemplateExerciseFromRow(
  row: LocalWorkoutTemplateExerciseRow,
): WorkoutTemplateExercise {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    exerciseId: row.exercise_id,
    position: row.position,
    targetSets: row.target_sets,
    targetMinReps: row.target_min_reps,
    targetMaxReps: row.target_max_reps,
    notes: fromNullable(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workoutTemplateExerciseToRow(
  exercise: WorkoutTemplateExercise,
  metadata: LocalPersistenceMetadata,
): LocalWorkoutTemplateExerciseRow {
  return {
    id: exercise.id,
    user_id: exercise.userId,
    template_id: exercise.templateId,
    exercise_id: exercise.exerciseId,
    position: exercise.position,
    target_sets: exercise.targetSets,
    target_min_reps: exercise.targetMinReps,
    target_max_reps: exercise.targetMaxReps,
    notes: toNullable(exercise.notes),
    sync_status: metadata.syncStatus,
    created_at: exercise.createdAt,
    updated_at: exercise.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}

export function workoutTemplateFromRow(
  row: LocalWorkoutTemplateRow,
  exercises: WorkoutTemplateExercise[],
): WorkoutTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    notes: fromNullable(row.notes),
    isArchived: fromSQLiteBoolean(row.is_archived, "local_workout_templates.is_archived"),
    exercises,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workoutTemplateToRow(
  template: WorkoutTemplate,
  metadata: LocalPersistenceMetadata,
): LocalWorkoutTemplateRow {
  return {
    id: template.id,
    user_id: template.userId,
    name: template.name,
    notes: toNullable(template.notes),
    is_archived: toSQLiteBoolean(template.isArchived),
    sync_status: metadata.syncStatus,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}
