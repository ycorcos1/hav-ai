import type { UserExercisePreference } from "@/shared/contracts";

import { fromNullable, fromSQLiteBoolean, toNullable, toSQLiteBoolean } from "./mappingUtils";
import type { LocalPersistenceMetadata, LocalUserExercisePreferenceRow } from "./rows";

export type UserExercisePreferencePersistenceMetadata = LocalPersistenceMetadata & {
  deletedAt?: string;
};

export function userExercisePreferenceFromRow(
  row: LocalUserExercisePreferenceRow,
): UserExercisePreference {
  return {
    id: row.id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    isFavorite: fromSQLiteBoolean(row.is_favorite, "local_user_exercise_preferences.is_favorite"),
    notes: fromNullable(row.notes),
    restDurationSeconds: fromNullable(row.rest_duration_seconds),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function userExercisePreferenceToRow(
  preference: UserExercisePreference,
  metadata: UserExercisePreferencePersistenceMetadata,
): LocalUserExercisePreferenceRow {
  if (preference.restDurationSeconds !== undefined && preference.restDurationSeconds <= 0) {
    throw new Error("restDurationSeconds must be positive when present.");
  }

  return {
    id: preference.id,
    user_id: preference.userId,
    exercise_id: preference.exerciseId,
    is_favorite: toSQLiteBoolean(preference.isFavorite),
    notes: toNullable(preference.notes),
    rest_duration_seconds: toNullable(preference.restDurationSeconds),
    sync_status: metadata.syncStatus,
    deleted_at: toNullable(metadata.deletedAt),
    created_at: preference.createdAt,
    updated_at: preference.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}
