import type {
  ExerciseTrend,
  ProgressionInput,
  ProgressionReasonCode,
  ProgressionRecommendationType,
} from "@/shared/contracts";
import type { RepMetrics, RpeMetrics, SessionClassification } from "@/features/progression/types";

export type ProgressionContext = {
  input: ProgressionInput;
  classification: SessionClassification;
  recentClassifications: SessionClassification[];
  repMetrics: RepMetrics;
  rpeMetrics: RpeMetrics;
  trend: ExerciseTrend;
  hasMixedLoads: boolean;
  repeatedUnderperformance: boolean;
  previousSuccessfulWeightKg?: number;
};

export type ProgressionDecision = {
  recommendationType: ProgressionRecommendationType;
  recommendedWeightKg?: number;
  targetSetReps?: number[];
  reasonCodes: ProgressionReasonCode[];
};
