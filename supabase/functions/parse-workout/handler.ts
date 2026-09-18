import type { ParseWorkoutResponseV1 } from "@/shared/contracts";

import {
  parserProviderJSONSchema,
  parserProviderOutputSchema,
  type AIConfig,
  type AIProvider,
} from "../_shared/ai";
import type { AuthenticateAIRequest } from "../_shared/auth";
import { AIContextFailure, type CoachContextDataSource } from "../_shared/context";
import { mapAIFunctionError } from "../_shared/functionErrors";
import { errorResponse, optionsResponse, successResponse } from "../_shared/http";
import { PARSER_PROMPT_VERSION, workoutParserSystemPrompt } from "../_shared/prompts";
import { parseWorkoutRequest } from "../_shared/requestValidation";

export type ParserHandlerDependencies = {
  authenticate: AuthenticateAIRequest;
  createContextDataSource: (
    authenticated: Awaited<ReturnType<AuthenticateAIRequest>> & object,
  ) => Pick<CoachContextDataSource, "getAccessibleExercise">;
  provider: AIProvider;
  config: AIConfig;
  createRequestId?: () => string;
};

export function createParserHandler(dependencies: ParserHandlerDependencies) {
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
    const body = parseWorkoutRequest(rawBody);
    if (!body) {
      return errorResponse({
        code: "INVALID_REQUEST",
        message: "The workout parsing request is invalid.",
        retryable: false,
        status: 400,
        requestId,
      });
    }

    try {
      const exercise = await dependencies
        .createContextDataSource(authenticated)
        .getAccessibleExercise(authenticated.user.id, body.exerciseId);
      if (!exercise) throw new AIContextFailure("RESOURCE_NOT_FOUND");
      const output = await dependencies.provider.generateStructured({
        feature: "parser",
        model: dependencies.config.models.parser,
        promptVersion: PARSER_PROMPT_VERSION,
        systemPrompt: workoutParserSystemPrompt,
        input: { text: body.text, displayUnit: body.displayUnit, exercise },
        outputSchema: { name: "parsed_workout_v1", schema: parserProviderJSONSchema },
        validate: (value) => parserProviderOutputSchema.parse(value),
        maxOutputTokens: 500,
      });
      const response: ParseWorkoutResponseV1 = {
        sets: output.sets.map((set) => ({
          reps: set.reps,
          ...(set.weight == null ? {} : { weight: set.weight }),
          ...(set.unit == null ? {} : { unit: set.unit }),
          ...(set.rpe == null ? {} : { rpe: set.rpe }),
        })),
        confidence: output.confidence,
        ambiguities: output.ambiguities,
        meta: { promptVersion: PARSER_PROMPT_VERSION },
      };
      return successResponse(response, requestId);
    } catch (error) {
      return mapAIFunctionError(error, requestId);
    }
  };
}
