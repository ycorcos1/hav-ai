import { MockAIProvider, type AIConfig } from "../supabase/functions/_shared/ai";
import type { AuthenticatedAIRequest } from "../supabase/functions/_shared/auth";
import { AIContextFailure, type CoachContextDataSource } from "../supabase/functions/_shared/context";
import { createCoachHandler } from "../supabase/functions/coach/handler";

const userId = "11111111-1111-4111-8111-111111111111";
const exerciseId = "22222222-2222-4222-8222-222222222222";
const config: AIConfig = {
  provider: "mock",
  models: { coach: "mock-coach", explanation: "mock-explanation", parser: "mock-parser" },
};
const authenticated = {
  user: { id: userId },
  client: {},
} as AuthenticatedAIRequest;

function dataSource(overrides: Partial<CoachContextDataSource> = {}): CoachContextDataSource {
  return {
    getProfilePreferences: jest.fn().mockResolvedValue({
      primaryGoal: "strength",
      progressionStyle: "balanced",
      weightUnit: "lb",
      rpePreference: "optional",
    }),
    getAccessibleExercise: jest.fn().mockResolvedValue({
      id: exerciseId,
      name: "Incline Press",
      measurementType: "weighted_reps",
    }),
    getOwnedWorkout: jest.fn().mockResolvedValue({ id: "workout-id" }),
    getExercisePreferenceNote: jest.fn().mockResolvedValue(null),
    getRecentSessions: jest.fn().mockResolvedValue([]),
    getActiveRecommendation: jest.fn().mockResolvedValue(null),
    getTrendMetrics: jest.fn().mockReturnValue({
      direction: "insufficient_data",
      sessionsAnalyzed: 0,
      plateau: "none",
    }),
    ...overrides,
  };
}

function request(body: unknown, token = "token") {
  return new Request("http://localhost/functions/v1/coach", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("coach Edge Function", () => {
  it("authenticates, builds owned context, validates output, and returns the standard envelope", async () => {
    const source = dataSource();
    const provider = new MockAIProvider(() => ({
      answer: "Keep the same load for the next set.",
      recommendation: { action: "Keep 190 lb", rationale: "The last set was RPE 10." },
      warnings: [],
    }));
    const handler = createCoachHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => source,
      provider,
      config,
      createRequestId: () => "request-1",
    });

    const response = await handler(request({ message: "What next?", context: { activeExerciseId: exerciseId } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        answer: "Keep the same load for the next set.",
        contextUsed: { activeWorkout: false, exerciseId, recentSessionsUsed: 0 },
        meta: { promptVersion: "coach-v1" },
      },
      meta: { requestId: "request-1" },
    });
    expect(source.getAccessibleExercise).toHaveBeenCalledWith(userId, exerciseId);
  });

  it("rejects unauthenticated and malformed requests before context or provider work", async () => {
    const provider = new MockAIProvider(() => ({ answer: "unused", warnings: [] }));
    const handler = createCoachHandler({
      authenticate: jest.fn().mockResolvedValue(null),
      createContextDataSource: () => dataSource(),
      provider,
      config,
      createRequestId: () => "request-2",
    });
    const unauthorized = await handler(request({ message: "Question" }));
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED", retryable: false },
    });

    const authenticatedHandler = createCoachHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => dataSource(),
      provider,
      config,
      createRequestId: () => "request-3",
    });
    const invalid = await authenticatedHandler(request({ message: " ".repeat(5) }));
    expect(invalid.status).toBe(400);
  });

  it("returns sanitized resource and malformed-provider failures", async () => {
    const missing = createCoachHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => dataSource({
        getAccessibleExercise: jest.fn().mockRejectedValue(new AIContextFailure("RESOURCE_NOT_FOUND")),
      }),
      provider: new MockAIProvider(() => ({ answer: "unused", warnings: [] })),
      config,
      createRequestId: () => "request-4",
    });
    const missingResponse = await missing(request({
      message: "Question",
      context: { activeExerciseId: exerciseId },
    }));
    expect(missingResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND", message: "The requested resource was not found." },
    });

    const malformed = createCoachHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => dataSource(),
      provider: new MockAIProvider(() => ({ answer: 12, warnings: [] })),
      config,
      createRequestId: () => "request-5",
    });
    const malformedResponse = await malformed(request({ message: "Question" }));
    expect(malformedResponse.status).toBe(502);
    await expect(malformedResponse.json()).resolves.toMatchObject({
      error: { code: "AI_INVALID_RESPONSE", message: "AI is unavailable right now." },
    });
  });

  it("enforces bounded current-session input", async () => {
    const handler = createCoachHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => dataSource(),
      provider: new MockAIProvider(() => ({ answer: "unused", warnings: [] })),
      config,
    });
    const response = await handler(request({
      message: "Question",
      context: {
        activeExerciseId: exerciseId,
        localCurrentSession: {
          workoutId: "33333333-3333-4333-8333-333333333333",
          exerciseId,
          completedSets: Array.from({ length: 21 }, () => ({ reps: 5 })),
        },
      },
    }));
    expect(response.status).toBe(400);
  });
});
