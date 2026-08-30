import { isAuthRetryableFetchError, type Session, type User } from "@supabase/supabase-js";

import type { AuthErrorCode, AuthResult, AuthSession, AuthUser } from "@/shared/contracts";

export function authUserFromSupabase(user: User): AuthUser {
  return {
    id: user.id,
    ...(user.email ? { email: user.email } : {}),
  };
}

export function authSessionFromSupabase(session: Session | null): AuthSession | null {
  if (!session) return null;

  return { user: authUserFromSupabase(session.user) };
}

export function authResultFromSupabase(user: User, session: Session | null): AuthResult {
  return {
    user: authUserFromSupabase(user),
    session: authSessionFromSupabase(session),
  };
}

export function authErrorCodeFromSupabase(error: unknown): AuthErrorCode {
  if (isAuthRetryableFetchError(error)) return "network_error";

  const code = providerErrorCode(error);

  switch (code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "email_exists":
    case "user_already_exists":
      return "email_already_registered";
    case "email_address_invalid":
      return "invalid_email";
    case "weak_password":
      return "weak_password";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
    case "over_sms_send_rate_limit":
      return "rate_limited";
    case "request_timeout":
      return "network_error";
    default:
      return "unknown";
  }
}

function providerErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;

  return typeof error.code === "string" ? error.code : undefined;
}
