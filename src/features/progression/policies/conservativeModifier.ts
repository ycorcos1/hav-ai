import { progressionConfig } from "@/features/progression/config";
import type { ProgressionContext, ProgressionDecision } from "@/features/progression/domain/progressionContext";

export function applyConservativeModifier(
  context: ProgressionContext,
  decision: ProgressionDecision,
): ProgressionDecision {
  if (
    decision.recommendationType === "increase_weight" &&
    (context.rpeMetrics.averageRpe ?? 0) >= progressionConfig.highRpeThreshold
  ) {
    return {
      recommendationType: "repeat_target",
      recommendedWeightKg: context.input.currentTarget.targetWeightKg,
      targetSetReps: Array(context.input.currentTarget.targetSets).fill(
        context.input.currentTarget.maxReps,
      ),
      reasonCodes: ["TOP_OF_REP_RANGE_REACHED", "RPE_HIGH"],
    };
  }
  return decision;
}
