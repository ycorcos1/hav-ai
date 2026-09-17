export type AIProviderName = "mock" | "openai";

export type AIConfig = {
  provider: AIProviderName;
  openAIKey?: string;
  models: {
    coach: string;
    explanation: string;
    parser: string;
  };
};

export type ServerEnvironment = (name: string) => string | undefined;

function required(environment: ServerEnvironment, name: string): string {
  const value = environment(name)?.trim();
  if (!value) throw new Error(`Missing required server AI configuration: ${name}`);
  return value;
}

export function loadAIConfig(environment: ServerEnvironment): AIConfig {
  const configuredProvider = environment("AI_PROVIDER")?.trim().toLowerCase() ?? "mock";
  if (configuredProvider !== "mock" && configuredProvider !== "openai") {
    throw new Error("AI_PROVIDER must be either mock or openai.");
  }

  if (configuredProvider === "mock") {
    return {
      provider: "mock",
      models: {
        coach: environment("AI_COACH_MODEL")?.trim() || "mock-coach",
        explanation: environment("AI_EXPLANATION_MODEL")?.trim() || "mock-explanation",
        parser: environment("AI_PARSER_MODEL")?.trim() || "mock-parser",
      },
    };
  }

  return {
    provider: "openai",
    openAIKey: required(environment, "OPENAI_API_KEY"),
    models: {
      coach: required(environment, "AI_COACH_MODEL"),
      explanation: required(environment, "AI_EXPLANATION_MODEL"),
      parser: required(environment, "AI_PARSER_MODEL"),
    },
  };
}

