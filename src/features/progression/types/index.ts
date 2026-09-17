import type { ExerciseSessionPerformance } from "@/shared/contracts";

export type ProgressionSetPerformance = ExerciseSessionPerformance["sets"][number];

export type SessionClassification =
  | "perfect"
  | "successful"
  | "partial_underperformance"
  | "severe_underperformance"
  | "irregular";

export type RepMetrics = {
  totalReps: number;
  averageReps: number | null;
  bestSetReps: number | null;
  workingSetCount: number;
};

export type RpeMetrics = {
  coverage: number;
  averageRpe: number | null;
  setsWithRpe: number;
  workingSetCount: number;
};

export type MeaningfulRpeChange = "improved" | "worsened" | "unchanged" | "unavailable";

export type EstimatedOneRepMaxTrendMetrics = {
  currentBestEstimated1RMKg: number | null;
  previousBestEstimated1RMKg: number | null;
  changePct: number | null;
  meaningfulChange: "improved" | "declined" | "unchanged" | "unavailable";
};

export type WeightIncrementSelection = {
  recommendedWeightKg: number | null;
  incrementKg: number | null;
  guardrailExceeded: boolean;
  usedPreviousSuccessfulLoad: boolean;
};
