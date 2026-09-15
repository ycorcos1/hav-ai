import type { Database } from "@/lib/supabase/database.types";
import type { ProgressionRecommendation } from "@/shared/contracts";

type RecommendationTable = Database["public"]["Tables"]["progression_recommendations"];

export function recommendationToCloudUpsert(
  recommendation: ProgressionRecommendation,
): RecommendationTable["Insert"] {
  return {
    id: recommendation.id,
    user_id: recommendation.userId,
    exercise_id: recommendation.exerciseId,
    source_workout_id: recommendation.sourceWorkoutId ?? null,
    source_workout_exercise_id: recommendation.sourceWorkoutExerciseId ?? null,
    recommendation_type: recommendation.recommendationType,
    recommended_weight_kg: recommendation.recommendedWeightKg ?? null,
    target_sets: recommendation.targetSets ?? null,
    target_min_reps: recommendation.targetMinReps ?? null,
    target_max_reps: recommendation.targetMaxReps ?? null,
    target_set_reps: recommendation.targetSetReps ?? null,
    confidence: recommendation.confidence,
    reason_codes: recommendation.reasonCodes,
    status: recommendation.status,
    engine_version: recommendation.engineVersion,
    consumed_at: recommendation.consumedAt ?? null,
  };
}

export function recommendationStatusToCloudUpdate(
  input: Pick<ProgressionRecommendation, "status" | "consumedAt">,
): RecommendationTable["Update"] {
  return {
    status: input.status,
    consumed_at: input.consumedAt ?? null,
  };
}
