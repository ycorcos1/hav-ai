import type { ProgressionRecommendation } from "@/shared/contracts";

import { fromNullable, parsePersistedJson, toNullable } from "./mappingUtils";
import type {
  LocalPersistenceMetadata,
  LocalProgressionRecommendationRow,
} from "./rows";
import { progressionReasonCodesSchema, targetSetRepsSchema } from "./structuredSchemas";

export function progressionRecommendationFromRow(
  row: LocalProgressionRecommendationRow,
): ProgressionRecommendation {
  return {
    id: row.id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    sourceWorkoutId: fromNullable(row.source_workout_id),
    sourceWorkoutExerciseId: fromNullable(row.source_workout_exercise_id),
    recommendationType: row.recommendation_type,
    recommendedWeightKg: fromNullable(row.recommended_weight_kg),
    targetSets: fromNullable(row.target_sets),
    targetMinReps: fromNullable(row.target_min_reps),
    targetMaxReps: fromNullable(row.target_max_reps),
    targetSetReps:
      row.target_set_reps_json === null
        ? undefined
        : parsePersistedJson(
            row.target_set_reps_json,
            targetSetRepsSchema,
            "local_progression_recommendations.target_set_reps_json",
          ),
    confidence: row.confidence,
    reasonCodes: parsePersistedJson(
      row.reason_codes_json,
      progressionReasonCodesSchema,
      "local_progression_recommendations.reason_codes_json",
    ),
    status: row.status,
    engineVersion: row.engine_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    consumedAt: fromNullable(row.consumed_at),
  };
}

export function progressionRecommendationToRow(
  recommendation: ProgressionRecommendation,
  metadata: LocalPersistenceMetadata,
): LocalProgressionRecommendationRow {
  return {
    id: recommendation.id,
    user_id: recommendation.userId,
    exercise_id: recommendation.exerciseId,
    source_workout_id: toNullable(recommendation.sourceWorkoutId),
    source_workout_exercise_id: toNullable(recommendation.sourceWorkoutExerciseId),
    recommendation_type: recommendation.recommendationType,
    recommended_weight_kg: toNullable(recommendation.recommendedWeightKg),
    target_sets: toNullable(recommendation.targetSets),
    target_min_reps: toNullable(recommendation.targetMinReps),
    target_max_reps: toNullable(recommendation.targetMaxReps),
    target_set_reps_json:
      recommendation.targetSetReps === undefined
        ? null
        : JSON.stringify(recommendation.targetSetReps),
    confidence: recommendation.confidence,
    reason_codes_json: JSON.stringify(recommendation.reasonCodes),
    status: recommendation.status,
    engine_version: recommendation.engineVersion,
    consumed_at: toNullable(recommendation.consumedAt),
    sync_status: metadata.syncStatus,
    created_at: recommendation.createdAt,
    updated_at: recommendation.updatedAt,
    server_updated_at: toNullable(metadata.serverUpdatedAt),
  };
}
