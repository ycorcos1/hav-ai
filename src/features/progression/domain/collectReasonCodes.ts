import { progressionConfig } from "@/features/progression/config";
import type { ProgressionReasonCode } from "@/shared/contracts";
import type { ProgressionContext, ProgressionDecision } from "./progressionContext";

const reasonOrder: ProgressionReasonCode[] = [
  "INITIAL_BASELINE_ESTABLISHED",
  "TOP_OF_REP_RANGE_REACHED",
  "REP_RANGE_EXCEEDED",
  "REP_RANGE_MAXED",
  "WITHIN_TARGET_RANGE",
  "BELOW_TARGET_RANGE",
  "TOTAL_REPS_IMPROVED",
  "TOTAL_REPS_DECLINED",
  "PERFORMANCE_REPEATED",
  "RPE_ACCEPTABLE",
  "RPE_HIGH",
  "RPE_IMPROVED",
  "RPE_WORSENED",
  "RPE_UNAVAILABLE",
  "INCOMPLETE_TARGET_SETS",
  "EXTRA_SETS_PERFORMED",
  "MIXED_WORKING_LOADS",
  "SINGLE_SESSION_UNDERPERFORMANCE",
  "REPEATED_UNDERPERFORMANCE",
  "REPEATED_FAILED_PROGRESSION",
  "UNUSUAL_PERFORMANCE_DROP",
  "MULTI_SESSION_STALL",
  "PLATEAU_DETECTED",
  "ESTIMATED_1RM_IMPROVED",
  "ESTIMATED_1RM_DECLINED",
  "SMALLEST_INCREMENT_TOO_LARGE",
  "INSUFFICIENT_HISTORY",
];

export function collectReasonCodes(
  context: ProgressionContext,
  decision: ProgressionDecision,
): ProgressionReasonCode[] {
  const reasons = new Set(decision.reasonCodes);
  const setCount = context.input.currentSession.sets.length;
  if (context.input.recentSessions.length === 0) reasons.add("INITIAL_BASELINE_ESTABLISHED");
  if (setCount < context.input.currentTarget.targetSets) reasons.add("INCOMPLETE_TARGET_SETS");
  if (setCount > context.input.currentTarget.targetSets) reasons.add("EXTRA_SETS_PERFORMED");
  if (context.hasMixedLoads) reasons.add("MIXED_WORKING_LOADS");
  if (
    context.input.currentSession.sets.some(
      (set) => set.reps > context.input.currentTarget.maxReps,
    )
  ) {
    reasons.add("REP_RANGE_EXCEEDED");
  }
  if (context.rpeMetrics.coverage === 0) reasons.add("RPE_UNAVAILABLE");
  else if ((context.rpeMetrics.averageRpe ?? 0) >= progressionConfig.highRpeThreshold) {
    reasons.add("RPE_HIGH");
  } else {
    reasons.add("RPE_ACCEPTABLE");
  }
  if (context.trend.direction === "improving") reasons.add("TOTAL_REPS_IMPROVED");
  if (context.trend.direction === "declining") reasons.add("TOTAL_REPS_DECLINED");
  if (
    (context.trend.estimated1RMChangePct ?? 0) >=
    progressionConfig.meaningfulEstimatedOneRepMaxChangePct
  ) {
    reasons.add("ESTIMATED_1RM_IMPROVED");
  } else if (
    (context.trend.estimated1RMChangePct ?? 0) <=
    -progressionConfig.meaningfulEstimatedOneRepMaxChangePct
  ) {
    reasons.add("ESTIMATED_1RM_DECLINED");
  }
  if ((context.trend.averageRpeChange ?? 0) <= -progressionConfig.meaningfulRpeChange) {
    reasons.add("RPE_IMPROVED");
  } else if ((context.trend.averageRpeChange ?? 0) >= progressionConfig.meaningfulRpeChange) {
    reasons.add("RPE_WORSENED");
  }
  if (context.trend.direction === "flat") reasons.add("PERFORMANCE_REPEATED");
  if (context.trend.plateau === "possible") reasons.add("MULTI_SESSION_STALL");
  if (context.trend.plateau === "likely") {
    reasons.add("MULTI_SESSION_STALL");
    reasons.add("PLATEAU_DETECTED");
  }
  if (
    context.classification === "severe_underperformance" &&
    context.recentClassifications.some(
      (classification) => classification === "successful" || classification === "perfect",
    )
  ) {
    reasons.add("UNUSUAL_PERFORMANCE_DROP");
  }
  return reasonOrder.filter((reason) => reasons.has(reason));
}
