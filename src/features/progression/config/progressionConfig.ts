export const progressionConfig = {
  weightComparisonToleranceKg: 0.01,
  meaningfulRpeChange: 1,
  meaningfulEstimatedOneRepMaxChangePct: 2,
  minimumComparableSessionsForTrend: 3,
  minimumComparableSessionsForPossiblePlateau: 3,
  minimumComparableSessionsForLikelyPlateau: 4,
  maximumTrendWindowSessions: 5,
  highRpeThreshold: 9.5,
  severeUnderperformanceRepRatio: 0.75,
  meaningfulTotalRepChange: 1,
  maximumReasonableLoadIncreasePct: 10,
} as const;
