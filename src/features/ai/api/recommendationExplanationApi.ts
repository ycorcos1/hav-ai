import type {
  ExplainRecommendationRequestV1,
  RecommendationExplanationV1,
} from "@/shared/contracts";
import { recommendationExplanationV1Schema } from "@/shared/schemas";

import { invokeAIFunction, type AIFunctionInvoker } from "./aiApiClient";

export type RecommendationExplanationApi = {
  explain(request: ExplainRecommendationRequestV1): Promise<RecommendationExplanationV1>;
};

export function createRecommendationExplanationApi(
  invoker?: AIFunctionInvoker,
): RecommendationExplanationApi {
  return {
    explain: (request) => invokeAIFunction({
      invoker,
      name: "explain-recommendation",
      request,
      responseSchema: recommendationExplanationV1Schema,
    }),
  };
}

export const recommendationExplanationApi = createRecommendationExplanationApi();
