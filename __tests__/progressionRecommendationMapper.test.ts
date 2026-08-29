import type { ProgressionRecommendation } from "@/shared/contracts";
import {
  progressionRecommendationFromRow,
  progressionRecommendationToRow,
} from "@/db/mappers";

const createdAt = "2026-08-29T12:00:00.000Z";
const updatedAt = "2026-08-29T13:00:00.000Z";
const consumedAt = "2026-08-29T14:00:00.000Z";

const recommendation: ProgressionRecommendation = {
  id: "recommendation-1",
  userId: "user-1",
  exerciseId: "exercise-1",
  sourceWorkoutId: "workout-1",
  sourceWorkoutExerciseId: "workout-exercise-1",
  recommendationType: "increase_weight",
  recommendedWeightKg: 83.9146,
  targetSets: 3,
  targetMinReps: 6,
  targetMaxReps: 8,
  targetSetReps: [8, 7, 6],
  confidence: "high",
  reasonCodes: ["REP_RANGE_MAXED", "RPE_ACCEPTABLE"],
  status: "consumed",
  engineVersion: "progression-v1",
  createdAt,
  updatedAt,
  consumedAt,
};

describe("progression recommendation persistence mapper", () => {
  it("maps recommendations in both directions without losing structured fields", () => {
    const row = progressionRecommendationToRow(recommendation, {
      syncStatus: "synced",
      serverUpdatedAt: updatedAt,
    });

    expect(row).toMatchObject({
      recommendation_type: "increase_weight",
      recommended_weight_kg: 83.9146,
      target_set_reps_json: "[8,7,6]",
      reason_codes_json: '["REP_RANGE_MAXED","RPE_ACCEPTABLE"]',
      confidence: "high",
      consumed_at: consumedAt,
    });
    expect(progressionRecommendationFromRow(row)).toEqual(recommendation);
  });

  it("maps nullable recommendation fields to undefined", () => {
    const row = progressionRecommendationToRow(
      {
        ...recommendation,
        sourceWorkoutId: undefined,
        sourceWorkoutExerciseId: undefined,
        recommendedWeightKg: undefined,
        targetSets: undefined,
        targetMinReps: undefined,
        targetMaxReps: undefined,
        targetSetReps: undefined,
        consumedAt: undefined,
      },
      { syncStatus: "pending_create" },
    );

    expect(progressionRecommendationFromRow(row)).toMatchObject({
      sourceWorkoutId: undefined,
      recommendedWeightKg: undefined,
      targetSetReps: undefined,
      consumedAt: undefined,
    });
  });

  it("rejects malformed or invalid structured persistence", () => {
    const row = progressionRecommendationToRow(recommendation, { syncStatus: "synced" });

    expect(() => progressionRecommendationFromRow({ ...row, reason_codes_json: "{" })).toThrow(
      "Invalid persisted JSON",
    );
    expect(() =>
      progressionRecommendationFromRow({ ...row, reason_codes_json: '["UNKNOWN_REASON"]' }),
    ).toThrow("Invalid persisted value");
    expect(() =>
      progressionRecommendationFromRow({ ...row, target_set_reps_json: "[8,0]" }),
    ).toThrow("Invalid persisted value");
  });
});
