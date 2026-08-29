import { z } from "zod";

import type {
  PrimaryGoal,
  ProgressionStyle,
  RpePreference,
  UserProfile,
  WeightUnit,
} from "@/shared/contracts";

import { isoDateTimeSchema, uuidSchema } from "./common";

export const weightUnitSchema = z.enum(["lb", "kg"]) satisfies z.ZodType<WeightUnit>;

export const primaryGoalSchema = z.enum([
  "strength",
  "hypertrophy",
  "hybrid",
]) satisfies z.ZodType<PrimaryGoal>;

export const rpePreferenceSchema = z.enum([
  "hidden",
  "optional",
  "preferred",
]) satisfies z.ZodType<RpePreference>;

export const progressionStyleSchema = z.enum([
  "conservative",
  "balanced",
  "aggressive",
]) satisfies z.ZodType<ProgressionStyle>;

export const userProfileSchema = z
  .object({
    userId: uuidSchema,
    displayName: z.string().optional(),
    weightUnit: weightUnitSchema,
    primaryGoal: primaryGoalSchema,
    rpePreference: rpePreferenceSchema,
    progressionStyle: progressionStyleSchema,
    defaultRestDurationSeconds: z.number().int().positive(),
    onboardingCompleted: z.boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<UserProfile>;
