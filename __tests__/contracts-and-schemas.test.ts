import type { SyncEntityType } from "@/shared/contracts";
import {
  apiErrorResponseSchema,
  apiSuccessSchema,
  appEnvironmentSchema,
  coachRequestV1Schema,
  coachResponseV1Schema,
  parseWorkoutRequestV1Schema,
  parseWorkoutResponseV1Schema,
  recommendationExplanationV1Schema,
  rpeSchema,
  userProfileSchema,
  weightUnitSchema,
} from "@/shared/schemas";

const workoutId = "123e4567-e89b-42d3-a456-426614174000";
const exerciseId = "123e4567-e89b-42d3-a456-426614174001";

const syncEntityTypes = [
  "workout_template",
  "workout_template_exercise",
  "custom_exercise",
  "workout",
  "workout_exercise",
  "set",
  "user_exercise_preference",
  "progression_recommendation",
] as const satisfies readonly SyncEntityType[];

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type SyncEntitySetIsExact = Assert<Equal<SyncEntityType, (typeof syncEntityTypes)[number]>>;

const syncEntitySetIsExact: SyncEntitySetIsExact = true;

describe("shared contract schemas", () => {
  it("keeps the exact eight-entity V1 sync set without personal records", () => {
    expect(syncEntitySetIsExact).toBe(true);
    expect(syncEntityTypes).toHaveLength(8);
    expect(syncEntityTypes).toContain("user_exercise_preference");
    expect(syncEntityTypes).not.toContain("personal_record");
  });

  it("accepts only canonical environments, RPE values, and weight units", () => {
    expect(appEnvironmentSchema.parse("preview")).toBe("preview");
    expect(rpeSchema.parse(8.5)).toBe(8.5);
    expect(weightUnitSchema.parse("kg")).toBe("kg");

    expect(appEnvironmentSchema.safeParse("staging").success).toBe(false);
    expect(rpeSchema.safeParse(8.25).success).toBe(false);
    expect(rpeSchema.safeParse(10.5).success).toBe(false);
    expect(weightUnitSchema.safeParse("stone").success).toBe(false);
  });

  it("validates the current V1 profile shape and rest-duration constraint", () => {
    const profile = {
      userId: workoutId,
      displayName: "Yahav",
      weightUnit: "lb",
      primaryGoal: "hybrid",
      rpePreference: "optional",
      progressionStyle: "balanced",
      defaultRestDurationSeconds: 120,
      onboardingCompleted: true,
      createdAt: "2026-08-29T12:00:00.000Z",
      updatedAt: "2026-08-29T12:00:00.000Z",
    };

    expect(userProfileSchema.parse(profile)).toEqual(profile);
    expect(userProfileSchema.safeParse({ ...profile, primaryGoal: undefined }).success).toBe(false);
    expect(userProfileSchema.safeParse({ ...profile, defaultRestDurationSeconds: 0 }).success).toBe(
      false,
    );
  });

  it("validates nested coach requests and rejects malformed session data", () => {
    const request = {
      message: "How should I approach my next set?",
      context: {
        activeWorkoutId: workoutId,
        activeExerciseId: exerciseId,
        localCurrentSession: {
          workoutId,
          exerciseId,
          currentTarget: {
            weightKg: 86.18,
            minReps: 6,
            maxReps: 8,
            targetSets: 3,
          },
          completedSets: [{ weightKg: 86.18, reps: 6, rpe: 9 }],
        },
      },
    };

    expect(coachRequestV1Schema.parse(request)).toEqual(request);
    expect(
      coachRequestV1Schema.safeParse({
        ...request,
        context: {
          ...request.context,
          localCurrentSession: {
            ...request.context.localCurrentSession,
            completedSets: [{ weightKg: -1, reps: 6, rpe: 11 }],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("validates every structured V1 AI response shape", () => {
    const coachResponse = {
      answer: "Keep the current load for the next set.",
      warnings: [],
      contextUsed: {
        activeWorkout: true,
        exerciseId,
        recentSessionsUsed: 3,
        subjectiveNotesUsed: {
          exercisePreference: false,
          workout: false,
          setCount: 0,
        },
      },
      meta: { promptVersion: "coach-v1" },
    };
    const explanation = {
      headline: "Increase next session",
      summary: "You reached the top of the target range.",
      evidence: ["Completed 8 reps on all three working sets."],
      meta: { promptVersion: "explanation-v1" },
    };
    const parsedWorkout = {
      sets: [{ weight: 185, unit: "lb", reps: 8, rpe: 8.5 }],
      confidence: "high",
      ambiguities: [],
      meta: { promptVersion: "parser-v1" },
    };

    expect(coachResponseV1Schema.parse(coachResponse)).toEqual(coachResponse);
    expect(recommendationExplanationV1Schema.parse(explanation)).toEqual(explanation);
    expect(parseWorkoutResponseV1Schema.parse(parsedWorkout)).toEqual(parsedWorkout);
    expect(
      coachResponseV1Schema.safeParse({
        ...coachResponse,
        contextUsed: { activeWorkout: true },
      }).success,
    ).toBe(false);
    expect(
      parseWorkoutResponseV1Schema.safeParse({
        ...parsedWorkout,
        sets: [{ weight: 185, unit: "lb", reps: "eight" }],
      }).success,
    ).toBe(false);
  });

  it("validates parser requests and standard API envelopes", () => {
    const request = {
      text: "185x8 @8",
      exerciseId,
      displayUnit: "lb",
    };
    const response = {
      sets: [{ weight: 185, unit: "lb", reps: 8, rpe: 8 }],
      confidence: "high",
      ambiguities: [],
      meta: { promptVersion: "parser-v1" },
    };
    const successSchema = apiSuccessSchema(parseWorkoutResponseV1Schema);

    expect(parseWorkoutRequestV1Schema.parse(request)).toEqual(request);
    expect(successSchema.parse({ ok: true, data: response })).toEqual({ ok: true, data: response });
    expect(
      apiErrorResponseSchema.parse({
        ok: false,
        error: {
          code: "AI_INVALID_RESPONSE",
          message: "The provider returned malformed output.",
          retryable: true,
        },
      }),
    ).toBeDefined();
    expect(parseWorkoutRequestV1Schema.safeParse({ ...request, text: "" }).success).toBe(false);
  });
});
