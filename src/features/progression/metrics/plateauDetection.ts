import { progressionConfig } from "@/features/progression/config/index.ts";

export type PlateauDetectionInput = {
  comparableSessionCount: number;
  trendDirection: "improving" | "flat" | "declining" | "insufficient_data";
  hasMeaningfulRepImprovement: boolean;
  hasMeaningfulEstimatedOneRepMaxImprovement: boolean;
  hasMeaningfulRpeImprovement: boolean;
};

export function detectPlateau({
  comparableSessionCount,
  trendDirection,
  hasMeaningfulRepImprovement,
  hasMeaningfulEstimatedOneRepMaxImprovement,
  hasMeaningfulRpeImprovement,
}: PlateauDetectionInput): "none" | "possible" | "likely" {
  if (
    comparableSessionCount < progressionConfig.minimumComparableSessionsForPossiblePlateau ||
    trendDirection !== "flat" ||
    hasMeaningfulRepImprovement ||
    hasMeaningfulEstimatedOneRepMaxImprovement ||
    hasMeaningfulRpeImprovement
  ) {
    return "none";
  }
  return comparableSessionCount >= progressionConfig.minimumComparableSessionsForLikelyPlateau
    ? "likely"
    : "possible";
}
