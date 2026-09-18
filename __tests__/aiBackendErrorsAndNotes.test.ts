import { AIProviderFailure } from "../supabase/functions/_shared/ai";
import {
  AIContextFailure,
  MAX_AI_NOTE_CHARACTERS,
  MAX_AI_NOTE_CONTEXT_CHARACTERS,
  MAX_AI_SET_NOTES,
  buildCoachContext,
  buildMinimizedNoteContext,
  type CoachContextDataSource,
} from "../supabase/functions/_shared/context";
import {
  AIFunctionFailure,
  mapAIFunctionError,
} from "../supabase/functions/_shared/functionErrors";

async function errorBody(error: unknown) {
  const response = mapAIFunctionError(error, "request-id");
  return { status: response.status, body: await response.json() };
}

describe("AI backend error mapping", () => {
  it.each([
    [new AIFunctionFailure("UNAUTHORIZED"), 401, "UNAUTHORIZED", false],
    [new AIFunctionFailure("FORBIDDEN"), 403, "FORBIDDEN", false],
    [new AIFunctionFailure("INVALID_REQUEST"), 400, "INVALID_REQUEST", false],
    [new AIProviderFailure("TIMEOUT"), 504, "AI_TIMEOUT", true],
    [new AIProviderFailure("RATE_LIMITED"), 429, "RATE_LIMITED", true],
    [new AIProviderFailure("PROVIDER_ERROR"), 503, "AI_PROVIDER_ERROR", true],
    [new AIProviderFailure("INVALID_RESPONSE"), 502, "AI_INVALID_RESPONSE", true],
    [new AIContextFailure("CONTEXT_UNAVAILABLE"), 500, "AI_CONTEXT_ERROR", true],
  ])("maps %s to a sanitized API envelope", async (error, status, code, retryable) => {
    await expect(errorBody(error)).resolves.toMatchObject({
      status,
      body: {
        ok: false,
        error: { code, retryable },
        meta: { requestId: "request-id" },
      },
    });
    const result = await errorBody(error);
    expect(JSON.stringify(result.body)).not.toContain("providerDetail");
    expect(JSON.stringify(result.body)).not.toContain("database");
  });
});

describe("minimized AI note context", () => {
  it("selects only bounded relevant notes and labels them subjective", () => {
    const oversized = "x".repeat(MAX_AI_NOTE_CHARACTERS + 200);
    const context = buildMinimizedNoteContext({
      exercisePreferenceNote: oversized,
      localCurrentSession: {
        workoutId: "current-workout",
        exerciseId: "exercise-id",
        workoutNotes: "Current workout note",
        completedSets: Array.from({ length: 8 }, (_, index) => ({
          reps: 5,
          notes: `Current set note ${index}`,
        })),
      },
      recentSessions: [{
        workoutId: "recent-workout",
        workoutExerciseId: "recent-workout-exercise",
        completedAt: "2026-09-17T12:00:00.000Z",
        workoutNotes: "Relevant recent workout note",
        exerciseNotes: "Configuration note that is not a persistent exercise note",
        sets: [{ reps: 5, notes: "Relevant recent set note" }],
      }],
    });

    expect(context.authority).toBe("user-authored subjective context");
    expect(context.exercisePreference).toHaveLength(MAX_AI_NOTE_CHARACTERS);
    expect(context.setNotes).toHaveLength(MAX_AI_SET_NOTES);
    expect(JSON.stringify(context)).not.toContain("Configuration note");
    const selectedCharacters = (context.exercisePreference?.length ?? 0)
      + context.workoutNotes.reduce((total, note) => total + note.text.length, 0)
      + context.setNotes.reduce((total, note) => total + note.text.length, 0);
    expect(selectedCharacters).toBeLessThanOrEqual(MAX_AI_NOTE_CONTEXT_CHARACTERS);
  });

  it("keeps notes out of deterministic trend calculation and structured facts", async () => {
    let trendInput: readonly unknown[] = [];
    const source: CoachContextDataSource = {
      getProfilePreferences: jest.fn().mockResolvedValue({
        primaryGoal: "strength",
        progressionStyle: "balanced",
        weightUnit: "lb",
        rpePreference: "optional",
      }),
      getAccessibleExercise: jest.fn().mockResolvedValue({
        id: "exercise-id",
        name: "Bench Press",
        measurementType: "weighted_reps",
      }),
      getOwnedWorkout: jest.fn().mockResolvedValue(null),
      getExercisePreferenceNote: jest.fn().mockResolvedValue("Persistent exercise note"),
      getRecentSessions: jest.fn().mockResolvedValue([{
        workoutId: "workout-id",
        workoutExerciseId: "workout-exercise-id",
        completedAt: "2026-09-17T12:00:00.000Z",
        workoutNotes: "Workout note",
        exerciseNotes: "Unrelated configuration note",
        sets: [{ weightKg: 100, reps: 5, notes: "Set note" }],
      }]),
      getActiveRecommendation: jest.fn().mockResolvedValue(null),
      getTrendMetrics: jest.fn((sessions) => {
        trendInput = sessions;
        return { direction: "insufficient_data", sessionsAnalyzed: 1, plateau: "none" };
      }),
    };

    const context = await buildCoachContext({
      userId: "user-id",
      exerciseId: "exercise-id",
      dataSource: source,
    });

    expect(trendInput).toEqual([{
      workoutId: "workout-id",
      workoutExerciseId: "workout-exercise-id",
      completedAt: "2026-09-17T12:00:00.000Z",
      sets: [{ weightKg: 100, reps: 5 }],
    }]);
    expect(context.recentSessions).toEqual(trendInput);
    expect(context.subjectiveNotes).toMatchObject({
      authority: "user-authored subjective context",
      exercisePreference: "Persistent exercise note",
      workoutNotes: [{ workoutId: "workout-id", text: "Workout note" }],
      setNotes: [{ workoutId: "workout-id", text: "Set note" }],
    });
    expect(JSON.stringify(context.subjectiveNotes)).not.toContain("Unrelated configuration note");
  });
});
