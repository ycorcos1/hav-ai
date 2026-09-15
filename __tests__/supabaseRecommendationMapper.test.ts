import {
  recommendationStatusToCloudUpdate,
  recommendationToCloudUpsert,
} from "@/lib/supabase/mappers/recommendationMapper";
import type { ProgressionRecommendation } from "@/shared/contracts";

const timestamp = "2026-09-15T15:00:00.000Z";
const recommendation: ProgressionRecommendation = {
  id: "fa300000-0000-4000-8000-000000000001",
  userId: "a0000000-0000-4000-8000-00000000000a",
  exerciseId: "10000000-0000-4000-8000-000000000001",
  sourceWorkoutId: "fa200000-0000-4000-8000-000000000001",
  sourceWorkoutExerciseId: "fa210000-0000-4000-8000-000000000001",
  recommendationType: "increase_reps",
  recommendedWeightKg: 80,
  targetSets: 3,
  targetMinReps: 8,
  targetMaxReps: 10,
  targetSetReps: [10, 9, 8],
  confidence: "high",
  reasonCodes: ["TOTAL_REPS_IMPROVED", "RPE_ACCEPTABLE"],
  status: "consumed",
  engineVersion: "progression-v1",
  consumedAt: timestamp,
  createdAt: "2026-09-15T14:00:00.000Z",
  updatedAt: timestamp,
};

describe("Supabase recommendation mapper", () => {
  it("maps the complete canonical recommendation and explicit JSON fields", () => {
    expect(recommendationToCloudUpsert(recommendation)).toEqual({
      id: recommendation.id,
      user_id: recommendation.userId,
      exercise_id: recommendation.exerciseId,
      source_workout_id: recommendation.sourceWorkoutId,
      source_workout_exercise_id: recommendation.sourceWorkoutExerciseId,
      recommendation_type: "increase_reps",
      recommended_weight_kg: 80,
      target_sets: 3,
      target_min_reps: 8,
      target_max_reps: 10,
      target_set_reps: [10, 9, 8],
      confidence: "high",
      reason_codes: ["TOTAL_REPS_IMPROVED", "RPE_ACCEPTABLE"],
      status: "consumed",
      engine_version: "progression-v1",
      consumed_at: timestamp,
    });
  });

  it("maps a narrow status update without rewriting recommendation content", () => {
    expect(recommendationStatusToCloudUpdate({
      status: "consumed",
      consumedAt: timestamp,
    })).toEqual({
      status: "consumed",
      consumed_at: timestamp,
    });
    expect(recommendationStatusToCloudUpdate({
      status: "superseded",
      consumedAt: undefined,
    })).toEqual({
      status: "superseded",
      consumed_at: null,
    });
  });
});
