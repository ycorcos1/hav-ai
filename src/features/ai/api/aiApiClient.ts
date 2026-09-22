import { supabase } from "@/lib/supabase/client";
import type { ApiErrorCode } from "@/shared/contracts";
import { apiErrorResponseSchema } from "@/shared/schemas";
import type { z } from "zod";

export type AIFunctionName =
  | "ai-diagnostics"
  | "coach"
  | "explain-recommendation"
  | "parse-workout";

export type AIFunctionInvoker = {
  invoke(name: AIFunctionName, options: { body: unknown }): Promise<{
    data: unknown;
    error: unknown;
  }>;
};

const defaultInvoker: AIFunctionInvoker = {
  invoke: (name, { body }) => supabase.functions.invoke(name, {
    body: body as Record<string, unknown>,
  }),
};

export type AIServiceErrorCode = ApiErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE";

export class AIServiceError extends Error {
  constructor(
    readonly code: AIServiceErrorCode,
    readonly retryable: boolean,
    readonly requestId?: string,
  ) {
    super(messageForCode(code));
    this.name = "AIServiceError";
  }
}

export async function invokeAIFunction<TOutput>(input: {
  invoker?: AIFunctionInvoker;
  name: AIFunctionName;
  request: unknown;
  responseSchema: z.ZodType<TOutput>;
}): Promise<TOutput> {
  let result: { data: unknown; error: unknown };
  try {
    result = await (input.invoker ?? defaultInvoker).invoke(input.name, {
      body: input.request,
    });
  } catch {
    throw new AIServiceError("NETWORK_ERROR", true);
  }

  if (result.error) {
    const envelope = await readErrorEnvelope(result.error);
    if (envelope) {
      throw new AIServiceError(
        envelope.error.code,
        envelope.error.retryable,
        envelope.meta?.requestId,
      );
    }
    throw new AIServiceError("NETWORK_ERROR", true);
  }

  const error = apiErrorResponseSchema.safeParse(result.data);
  if (error.success) {
    throw new AIServiceError(
      error.data.error.code,
      error.data.error.retryable,
      error.data.meta?.requestId,
    );
  }
  if (isRecord(result.data) && result.data.ok === true) {
    const payload = input.responseSchema.safeParse(result.data.data);
    if (payload.success) return payload.data;
  }
  throw new AIServiceError("INVALID_RESPONSE", false);
}

async function readErrorEnvelope(error: unknown) {
  if (!isRecord(error)) return null;
  const context = error.context;
  if (!(context instanceof Response)) return null;
  try {
    const result = apiErrorResponseSchema.safeParse(await context.clone().json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function messageForCode(code: AIServiceErrorCode): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Authentication is required.";
    case "FORBIDDEN":
      return "You do not have access to this resource.";
    case "INVALID_REQUEST":
      return "The AI request is invalid.";
    case "NOT_FOUND":
      return "The requested training context was not found.";
    case "RATE_LIMITED":
      return "AI is temporarily busy. Try again shortly.";
    case "AI_TIMEOUT":
    case "AI_PROVIDER_ERROR":
    case "AI_CONTEXT_ERROR":
    case "INTERNAL_ERROR":
    case "NETWORK_ERROR":
      return "The AI service is unavailable right now.";
    case "AI_INVALID_RESPONSE":
    case "INVALID_RESPONSE":
      return "The AI service returned an invalid response.";
  }
}
