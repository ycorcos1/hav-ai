import {
  analyzeExerciseTrend,
  calculateRepMetrics,
  calculateRpeMetrics,
} from "@/features/progression/metrics";
import {
  applyAggressiveModifier,
  applyBalancedPolicy,
  applyConservativeModifier,
} from "@/features/progression/policies";
import { progressionConfig } from "@/features/progression/config";
import type { ProgressionContext } from "./progressionContext";
import type { ProgressionInput, ProgressionResult } from "@/shared/contracts";
import { calculateConfidence } from "./calculateConfidence";
import { classifySession } from "./classifySession";
import { collectReasonCodes } from "./collectReasonCodes";
import { hasRepeatedUnderperformance } from "./underperformance";

export const progressionEngineVersion = "progression-v1";

const validRpeValues = new Set([6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]);

function invalidInput(input: ProgressionInput): boolean {
  const target = input.currentTarget;
  const sessions = [input.currentSession, ...input.recentSessions];
  return (
    !Number.isInteger(target.targetSets) ||
    target.targetSets <= 0 ||
    !Number.isInteger(target.minReps) ||
    target.minReps <= 0 ||
    !Number.isInteger(target.maxReps) ||
    target.maxReps < target.minReps ||
    (target.targetWeightKg !== undefined && target.targetWeightKg <= 0) ||
    (input.availableWeightIncrementKg !== undefined && input.availableWeightIncrementKg <= 0) ||
    sessions.some((session) =>
      session.sets.some(
        (set) =>
          !Number.isInteger(set.reps) ||
          set.reps < 0 ||
          (set.weightKg !== undefined && set.weightKg <= 0) ||
          (set.rpe !== undefined && !validRpeValues.has(set.rpe)),
      ),
    ) ||
    (target.targetSetReps !== undefined &&
      (target.targetSetReps.length !== target.targetSets ||
        target.targetSetReps.some((reps) => !Number.isInteger(reps) || reps <= 0)))
  );
}

function uniformWeight(input: ProgressionInput["currentSession"]): number | undefined {
  const weights = input.sets.flatMap((set) => (set.weightKg === undefined ? [] : [set.weightKg]));
  return weights.length > 0 &&
    weights.every(
      (weight) => Math.abs(weight - weights[0]) <= progressionConfig.weightComparisonToleranceKg,
    )
    ? weights[0]
    : undefined;
}

export function calculateProgression(input: ProgressionInput): ProgressionResult {
  if (invalidInput(input) || input.currentSession.sets.length === 0) {
    return {
      recommendationType: "insufficient_data",
      confidence: "low",
      reasonCodes: ["INSUFFICIENT_HISTORY"],
      engineVersion: progressionEngineVersion,
    };
  }
  const classificationInput = {
    targetSets: input.currentTarget.targetSets,
    minReps: input.currentTarget.minReps,
    maxReps: input.currentTarget.maxReps,
    targetSetReps: input.currentTarget.targetSetReps,
  };
  const classification = classifySession({ ...classificationInput, sets: input.currentSession.sets });
  const recentClassifications = [...input.recentSessions]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .map((session) => classifySession({ ...classificationInput, sets: session.sets }));
  const previousSuccessfulSession = [...input.recentSessions]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .find((session, index) => {
      const result = recentClassifications[index];
      const weight = uniformWeight(session);
      return (result === "perfect" || result === "successful") && weight !== undefined;
    });
  const context: ProgressionContext = {
    input,
    classification,
    recentClassifications,
    repMetrics: calculateRepMetrics(input.currentSession.sets),
    rpeMetrics: calculateRpeMetrics(input.currentSession.sets),
    trend: analyzeExerciseTrend([...input.recentSessions, input.currentSession]),
    hasMixedLoads: classification === "irregular",
    repeatedUnderperformance: hasRepeatedUnderperformance(classification, recentClassifications),
    previousSuccessfulWeightKg: previousSuccessfulSession
      ? uniformWeight(previousSuccessfulSession)
      : undefined,
  };
  let decision = applyBalancedPolicy(context);
  if (input.preferences.progressionStyle === "conservative") {
    decision = applyConservativeModifier(context, decision);
  } else if (input.preferences.progressionStyle === "aggressive") {
    decision = applyAggressiveModifier(context, decision);
  }
  const reasonCodes = collectReasonCodes(context, decision);
  return {
    recommendationType: decision.recommendationType,
    recommendedWeightKg: decision.recommendedWeightKg,
    targetSets: input.currentTarget.targetSets,
    targetMinReps: input.currentTarget.minReps,
    targetMaxReps: input.currentTarget.maxReps,
    targetSetReps: decision.targetSetReps,
    confidence: calculateConfidence(context),
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ["INSUFFICIENT_HISTORY"],
    engineVersion: progressionEngineVersion,
  };
}
