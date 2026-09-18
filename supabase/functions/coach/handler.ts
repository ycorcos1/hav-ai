import type { CoachResponseV1 } from "@/shared/contracts";

import {
  coachProviderJSONSchema,
  coachProviderOutputSchema,
  type AIProvider,
} from "../_shared/ai/index.ts";
import type { AIConfig } from "../_shared/ai/index.ts";
import type { AuthenticateAIRequest } from "../_shared/auth.ts";
import { buildCoachContext, type CoachContextDataSource } from "../_shared/context/index.ts";
import { mapAIFunctionError } from "../_shared/functionErrors.ts";
import { errorResponse, optionsResponse, successResponse } from "../_shared/http.ts";
import { COACH_PROMPT_VERSION, coachSystemPrompt } from "../_shared/prompts/index.ts";
import { parseCoachRequest } from "../_shared/requestValidation.ts";

export type CoachHandlerDependencies = {
  authenticate: AuthenticateAIRequest;
  createContextDataSource: (
    authenticated: Awaited<ReturnType<AuthenticateAIRequest>> & object,
  ) => CoachContextDataSource;
  provider: AIProvider;
  config: AIConfig;
  createRequestId?: () => string;
};

export function createCoachHandler(dependencies: CoachHandlerDependencies) {
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
    const body = parseCoachRequest(rawBody);
    if (!body) {
      return errorResponse({
        code: "INVALID_REQUEST",
        message: "The coach request is invalid.",
        retryable: false,
        status: 400,
        requestId,
      });
    }

    try {
      const context = await buildCoachContext({
        userId: authenticated.user.id,
        activeWorkoutId: body.context?.activeWorkoutId,
        exerciseId: body.context?.activeExerciseId,
        localCurrentSession: body.context?.localCurrentSession,
        dataSource: dependencies.createContextDataSource(authenticated),
      });
      const output = await dependencies.provider.generateStructured({
        feature: "coach",
        model: dependencies.config.models.coach,
        promptVersion: COACH_PROMPT_VERSION,
        systemPrompt: coachSystemPrompt,
        input: {
          message: body.message,
          conversation: body.conversation?.messages ?? [],
          context,
        },
        outputSchema: { name: "coach_response_v1", schema: coachProviderJSONSchema },
        validate: (value) => coachProviderOutputSchema.parse(value),
        maxOutputTokens: 700,
      });
      const response: CoachResponseV1 = {
        answer: output.answer,
        ...(output.recommendation ? { recommendation: output.recommendation } : {}),
        warnings: output.warnings,
        contextUsed: {
          activeWorkout: context.localCurrentSession !== undefined,
          ...(context.exercise ? { exerciseId: context.exercise.id } : {}),
          recentSessionsUsed: context.recentSessions.length,
          subjectiveNotesUsed: {
            exercisePreference: Boolean(context.subjectiveNotes.exercisePreference),
            workout: context.subjectiveNotes.workoutNotes.length > 0,
            setCount: context.subjectiveNotes.setNotes.length,
          },
        },
        meta: { promptVersion: COACH_PROMPT_VERSION },
      };
      return successResponse(response, requestId);
    } catch (error) {
      return mapAIFunctionError(error, requestId);
    }
  };
}
