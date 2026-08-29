import type { Exercise } from "@/shared/contracts";

import {
  fromNullable,
  fromSQLiteBoolean,
  parsePersistedJson,
  toNullable,
  toSQLiteBoolean,
} from "./mappingUtils";
import type { LocalExerciseRow, LocalPersistenceMetadata } from "./rows";
import { muscleGroupsSchema } from "./structuredSchemas";

export function exerciseFromRow(row: LocalExerciseRow): Exercise {
  const isSystem = fromSQLiteBoolean(row.is_system, "local_exercises.is_system");

  if (isSystem && row.owner_user_id !== null) {
    throw new Error("System exercises cannot have an owner_user_id.");
  }

  if (!isSystem && row.owner_user_id === null) {
    throw new Error("Custom exercises require an owner_user_id.");
  }

  return {
    id: row.id,
    ownerUserId: fromNullable(row.owner_user_id),
    name: row.name,
    primaryMuscleGroup: row.primary_muscle_group,
    secondaryMuscleGroups: parsePersistedJson(
      row.secondary_muscle_groups_json,
      muscleGroupsSchema,
      "local_exercises.secondary_muscle_groups_json",
    ),
    equipmentType: row.equipment_type,
    measurementType: row.measurement_type,
    isSystem,
    isArchived: fromSQLiteBoolean(row.is_archived, "local_exercises.is_archived"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function exerciseToRow(
  exercise: Exercise,
  metadata: LocalPersistenceMetadata,
): LocalExerciseRow {
  if (exercise.isSystem && exercise.ownerUserId !== undefined) {
    throw new Error("System exercises cannot have an ownerUserId.");
  }

  if (!exercise.isSystem && exercise.ownerUserId === undefined) {
    throw new Error("Custom exercises require an ownerUserId.");
  }

  return {
    id: exercise.id,
    owner_user_id: toNullable(exercise.ownerUserId),
    name: exercise.name,
    primary_muscle_group: exercise.primaryMuscleGroup,
    secondary_muscle_groups_json: JSON.stringify(exercise.secondaryMuscleGroups),
    equipment_type: exercise.equipmentType,
    measurement_type: exercise.measurementType,
    is_system: toSQLiteBoolean(exercise.isSystem),
    is_archived: toSQLiteBoolean(exercise.isArchived),
    sync_status: metadata.syncStatus,
    created_at: exercise.createdAt,
    updated_at: exercise.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}
