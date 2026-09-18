export type AIContextFailureCode =
  | "PROFILE_NOT_FOUND"
  | "RESOURCE_NOT_FOUND"
  | "CONTEXT_UNAVAILABLE";

export class AIContextFailure extends Error {
  readonly code: AIContextFailureCode;

  constructor(code: AIContextFailureCode) {
    super("The requested AI context could not be built.");
    this.name = "AIContextFailure";
    this.code = code;
  }
}
