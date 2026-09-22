import type { AIDiagnosticsV1 } from "@/shared/contracts";
import { aiDiagnosticsV1Schema } from "@/shared/schemas";

import { invokeAIFunction, type AIFunctionInvoker } from "./aiApiClient";

export type AIDiagnosticsApi = {
  load(): Promise<AIDiagnosticsV1>;
};

export function createAIDiagnosticsApi(invoker?: AIFunctionInvoker): AIDiagnosticsApi {
  return {
    load: () => invokeAIFunction({
      invoker,
      name: "ai-diagnostics",
      request: {},
      responseSchema: aiDiagnosticsV1Schema,
    }),
  };
}

export const aiDiagnosticsApi = createAIDiagnosticsApi();
