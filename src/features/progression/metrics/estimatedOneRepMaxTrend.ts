import { progressionConfig } from "@/features/progression/config";
import type {
  EstimatedOneRepMaxTrendMetrics,
  ProgressionSetPerformance,
} from "@/features/progression/types";
import { calculateEpleyOneRepMax } from "@/features/metrics";

function bestEstimatedOneRepMax(sets: ProgressionSetPerformance[]): number | null {
  const estimates = sets.flatMap((set) => {
    if (set.weightKg === undefined) return [];
    const estimate = calculateEpleyOneRepMax(set.weightKg, set.reps);
    return estimate === null ? [] : [estimate.estimated1RMKg];
  });
  return estimates.length === 0 ? null : Math.max(...estimates);
}

export function calculateEstimatedOneRepMaxTrendMetrics(
  currentSets: ProgressionSetPerformance[],
  previousSets: ProgressionSetPerformance[],
): EstimatedOneRepMaxTrendMetrics {
  const currentBestEstimated1RMKg = bestEstimatedOneRepMax(currentSets);
  const previousBestEstimated1RMKg = bestEstimatedOneRepMax(previousSets);
  if (currentBestEstimated1RMKg === null || previousBestEstimated1RMKg === null) {
    return {
      currentBestEstimated1RMKg,
      previousBestEstimated1RMKg,
      changePct: null,
      meaningfulChange: "unavailable",
    };
  }

  const changePct =
    ((currentBestEstimated1RMKg - previousBestEstimated1RMKg) /
      previousBestEstimated1RMKg) *
    100;
  const threshold = progressionConfig.meaningfulEstimatedOneRepMaxChangePct;
  return {
    currentBestEstimated1RMKg,
    previousBestEstimated1RMKg,
    changePct,
    meaningfulChange:
      changePct >= threshold ? "improved" : changePct <= -threshold ? "declined" : "unchanged",
  };
}
