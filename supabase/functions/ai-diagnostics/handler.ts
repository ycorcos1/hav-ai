import type { AIDiagnosticsV1 } from "@/shared/contracts";

import type { AIConfig } from "../_shared/ai/index.ts";
import type { AuthenticateAIRequest } from "../_shared/auth.ts";
import { errorResponse, optionsResponse, successResponse } from "../_shared/http.ts";
import {
  COACH_PROMPT_VERSION,
  EXPLANATION_PROMPT_VERSION,
  PARSER_PROMPT_VERSION,
} from "../_shared/prompts/index.ts";

export function createAIDiagnosticsHandler(dependencies: {
  authenticate: AuthenticateAIRequest;
  config: AIConfig;
  createRequestId?: () => string;
}) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return optionsResponse();
    const requestId = dependencies.createRequestId?.() ?? crypto.randomUUID();
    if (request.method !== "POST") {
      return errorResponse({
        code: "INVALID_REQUEST",
        message: "Only POST requests are supported.",
        retryable: false,
        status: 405,
        requestId,
      });
    }
    if (!await dependencies.authenticate(request)) {
      return errorResponse({
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
        retryable: false,
        status: 401,
        requestId,
      });
    }
    const diagnostics: AIDiagnosticsV1 = {
      provider: dependencies.config.provider,
      models: dependencies.config.models,
      promptVersions: {
        coach: COACH_PROMPT_VERSION,
        explanation: EXPLANATION_PROMPT_VERSION,
        parser: PARSER_PROMPT_VERSION,
      },
    };
    return successResponse(diagnostics, requestId);
  };
}
