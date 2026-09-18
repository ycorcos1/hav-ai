import { MockAIProvider, type AIConfig } from "../supabase/functions/_shared/ai";
import type { AuthenticatedAIRequest } from "../supabase/functions/_shared/auth";
import type { RecommendationContextDataSource } from "../supabase/functions/_shared/context";
import { createExplanationHandler } from "../supabase/functions/explain-recommendation/handler";
import { createParserHandler } from "../supabase/functions/parse-workout/handler";

const userId = "11111111-1111-4111-8111-111111111111";
const exerciseId = "22222222-2222-4222-8222-222222222222";
const recommendationId = "33333333-3333-4333-8333-333333333333";
const authenticated = { user: { id: userId }, client: {} } as AuthenticatedAIRequest;
const config: AIConfig = {
  provider: "mock",
  models: { coach: "mock-coach", explanation: "mock-explanation", parser: "mock-parser" },
};

function post(path: string, body: unknown) {
  return new Request(`http://localhost/functions/v1/${path}`, {
    method: "POST",
    headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function explanationSource(): RecommendationContextDataSource {
  const recommendation = {
    id: recommendationId,
    exerciseId,
    recommendationType: "increase_weight",
    confidence: "high",
    reasonCodes: ["TOP_OF_REP_RANGE_REACHED"],
    status: "active",
    engineVersion: "progression-v1",
  };
  return {
    getOwnedRecommendation: jest.fn().mockResolvedValue(recommendation),
    getAccessibleExercise: jest.fn().mockResolvedValue({
      id: exerciseId,
      name: "Incline Press",
      measurementType: "weighted_reps",
    }),
    getRecentSessions: jest.fn().mockResolvedValue([]),
    getSourceSession: jest.fn().mockResolvedValue(null),
    getProfilePreferences: jest.fn().mockResolvedValue({
      primaryGoal: "strength",
      progressionStyle: "balanced",
      weightUnit: "lb",
      rpePreference: "optional",
    }),
    getTrendMetrics: jest.fn().mockReturnValue({
      direction: "insufficient_data",
      sessionsAnalyzed: 0,
      plateau: "none",
    }),
  };
}

describe("recommendation explanation Edge Function", () => {
  it("resolves the owned canonical recommendation and explains without replacing it", async () => {
    const source = explanationSource();
    let providerInput: unknown;
    const handler = createExplanationHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => source,
      provider: new MockAIProvider((request) => {
        providerInput = request.input;
        return {
          headline: "Move up next session",
          summary: "You reached the top of the target range.",
          evidence: ["Reason: TOP_OF_REP_RANGE_REACHED"],
          caution: null,
        };
      }),
      config,
      createRequestId: () => "explain-request",
    });

    const response = await handler(post("explain-recommendation", { recommendationId }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        headline: "Move up next session",
        meta: { promptVersion: "explanation-v1" },
      },
    });
    expect(source.getOwnedRecommendation).toHaveBeenCalledWith(userId, recommendationId);
    expect(providerInput).toMatchObject({
      recommendation: { id: recommendationId, recommendationType: "increase_weight" },
      authority: { deterministicRecommendation: "authoritative" },
    });
  });

  it("rejects malformed output without exposing it", async () => {
    const handler = createExplanationHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => explanationSource(),
      provider: new MockAIProvider(() => ({ headline: "Missing fields" })),
      config,
    });
    const response = await handler(post("explain-recommendation", { recommendationId }));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "AI_INVALID_RESPONSE" } });
  });
});

describe("parse workout Edge Function", () => {
  it("returns candidate sets and ambiguities without persistence", async () => {
    const getAccessibleExercise = jest.fn().mockResolvedValue({
      id: exerciseId,
      name: "Incline Press",
      measurementType: "weighted_reps",
    });
    const handler = createParserHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => ({ getAccessibleExercise }),
      provider: new MockAIProvider(() => ({
        sets: [
          { weight: 185, unit: "lb", reps: 8 },
          { weight: 185, unit: "lb", reps: 7 },
          { weight: 185, unit: "lb", reps: 6, rpe: 10 },
        ],
        confidence: "high",
        ambiguities: [],
      })),
      config,
      createRequestId: () => "parse-request",
    });

    const response = await handler(post("parse-workout", {
      text: "185 for 8 7 6, last one failure",
      exerciseId,
      displayUnit: "lb",
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        sets: [
          { weight: 185, unit: "lb", reps: 8 },
          { weight: 185, unit: "lb", reps: 7 },
          { weight: 185, unit: "lb", reps: 6, rpe: 10 },
        ],
        confidence: "high",
        ambiguities: [],
        meta: { promptVersion: "parser-v1" },
      },
    });
    expect(getAccessibleExercise).toHaveBeenCalledWith(userId, exerciseId);
  });

  it("rejects an inaccessible exercise before calling AI", async () => {
    const resolver = jest.fn();
    const handler = createParserHandler({
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => ({ getAccessibleExercise: jest.fn().mockResolvedValue(null) }),
      provider: new MockAIProvider(resolver),
      config,
    });
    const response = await handler(post("parse-workout", {
      text: "185 for 8",
      exerciseId,
      displayUnit: "lb",
    }));
    expect(response.status).toBe(404);
    expect(resolver).not.toHaveBeenCalled();
  });

  it("surfaces ambiguity and rejects malformed candidate structures", async () => {
    const base = {
      authenticate: jest.fn().mockResolvedValue(authenticated),
      createContextDataSource: () => ({
        getAccessibleExercise: jest.fn().mockResolvedValue({
          id: exerciseId,
          name: "Incline Press",
          measurementType: "weighted_reps",
        }),
      }),
      config,
    };
    const ambiguous = createParserHandler({
      ...base,
      provider: new MockAIProvider(() => ({
        sets: [],
        confidence: "low",
        ambiguities: ["It is unclear whether 9 means repetitions or RPE."],
      })),
    });
    const ambiguousResponse = await ambiguous(post("parse-workout", {
      text: "185 8 7 maybe 9",
      exerciseId,
      displayUnit: "lb",
    }));
    await expect(ambiguousResponse.json()).resolves.toMatchObject({
      data: { confidence: "low", ambiguities: [expect.stringContaining("unclear")] },
    });

    const malformed = createParserHandler({
      ...base,
      provider: new MockAIProvider(() => ({
        sets: [{ reps: -1 }],
        confidence: "high",
        ambiguities: [],
      })),
    });
    const malformedResponse = await malformed(post("parse-workout", {
      text: "minus one reps",
      exerciseId,
      displayUnit: "lb",
    }));
    expect(malformedResponse.status).toBe(502);
  });
});
