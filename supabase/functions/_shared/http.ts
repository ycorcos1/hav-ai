import type { ApiErrorCode, ApiErrorResponse, ApiSuccess } from "@/shared/contracts";

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

export function successResponse<T>(data: T, requestId: string): Response {
  const body: ApiSuccess<T> = { ok: true, data, meta: { requestId } };
  return jsonResponse(body, 200);
}

export function errorResponse(input: {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  status: number;
  requestId: string;
}): Response {
  const body: ApiErrorResponse = {
    ok: false,
    error: { code: input.code, message: input.message, retryable: input.retryable },
    meta: { requestId: input.requestId },
  };
  return jsonResponse(body, input.status);
}

export function optionsResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

