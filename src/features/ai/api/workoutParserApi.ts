import type { ParseWorkoutRequestV1, ParseWorkoutResponseV1 } from "@/shared/contracts";
import { parseWorkoutResponseV1Schema } from "@/shared/schemas";

import { invokeAIFunction, type AIFunctionInvoker } from "./aiApiClient";

export type WorkoutParserApi = {
  parse(request: ParseWorkoutRequestV1): Promise<ParseWorkoutResponseV1>;
};

export function createWorkoutParserApi(invoker?: AIFunctionInvoker): WorkoutParserApi {
  return {
    parse: (request) => invokeAIFunction({
      invoker,
      name: "parse-workout",
      request,
      responseSchema: parseWorkoutResponseV1Schema,
    }),
  };
}

export const workoutParserApi = createWorkoutParserApi();
