import { z } from "zod";

import type { MuscleGroup, ProgressionReasonCode } from "@/shared/contracts";

export const muscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
  "full_body",
  "other",
]) satisfies z.ZodType<MuscleGroup>;

export const muscleGroupsSchema = z.array(muscleGroupSchema);

export const progressionReasonCodeSchema = z.enum([
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
]) satisfies z.ZodType<ProgressionReasonCode>;

export const progressionReasonCodesSchema = z.array(progressionReasonCodeSchema);
export const targetSetRepsSchema = z.array(z.number().int().positive());
