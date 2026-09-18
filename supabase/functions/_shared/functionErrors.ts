import { AIProviderFailure } from "./ai";
import { AIContextFailure } from "./context";
import { errorResponse } from "./http";

export function mapAIFunctionError(error: unknown, requestId: string): Response {
  if (error instanceof AIProviderFailure) {
    if (error.code === "TIMEOUT") {
      return errorResponse({
        code: "AI_TIMEOUT",
        message: "The AI request timed out.",
        retryable: true,
        status: 504,
        requestId,
      });
    }
    if (error.code === "RATE_LIMITED") {
      return errorResponse({
        code: "RATE_LIMITED",
        message: "AI is temporarily busy. Try again shortly.",
        retryable: true,
        status: 429,
        requestId,
      });
    }
    return errorResponse({
      code: error.code === "INVALID_RESPONSE" ? "AI_INVALID_RESPONSE" : "AI_PROVIDER_ERROR",
      message: "AI is unavailable right now.",
      retryable: true,
      status: error.code === "INVALID_RESPONSE" ? 502 : 503,
      requestId,
    });
  }
  if (error instanceof AIContextFailure) {
    return errorResponse({
      code: error.code === "RESOURCE_NOT_FOUND" ? "NOT_FOUND" : "AI_CONTEXT_ERROR",
      message: error.code === "RESOURCE_NOT_FOUND"
        ? "The requested resource was not found."
        : "The requested context is unavailable.",
      retryable: error.code === "CONTEXT_UNAVAILABLE",
      status: error.code === "RESOURCE_NOT_FOUND" ? 404 : 500,
      requestId,
    });
  }
  return errorResponse({
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
    retryable: false,
    status: 500,
    requestId,
  });
}

