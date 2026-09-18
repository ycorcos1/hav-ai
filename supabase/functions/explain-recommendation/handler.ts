import type { RecommendationExplanationV1 } from "@/shared/contracts";

import {
  explanationProviderJSONSchema,
  explanationProviderOutputSchema,
  type AIConfig,
  type AIProvider,
} from "../_shared/ai/index.ts";
import type { AuthenticateAIRequest } from "../_shared/auth.ts";
import {
  buildRecommendationExplanationContext,
  type RecommendationContextDataSource,
} from "../_shared/context/index.ts";
import { mapAIFunctionError } from "../_shared/functionErrors.ts";
import { errorResponse, optionsResponse, successResponse } from "../_shared/http.ts";
import {
  EXPLANATION_PROMPT_VERSION,
  recommendationExplanationSystemPrompt,
} from "../_shared/prompts/index.ts";
import { parseExplanationRequest } from "../_shared/requestValidation.ts";

export type ExplanationHandlerDependencies = {
  authenticate: AuthenticateAIRequest;
  createContextDataSource: (
    authenticated: Awaited<ReturnType<AuthenticateAIRequest>> & object,
  ) => RecommendationContextDataSource;
  provider: AIProvider;
  config: AIConfig;
  createRequestId?: () => string;
};

export function createExplanationHandler(dependencies: ExplanationHandlerDependencies) {
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
    const authenticated = await dependencies.authenticate(request);
    if (!authenticated) {
      return errorResponse({
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
        retryable: false,
        status: 401,
        requestId,
      });
    }
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      rawBody = null;
    }
    const body = parseExplanationRequest(rawBody);
    if (!body) {
      return errorResponse({
        code: "INVALID_REQUEST",
        message: "The recommendation explanation request is invalid.",
        retryable: false,
        status: 400,
        requestId,
      });
    }

    try {
      const context = await buildRecommendationExplanationContext({
        userId: authenticated.user.id,
        recommendationId: body.recommendationId,
        dataSource: dependencies.createContextDataSource(authenticated),
      });
      const output = await dependencies.provider.generateStructured({
        feature: "explanation",
        model: dependencies.config.models.explanation,
        promptVersion: EXPLANATION_PROMPT_VERSION,
        systemPrompt: recommendationExplanationSystemPrompt,
        input: context,
        outputSchema: {
          name: "recommendation_explanation_v1",
          schema: explanationProviderJSONSchema,
        },
        validate: (value) => explanationProviderOutputSchema.parse(value),
        maxOutputTokens: 500,
      });
      const response: RecommendationExplanationV1 = {
        headline: output.headline,
        summary: output.summary,
        evidence: output.evidence,
        ...(output.caution ? { caution: output.caution } : {}),
        meta: { promptVersion: EXPLANATION_PROMPT_VERSION },
      };
      return successResponse(response, requestId);
    } catch (error) {
      return mapAIFunctionError(error, requestId);
    }
  };
}

