import { progressionConfig } from "@/features/progression/config";
import type {
  MeaningfulRpeChange,
  ProgressionSetPerformance,
  RpeMetrics,
} from "@/features/progression/types";

export function calculateRpeMetrics(sets: ProgressionSetPerformance[]): RpeMetrics {
  const rpeValues = sets.flatMap((set) => (set.rpe === undefined ? [] : [set.rpe]));
  return {
    coverage: sets.length === 0 ? 0 : rpeValues.length / sets.length,
    averageRpe:
      rpeValues.length === 0
        ? null
        : rpeValues.reduce((total, rpe) => total + rpe, 0) / rpeValues.length,
    setsWithRpe: rpeValues.length,
    workingSetCount: sets.length,
  };
}

export function classifyMeaningfulRpeChange(
  currentAverageRpe: number | null,
  previousAverageRpe: number | null,
): MeaningfulRpeChange {
  if (currentAverageRpe === null || previousAverageRpe === null) return "unavailable";
  const change = currentAverageRpe - previousAverageRpe;
  if (change <= -progressionConfig.meaningfulRpeChange) return "improved";
  if (change >= progressionConfig.meaningfulRpeChange) return "worsened";
  return "unchanged";
}
