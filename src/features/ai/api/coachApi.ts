import type { CoachRequestV1, CoachResponseV1 } from "@/shared/contracts";
import { coachResponseV1Schema } from "@/shared/schemas";

import { invokeAIFunction, type AIFunctionInvoker } from "./aiApiClient";

export type CoachApi = {
  ask(request: CoachRequestV1): Promise<CoachResponseV1>;
};

export function createCoachApi(invoker?: AIFunctionInvoker): CoachApi {
  return {
    ask: (request) => invokeAIFunction({
      invoker,
      name: "coach",
      request,
      responseSchema: coachResponseV1Schema,
    }),
  };
}

export const coachApi = createCoachApi();
