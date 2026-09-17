import { AIProviderFailure } from "./errors";
import type { AIProvider, AIRequest } from "./types";

export type MockAIResolver = (request: AIRequest<unknown>) => unknown | Promise<unknown>;

export class MockAIProvider implements AIProvider {
  constructor(private readonly resolve: MockAIResolver) {}

  async generateStructured<T>(request: AIRequest<T>): Promise<T> {
    const output = await this.resolve(request as AIRequest<unknown>);

    try {
      return request.validate(output);
    } catch {
      throw new AIProviderFailure("INVALID_RESPONSE");
    }
  }
}

