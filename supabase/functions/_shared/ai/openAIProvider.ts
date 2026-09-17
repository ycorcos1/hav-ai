import { AIProviderFailure } from "./errors";
import type { AIProvider, AIRequest } from "./types";

type AIHttpResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type AIFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<AIHttpResponse>;

type OpenAIResponse = {
  output_text?: unknown;
  output?: unknown;
};

function getOutputText(response: OpenAIResponse): string | null {
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;

  for (const item of response.output) {
    if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const part of item.content) {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "output_text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }
    }
  }

  return null;
}

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: AIFetch = fetch,
    private readonly timeoutMs = 15_000,
  ) {}

  async generateStructured<T>(request: AIRequest<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: request.model,
          instructions: request.systemPrompt,
          input: JSON.stringify(request.input),
          max_output_tokens: request.maxOutputTokens,
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: request.outputSchema.name,
              schema: request.outputSchema.schema,
              strict: true,
            },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AIProviderFailure(response.status === 429 ? "RATE_LIMITED" : "PROVIDER_ERROR");
      }

      const payload = (await response.json()) as OpenAIResponse;
      const outputText = getOutputText(payload);
      if (outputText === null) throw new AIProviderFailure("INVALID_RESPONSE");

      try {
        return request.validate(JSON.parse(outputText));
      } catch {
        throw new AIProviderFailure("INVALID_RESPONSE");
      }
    } catch (error) {
      if (error instanceof AIProviderFailure) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderFailure("TIMEOUT");
      }
      throw new AIProviderFailure("PROVIDER_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}

