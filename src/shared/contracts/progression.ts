import type { PrimaryGoal, ProgressionStyle } from "./auth";
import type { ISODateTime, RPE, UUID, WeightKg } from "./common";
import type { EquipmentType, MeasurementType } from "./exercises";

export type ProgressionRecommendationType =
  | "increase_weight"
  | "maintain_weight"
  | "increase_reps"
  | "repeat_target"
  | "decrease_weight"
  | "insufficient_data";

export type ProgressionConfidence = "low" | "medium" | "high";

export type ProgressionReasonCode =
  | "INITIAL_BASELINE_ESTABLISHED"
  | "TOP_OF_REP_RANGE_REACHED"
  | "REP_RANGE_EXCEEDED"
  | "REP_RANGE_MAXED"
  | "WITHIN_TARGET_RANGE"
  | "BELOW_TARGET_RANGE"
  | "TOTAL_REPS_IMPROVED"
  | "TOTAL_REPS_DECLINED"
  | "PERFORMANCE_REPEATED"
  | "RPE_ACCEPTABLE"
  | "RPE_HIGH"
  | "RPE_IMPROVED"
  | "RPE_WORSENED"
  | "RPE_UNAVAILABLE"
  | "INCOMPLETE_TARGET_SETS"
  | "EXTRA_SETS_PERFORMED"
  | "MIXED_WORKING_LOADS"
  | "SINGLE_SESSION_UNDERPERFORMANCE"
  | "REPEATED_UNDERPERFORMANCE"
  | "REPEATED_FAILED_PROGRESSION"
  | "UNUSUAL_PERFORMANCE_DROP"
  | "MULTI_SESSION_STALL"
  | "PLATEAU_DETECTED"
  | "ESTIMATED_1RM_IMPROVED"
  | "ESTIMATED_1RM_DECLINED"
  | "SMALLEST_INCREMENT_TOO_LARGE"
  | "INSUFFICIENT_HISTORY";

export type ProgressionRecommendation = {
  id: UUID;
  userId: UUID;
  exerciseId: UUID;
  sourceWorkoutId?: UUID;
  sourceWorkoutExerciseId?: UUID;
  recommendationType: ProgressionRecommendationType;
  recommendedWeightKg?: WeightKg;
  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;
  targetSetReps?: number[];
  confidence: ProgressionConfidence;
  reasonCodes: ProgressionReasonCode[];
  status: "active" | "consumed" | "superseded";
  engineVersion: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  consumedAt?: ISODateTime;
};

export type ExerciseSessionPerformance = {
  workoutId: UUID;
  completedAt: ISODateTime;
  sets: {
    weightKg?: WeightKg;
    reps: number;
    rpe?: RPE;
  }[];
};

export type ProgressionInput = {
  exercise: {
    exerciseId: UUID;
    measurementType: MeasurementType;
    equipmentType: EquipmentType;
  };
  currentTarget: {
    targetSets: number;
    minReps: number;
    maxReps: number;
    targetWeightKg?: WeightKg;
    targetSetReps?: number[];
  };
  currentSession: ExerciseSessionPerformance;
  recentSessions: ExerciseSessionPerformance[];
  preferences: {
    primaryGoal: PrimaryGoal;
    progressionStyle: ProgressionStyle;
  };
  availableWeightIncrementKg?: WeightKg;
};

export type ProgressionResult = {
  recommendationType: ProgressionRecommendationType;
  recommendedWeightKg?: WeightKg;
  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;
  targetSetReps?: number[];
  confidence: ProgressionConfidence;
  reasonCodes: ProgressionReasonCode[];
  engineVersion: string;
};

export type ExerciseTrend = {
  direction: "improving" | "flat" | "declining" | "insufficient_data";
  sessionsAnalyzed: number;
  totalRepChange?: number;
  estimated1RMChangePct?: number;
  averageRpeChange?: number;
  plateau: "none" | "possible" | "likely";
};
