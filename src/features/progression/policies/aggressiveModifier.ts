import { progressionConfig } from "@/features/progression/config";
import { selectWeightIncrement } from "@/features/progression/domain/selectWeightIncrement";
import type { ProgressionContext, ProgressionDecision } from "@/features/progression/domain/progressionContext";

export function applyAggressiveModifier(
  context: ProgressionContext,
  decision: ProgressionDecision,
): ProgressionDecision {
  if (
    decision.recommendationType !== "increase_reps" ||
    context.input.exercise.measurementType !== "weight_reps" ||
    context.trend.direction !== "improving" ||
    (context.rpeMetrics.averageRpe ?? 0) >= progressionConfig.highRpeThreshold ||
    context.repeatedUnderperformance
  ) {
    return decision;
  }
  const reps = context.input.currentSession.sets
    .slice(0, context.input.currentTarget.targetSets)
    .map((set) => set.reps);
  const nearTop =
    reps.length >= context.input.currentTarget.targetSets &&
    reps.every((rep) => rep >= context.input.currentTarget.maxReps - 1) &&
    reps.filter((rep) => rep >= context.input.currentTarget.maxReps).length >= reps.length - 1;
  const currentWeightKg = context.input.currentTarget.targetWeightKg;
  if (!nearTop || currentWeightKg === undefined) return decision;

  const selection = selectWeightIncrement({
    currentWeightKg,
    equipmentType: context.input.exercise.equipmentType,
    direction: "increase",
    availableWeightIncrementKg: context.input.availableWeightIncrementKg,
  });
  if (selection.recommendedWeightKg === null) return decision;
  return {
    recommendationType: "increase_weight",
    recommendedWeightKg: selection.recommendedWeightKg,
    targetSetReps: Array(context.input.currentTarget.targetSets).fill(
      context.input.currentTarget.minReps,
    ),
    reasonCodes: ["TOTAL_REPS_IMPROVED", "RPE_ACCEPTABLE"],
  };
}
