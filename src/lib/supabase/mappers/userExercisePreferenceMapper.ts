import type { CloudUserExercisePreferenceSnapshot } from "@/db/repositories";
import type { Database } from "@/lib/supabase/database.types";
import type { RemoteMutationResult, UserExercisePreference } from "@/shared/contracts";

type PreferenceTable = Database["public"]["Tables"]["user_exercise_preferences"];
type PreferenceRow = PreferenceTable["Row"];

export function userExercisePreferenceFromCloudRow(
  row: PreferenceRow,
): CloudUserExercisePreferenceSnapshot {
  if (row.rest_duration_seconds !== null && row.rest_duration_seconds <= 0) {
    throw new Error("Cloud exercise preference rest duration is invalid.");
  }
  return {
    preference: {
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      isFavorite: row.is_favorite,
      ...(row.notes === null ? {} : { notes: row.notes }),
      ...(row.rest_duration_seconds === null
        ? {}
        : { restDurationSeconds: row.rest_duration_seconds }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    serverUpdatedAt: row.updated_at,
  };
}

export function userExercisePreferenceToCloudUpsert(
  preference: UserExercisePreference,
): PreferenceTable["Insert"] {
  if (preference.restDurationSeconds !== undefined && preference.restDurationSeconds <= 0) {
    throw new Error("Exercise preference rest duration must be positive.");
  }
  return {
    id: preference.id,
    user_id: preference.userId,
    exercise_id: preference.exerciseId,
    is_favorite: preference.isFavorite,
    notes: preference.notes ?? null,
    rest_duration_seconds: preference.restDurationSeconds ?? null,
  };
}

export function preferenceRemoteMutationResult(
  row: Pick<PreferenceRow, "updated_at">,
): RemoteMutationResult {
  return { serverUpdatedAt: row.updated_at };
}
