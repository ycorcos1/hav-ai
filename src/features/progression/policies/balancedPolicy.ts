import { generateRepTarget } from "@/features/progression/domain/generateRepTarget";
import { selectWeightIncrement } from "@/features/progression/domain/selectWeightIncrement";
import type { ProgressionContext, ProgressionDecision } from "@/features/progression/domain/progressionContext";

function weightChangeDecision(
  context: ProgressionContext,
  direction: "increase" | "decrease",
): ProgressionDecision {
  const currentWeightKg = context.input.currentTarget.targetWeightKg;
  if (currentWeightKg === undefined) {
    return { recommendationType: "insufficient_data", reasonCodes: ["INSUFFICIENT_HISTORY"] };
  }
  const selection = selectWeightIncrement({
    currentWeightKg,
    equipmentType: context.input.exercise.equipmentType,
    direction,
    availableWeightIncrementKg: context.input.availableWeightIncrementKg,
    previousSuccessfulWeightKg: context.previousSuccessfulWeightKg,
  });
  if (selection.recommendedWeightKg === null) {
    return {
      recommendationType: "repeat_target",
      targetSetReps: context.input.currentTarget.targetSetReps,
      reasonCodes: selection.guardrailExceeded
        ? ["SMALLEST_INCREMENT_TOO_LARGE"]
        : ["INSUFFICIENT_HISTORY"],
    };
  }
  return {
    recommendationType: direction === "increase" ? "increase_weight" : "decrease_weight",
    recommendedWeightKg: selection.recommendedWeightKg,
    targetSetReps: Array(context.input.currentTarget.targetSets).fill(
      context.input.currentTarget.minReps,
    ),
    reasonCodes:
      direction === "increase"
        ? ["TOP_OF_REP_RANGE_REACHED"]
        : context.previousSuccessfulWeightKg !== undefined
          ? ["REPEATED_FAILED_PROGRESSION"]
          : ["REPEATED_UNDERPERFORMANCE"],
  };
}

export function applyBalancedPolicy(context: ProgressionContext): ProgressionDecision {
  const { input, classification } = context;
  if (classification === "irregular") {
    return {
      recommendationType: "maintain_weight",
      recommendedWeightKg: context.input.currentTarget.targetWeightKg,
      reasonCodes: ["MIXED_WORKING_LOADS"],
    };
  }
  if (context.repeatedUnderperformance) return weightChangeDecision(context, "decrease");
  if (classification === "partial_underperformance" || classification === "severe_underperformance") {
    return {
      recommendationType: "repeat_target",
      recommendedWeightKg: input.currentTarget.targetWeightKg,
      targetSetReps: input.currentTarget.targetSetReps,
      reasonCodes: ["BELOW_TARGET_RANGE", "SINGLE_SESSION_UNDERPERFORMANCE"],
    };
  }

  const isWeighted = input.exercise.measurementType === "weight_reps";
  if (classification === "perfect") {
    if (isWeighted) return weightChangeDecision(context, "increase");
    return {
      recommendationType: "repeat_target",
      targetSetReps: Array(input.currentTarget.targetSets).fill(input.currentTarget.maxReps),
      reasonCodes: ["REP_RANGE_MAXED"],
    };
  }

  const targetSetReps = generateRepTarget({
    achievedReps: input.currentSession.sets.map((set) => set.reps),
    targetSets: input.currentTarget.targetSets,
    minReps: input.currentTarget.minReps,
    maxReps: input.currentTarget.maxReps,
  });
  if (targetSetReps !== null) {
    return {
      recommendationType: "increase_reps",
      recommendedWeightKg: input.currentTarget.targetWeightKg,
      targetSetReps,
      reasonCodes: ["WITHIN_TARGET_RANGE"],
    };
  }
  return {
    recommendationType: "repeat_target",
    recommendedWeightKg: input.currentTarget.targetWeightKg,
    reasonCodes: ["PERFORMANCE_REPEATED"],
  };
}
