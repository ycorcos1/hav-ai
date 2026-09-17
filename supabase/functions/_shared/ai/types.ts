export type AIFeature = "coach" | "explanation" | "parser";

export type JSONSchema = Record<string, unknown>;

export type AIRequest<T> = {
  feature: AIFeature;
  model: string;
  promptVersion: string;
  systemPrompt: string;
  input: unknown;
  outputSchema: {
    name: string;
    schema: JSONSchema;
  };
  validate: (value: unknown) => T;
  maxOutputTokens: number;
};

export interface AIProvider {
  generateStructured<T>(request: AIRequest<T>): Promise<T>;
}

