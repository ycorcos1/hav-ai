jest.mock("@/lib/supabase/client", () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import {
  AIServiceError,
  createCoachApi,
  createRecommendationExplanationApi,
  createWorkoutParserApi,
  type AIFunctionInvoker,
} from "@/features/ai/api";

const exerciseId = "11111111-1111-4111-8111-111111111111";
const recommendationId = "22222222-2222-4222-8222-222222222222";

function controlledInvoker(data: unknown, error: unknown = null) {
  const invoke = jest.fn().mockResolvedValue({ data, error });
  return { invoker: { invoke } as AIFunctionInvoker, invoke };
}

describe("AI API client layer", () => {
  it("invokes Coach through the named Edge Function and validates its response", async () => {
    const response = {
      answer: "Keep the same load.",
      warnings: [],
      contextUsed: {
        activeWorkout: false,
        recentSessionsUsed: 2,
        subjectiveNotesUsed: { exercisePreference: false, workout: false, setCount: 0 },
      },
      meta: { promptVersion: "coach-v1" },
    };
    const { invoker, invoke } = controlledInvoker({ ok: true, data: response });
    const request = { message: "What should I do next?" };

    await expect(createCoachApi(invoker).ask(request)).resolves.toEqual(response);
    expect(invoke).toHaveBeenCalledWith("coach", { body: request });
  });

  it("invokes recommendation explanation without accepting recommendation facts", async () => {
    const response = {
      headline: "Keep building",
      summary: "The deterministic target reflects your recent performance.",
      evidence: ["Two comparable sessions improved."],
      meta: { promptVersion: "explanation-v1" },
    };
    const { invoker, invoke } = controlledInvoker({ ok: true, data: response });

    await expect(createRecommendationExplanationApi(invoker).explain({ recommendationId }))
      .resolves.toEqual(response);
    expect(invoke).toHaveBeenCalledWith("explain-recommendation", {
      body: { recommendationId },
    });
  });

  it("invokes the workout parser and returns candidate sets only", async () => {
    const response = {
      sets: [{ weight: 185, unit: "lb" as const, reps: 8 }],
      confidence: "high" as const,
      ambiguities: [],
      meta: { promptVersion: "parser-v1" },
    };
    const { invoker, invoke } = controlledInvoker({ ok: true, data: response });
    const request = { text: "185 for 8", exerciseId, displayUnit: "lb" as const };

    await expect(createWorkoutParserApi(invoker).parse(request)).resolves.toEqual(response);
    expect(invoke).toHaveBeenCalledWith("parse-workout", { body: request });
  });

  it("maps structured server errors without exposing provider details", async () => {
    const body = {
      ok: false,
      error: { code: "AI_TIMEOUT", message: "raw server message", retryable: true },
      meta: { requestId: "request-id" },
    };
    const { invoker } = controlledInvoker(null, {
      context: new Response(JSON.stringify(body), { status: 504 }),
      providerDetail: "secret raw detail",
    });

    await expect(createCoachApi(invoker).ask({ message: "Help" })).rejects.toMatchObject({
      name: "AIServiceError",
      code: "AI_TIMEOUT",
      retryable: true,
      requestId: "request-id",
      message: "The AI service is unavailable right now.",
    });
  });

  it("rejects malformed success responses at the mobile boundary", async () => {
    const { invoker } = controlledInvoker({ ok: true, data: { answer: "Incomplete" } });

    await expect(createCoachApi(invoker).ask({ message: "Help" })).rejects.toEqual(
      new AIServiceError("INVALID_RESPONSE", false),
    );
  });

  it("sanitizes transport failures", async () => {
    const invoker: AIFunctionInvoker = {
      invoke: jest.fn().mockRejectedValue(new Error("token and raw network detail")),
    };

    await expect(createWorkoutParserApi(invoker).parse({
      text: "185 for 8",
      exerciseId,
      displayUnit: "lb",
    })).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      retryable: true,
      message: "The AI service is unavailable right now.",
    });
  });
});
