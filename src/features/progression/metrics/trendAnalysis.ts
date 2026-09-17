import { progressionConfig } from "@/features/progression/config";
import { calculateEstimatedOneRepMaxTrendMetrics } from "./estimatedOneRepMaxTrend";
import { calculateRepMetrics } from "./repMetrics";
import { calculateRpeMetrics, classifyMeaningfulRpeChange } from "./rpeMetrics";
import { detectPlateau } from "@/features/progression/metrics/plateauDetection";
import type { ExerciseSessionPerformance, ExerciseTrend } from "@/shared/contracts";

export function analyzeExerciseTrend(sessions: ExerciseSessionPerformance[]): ExerciseTrend {
  const ordered = [...sessions]
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
    .slice(-progressionConfig.maximumTrendWindowSessions);

  if (ordered.length < progressionConfig.minimumComparableSessionsForTrend) {
    return { direction: "insufficient_data", sessionsAnalyzed: ordered.length, plateau: "none" };
  }

  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  const totalRepChange =
    calculateRepMetrics(latest.sets).totalReps - calculateRepMetrics(first.sets).totalReps;
  const estimatedOneRepMax = calculateEstimatedOneRepMaxTrendMetrics(latest.sets, first.sets);
  const firstRpe = calculateRpeMetrics(first.sets).averageRpe;
  const latestRpe = calculateRpeMetrics(latest.sets).averageRpe;
  const averageRpeChange =
    firstRpe === null || latestRpe === null ? undefined : latestRpe - firstRpe;
  const rpeChange = classifyMeaningfulRpeChange(latestRpe, firstRpe);
  const repImproved = totalRepChange >= progressionConfig.meaningfulTotalRepChange;
  const repDeclined = totalRepChange <= -progressionConfig.meaningfulTotalRepChange;
  const improved =
    repImproved ||
    estimatedOneRepMax.meaningfulChange === "improved" ||
    rpeChange === "improved";
  const declined =
    repDeclined ||
    estimatedOneRepMax.meaningfulChange === "declined" ||
    rpeChange === "worsened";
  const direction = improved === declined ? "flat" : improved ? "improving" : "declining";
  const plateau = detectPlateau({
    comparableSessionCount: ordered.length,
    trendDirection: direction,
    hasMeaningfulRepImprovement: repImproved,
    hasMeaningfulEstimatedOneRepMaxImprovement:
      estimatedOneRepMax.meaningfulChange === "improved",
    hasMeaningfulRpeImprovement: rpeChange === "improved",
  });

  return {
    direction,
    sessionsAnalyzed: ordered.length,
    totalRepChange,
    estimated1RMChangePct: estimatedOneRepMax.changePct ?? undefined,
    averageRpeChange,
    plateau,
  };
}
