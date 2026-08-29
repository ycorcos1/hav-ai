import { z } from "zod";

import type {
  ApiErrorResponse,
  CoachRequestV1,
  CoachResponseV1,
  ExplainRecommendationRequestV1,
  ParseWorkoutRequestV1,
  ParseWorkoutResponseV1,
  RecommendationExplanationV1,
} from "@/shared/contracts";

import { rpeSchema, uuidSchema, weightKgSchema } from "./common";
import { weightUnitSchema } from "./profile";

const nonNegativeIntegerSchema = z.number().int().nonnegative();
const positiveIntegerSchema = z.number().int().positive();

const currentTargetSchema = z
  .object({
    weightKg: weightKgSchema.optional(),
    minReps: positiveIntegerSchema,
    maxReps: positiveIntegerSchema,
    targetSets: positiveIntegerSchema,
  })
  .strict()
  .refine(({ minReps, maxReps }) => maxReps >= minReps, {
    message: "maxReps must be greater than or equal to minReps",
    path: ["maxReps"],
  });

const completedSetSchema = z
  .object({
    weightKg: weightKgSchema.optional(),
    reps: nonNegativeIntegerSchema,
    rpe: rpeSchema.optional(),
    notes: z.string().optional(),
  })
  .strict();

export const coachRequestV1Schema = z
  .object({
    message: z.string().trim().min(1),
    context: z
      .object({
        activeWorkoutId: uuidSchema.optional(),
        activeExerciseId: uuidSchema.optional(),
        localCurrentSession: z
          .object({
            workoutId: uuidSchema,
            exerciseId: uuidSchema,
            currentTarget: currentTargetSchema.optional(),
            completedSets: z.array(completedSetSchema),
            workoutNotes: z.string().optional(),
            exercisePreferenceNotes: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    conversation: z
      .object({
        messages: z.array(
          z
            .object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
  })
  .strict() satisfies z.ZodType<CoachRequestV1>;

export const coachResponseV1Schema = z
  .object({
    answer: z.string(),
    recommendation: z
      .object({
        action: z.string(),
        rationale: z.string(),
      })
      .strict()
      .optional(),
    warnings: z.array(z.string()),
    contextUsed: z
      .object({
        activeWorkout: z.boolean(),
        exerciseId: uuidSchema.optional(),
        recentSessionsUsed: nonNegativeIntegerSchema,
        subjectiveNotesUsed: z
          .object({
            exercisePreference: z.boolean(),
            workout: z.boolean(),
            setCount: nonNegativeIntegerSchema,
          })
          .strict(),
      })
      .strict(),
    meta: z
      .object({
        promptVersion: z.string(),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<CoachResponseV1>;

export const explainRecommendationRequestV1Schema = z
  .object({
    recommendationId: uuidSchema,
  })
  .strict() satisfies z.ZodType<ExplainRecommendationRequestV1>;

export const recommendationExplanationV1Schema = z
  .object({
    headline: z.string(),
    summary: z.string(),
    evidence: z.array(z.string()),
    caution: z.string().optional(),
    meta: z
      .object({
        promptVersion: z.string(),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<RecommendationExplanationV1>;

export const parseWorkoutRequestV1Schema = z
  .object({
    text: z.string().trim().min(1),
    exerciseId: uuidSchema,
    displayUnit: weightUnitSchema,
  })
  .strict() satisfies z.ZodType<ParseWorkoutRequestV1>;

export const parseWorkoutResponseV1Schema = z
  .object({
    sets: z.array(
      z
        .object({
          weight: z.number().finite().nonnegative().optional(),
          unit: weightUnitSchema.optional(),
          reps: nonNegativeIntegerSchema,
          rpe: rpeSchema.optional(),
        })
        .strict(),
    ),
    confidence: z.enum(["low", "medium", "high"]),
    ambiguities: z.array(z.string()),
    meta: z
      .object({
        promptVersion: z.string(),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<ParseWorkoutResponseV1>;

export const apiErrorResponseSchema = z
  .object({
    ok: z.literal(false),
    error: z
      .object({
        code: z.enum([
          "UNAUTHORIZED",
          "FORBIDDEN",
          "INVALID_REQUEST",
          "NOT_FOUND",
          "RATE_LIMITED",
          "AI_TIMEOUT",
          "AI_PROVIDER_ERROR",
          "AI_INVALID_RESPONSE",
          "AI_CONTEXT_ERROR",
          "INTERNAL_ERROR",
        ]),
        message: z.string(),
        retryable: z.boolean(),
      })
      .strict(),
    meta: z
      .object({
        requestId: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict() satisfies z.ZodType<ApiErrorResponse>;

export function apiSuccessSchema<T extends z.ZodType>(dataSchema: T) {
  return z
    .object({
      ok: z.literal(true),
      data: dataSchema,
      meta: z
        .object({
          requestId: z.string().optional(),
        })
        .strict()
        .optional(),
    })
    .strict();
}
