export type AIProviderFailureCode =
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INVALID_RESPONSE";

export class AIProviderFailure extends Error {
  readonly code: AIProviderFailureCode;

  constructor(code: AIProviderFailureCode) {
    super("The AI provider could not complete the request.");
    this.name = "AIProviderFailure";
    this.code = code;
  }
}

