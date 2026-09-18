import { MockAIProvider, type MockAIResolver } from "./mockProvider.ts";
import { OpenAIProvider } from "./openAIProvider.ts";
import type { AIConfig } from "./config.ts";
import type { AIProvider } from "./types.ts";

export function createAIProvider(config: AIConfig, mockResolver?: MockAIResolver): AIProvider {
  if (config.provider === "mock") {
    if (!mockResolver) throw new Error("Mock AI provider requires a deterministic resolver.");
    return new MockAIProvider(mockResolver);
  }

  if (!config.openAIKey) throw new Error("OpenAI provider requires a server API key.");
  return new OpenAIProvider(config.openAIKey);
}

