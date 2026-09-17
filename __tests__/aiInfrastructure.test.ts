import {
  AIProviderFailure,
  MockAIProvider,
  OpenAIProvider,
  createAIProvider,
  loadAIConfig,
  type AIRequest,
} from "../supabase/functions/_shared/ai";
import {
  COACH_PROMPT_VERSION,
  EXPLANATION_PROMPT_VERSION,
  PARSER_PROMPT_VERSION,
  coachSystemPrompt,
  recommendationExplanationSystemPrompt,
  workoutParserSystemPrompt,
} from "../supabase/functions/_shared/prompts";

type TestOutput = { answer: string };

const request: AIRequest<TestOutput> = {
  feature: "coach",
  model: "configured-model",
  promptVersion: COACH_PROMPT_VERSION,
  systemPrompt: coachSystemPrompt,
  input: { message: "What should I do next?" },
  outputSchema: {
    name: "coach_response",
    schema: {
      type: "object",
      properties: { answer: { type: "string" } },
      required: ["answer"],
      additionalProperties: false,
    },
  },
  validate(value) {
    if (!value || typeof value !== "object" || !("answer" in value) || typeof value.answer !== "string") {
      throw new Error("invalid");
    }
    return { answer: value.answer };
  },
  maxOutputTokens: 200,
};

describe("AI infrastructure", () => {
  it("loads credential-free mock configuration by default", () => {
    expect(loadAIConfig(() => undefined)).toEqual({
      provider: "mock",
      models: {
        coach: "mock-coach",
        explanation: "mock-explanation",
        parser: "mock-parser",
      },
    });
  });

  it("requires server-only key and model configuration for OpenAI", () => {
    const values: Record<string, string> = {
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "server-only-test-key",
      AI_COACH_MODEL: "coach-model",
      AI_EXPLANATION_MODEL: "explanation-model",
      AI_PARSER_MODEL: "parser-model",
    };

    expect(loadAIConfig((name) => values[name])).toEqual({
      provider: "openai",
      openAIKey: "server-only-test-key",
      models: {
        coach: "coach-model",
        explanation: "explanation-model",
        parser: "parser-model",
      },
    });
    expect(() => loadAIConfig((name) => (name === "AI_PROVIDER" ? "openai" : undefined))).toThrow(
      "OPENAI_API_KEY",
    );
  });

  it("uses a provider-neutral mock and validates its structured output", async () => {
    const provider = createAIProvider(loadAIConfig(() => undefined), () => ({ answer: "Stay at 190." }));
    await expect(provider.generateStructured(request)).resolves.toEqual({ answer: "Stay at 190." });

    const malformed = new MockAIProvider(() => ({ response: "wrong shape" }));
    await expect(malformed.generateStructured(request)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: "The AI provider could not complete the request.",
    });
  });

  it("sends structured Responses API requests without retaining provider state", async () => {
    let capturedInit:
      | {
          headers: Record<string, string>;
          body: string;
        }
      | undefined;
    const fetcher = async (
      _input: string,
      init: {
        method: "POST";
        headers: Record<string, string>;
        body: string;
        signal: AbortSignal;
      },
    ) => {
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        async json() {
          return { output_text: JSON.stringify({ answer: "Keep the load." }) };
        },
      };
    };
    const provider = new OpenAIProvider("secret", fetcher);

    await expect(provider.generateStructured(request)).resolves.toEqual({ answer: "Keep the load." });
    if (!capturedInit) throw new Error("Expected the provider request to be captured.");
    const body = JSON.parse(capturedInit.body);
    expect(body).toMatchObject({
      model: "configured-model",
      store: false,
      text: { format: { type: "json_schema", name: "coach_response", strict: true } },
    });
    expect(capturedInit.headers.Authorization).toBe("Bearer secret");
  });

  it("sanitizes OpenAI rate limits and malformed responses", async () => {
    const rateLimited = new OpenAIProvider("secret", async () => ({
      ok: false,
      status: 429,
      async json() {
        return { providerDetail: "must not escape" };
      },
    }));
    await expect(rateLimited.generateStructured(request)).rejects.toEqual(
      new AIProviderFailure("RATE_LIMITED"),
    );

    const malformed = new OpenAIProvider("secret", async () => ({
      ok: true,
      status: 200,
      async json() {
        return { output_text: "not-json" };
      },
    }));
    await expect(malformed.generateStructured(request)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("keeps all prompt versions explicit and source controlled", () => {
    expect([COACH_PROMPT_VERSION, EXPLANATION_PROMPT_VERSION, PARSER_PROMPT_VERSION]).toEqual([
      "coach-v1",
      "explanation-v1",
      "parser-v1",
    ]);
    expect(coachSystemPrompt).toContain("deterministic progression recommendation");
    expect(recommendationExplanationSystemPrompt).toContain("authoritative");
    expect(workoutParserSystemPrompt).toContain("candidate data only");
  });
});
