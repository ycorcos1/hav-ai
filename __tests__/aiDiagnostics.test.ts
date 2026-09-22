jest.mock("@/lib/supabase/client", () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { createAIDiagnosticsApi } from "@/features/ai/api";
import type { AuthenticatedAIRequest } from "../supabase/functions/_shared/auth";
import { createAIDiagnosticsHandler } from "../supabase/functions/ai-diagnostics/handler";

const config = {
  provider: "mock" as const,
  models: {
    coach: "mock-coach",
    explanation: "mock-explanation",
    parser: "mock-parser",
  },
};

describe("AI diagnostics", () => {
  it("returns only authenticated, non-secret provider and prompt metadata", async () => {
    const handler = createAIDiagnosticsHandler({
      authenticate: jest.fn().mockResolvedValue({
        user: { id: "user-id" },
        client: {},
      } as AuthenticatedAIRequest),
      config,
      createRequestId: () => "request-id",
    });
    const response = await handler(new Request("http://localhost/ai-diagnostics", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: "{}",
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      data: {
        provider: "mock",
        models: config.models,
        promptVersions: {
          coach: "coach-v1",
          explanation: "explanation-v1",
          parser: "parser-v1",
        },
      },
    });
    expect(JSON.stringify(body)).not.toContain("OPENAI_API_KEY");
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("rejects unauthenticated requests", async () => {
    const handler = createAIDiagnosticsHandler({
      authenticate: jest.fn().mockResolvedValue(null),
      config,
    });
    const response = await handler(new Request("http://localhost/ai-diagnostics", {
      method: "POST",
    }));
    expect(response.status).toBe(401);
  });

  it("validates the mobile diagnostics response", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        ok: true,
        data: {
          provider: "mock",
          models: config.models,
          promptVersions: {
            coach: "coach-v1",
            explanation: "explanation-v1",
            parser: "parser-v1",
          },
        },
      },
      error: null,
    });

    await expect(createAIDiagnosticsApi({ invoke }).load()).resolves.toMatchObject({
      provider: "mock",
      promptVersions: { coach: "coach-v1" },
    });
    expect(invoke).toHaveBeenCalledWith("ai-diagnostics", { body: {} });
  });
});
