import { AuthRetryableFetchError } from "@supabase/supabase-js";

import type { AuthErrorCode, AuthResult, AuthSession } from "@/shared/contracts";

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

import {
  AuthServiceError,
  SupabaseAuthService,
  type AuthService,
} from "@/lib/supabase/services";

const credentials = { email: "athlete@example.com", password: "strong-password" };
const providerUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: credentials.email,
  app_metadata: { provider: "email" },
  user_metadata: { privateProviderDetail: true },
};
const providerSession = {
  access_token: "provider-access-token",
  refresh_token: "provider-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: providerUser,
};
const canonicalUser = { id: providerUser.id, email: providerUser.email };
const canonicalSession: AuthSession = { user: canonicalUser };

describe("SupabaseAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs up with email/password and returns only canonical auth data", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: providerUser, session: null },
      error: null,
    });

    await expect(new SupabaseAuthService().signUp(credentials)).resolves.toEqual({
      user: canonicalUser,
      session: null,
    });
    expect(mockSignUp).toHaveBeenCalledWith(credentials);
  });

  it("signs in and strips tokens and provider metadata", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: providerUser, session: providerSession },
      error: null,
    });

    const result = await new SupabaseAuthService().signIn(credentials);

    expect(result).toEqual({ user: canonicalUser, session: canonicalSession });
    expect(result).not.toHaveProperty("session.access_token");
    expect(result).not.toHaveProperty("session.refresh_token");
    expect(result).not.toHaveProperty("user.user_metadata");
    expect(mockSignInWithPassword).toHaveBeenCalledWith(credentials);
  });

  it("signs out without returning the provider response", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await expect(new SupabaseAuthService().signOut()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("gets canonical and null session states", async () => {
    mockGetSession
      .mockResolvedValueOnce({ data: { session: providerSession }, error: null })
      .mockResolvedValueOnce({ data: { session: null }, error: null });
    const service = new SupabaseAuthService();

    await expect(service.getSession()).resolves.toEqual(canonicalSession);
    await expect(service.getSession()).resolves.toBeNull();
  });

  it("subscribes with canonical sessions and returns idempotent cleanup", () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChange.mockImplementation((listener) => {
      return { data: { subscription: { id: "provider-subscription", unsubscribe } } };
    });
    const listener = jest.fn();

    const cleanup = new SupabaseAuthService().subscribeToSession(listener);
    const providerListener = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: typeof providerSession | null,
    ) => void;
    providerListener("SIGNED_IN", providerSession);
    providerListener("SIGNED_OUT", null);

    expect(listener).toHaveBeenNthCalledWith(1, canonicalSession);
    expect(listener).toHaveBeenNthCalledWith(2, null);
    expect(listener).not.toHaveBeenCalledWith("SIGNED_IN", expect.anything());
    cleanup();
    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it.each<[string, AuthErrorCode]>([
    ["invalid_credentials", "invalid_credentials"],
    ["email_not_confirmed", "email_not_confirmed"],
    ["email_exists", "email_already_registered"],
    ["user_already_exists", "email_already_registered"],
    ["email_address_invalid", "invalid_email"],
    ["weak_password", "weak_password"],
    ["over_request_rate_limit", "rate_limited"],
    ["over_email_send_rate_limit", "rate_limited"],
    ["over_sms_send_rate_limit", "rate_limited"],
    ["request_timeout", "network_error"],
    ["validation_failed", "unknown"],
    ["future_provider_code", "unknown"],
  ])("maps provider code %s to %s without provider details", async (providerCode, expectedCode) => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: providerCode, message: "sensitive provider message" },
    });

    const request = new SupabaseAuthService().signIn(credentials);

    await expect(request).rejects.toMatchObject({
      name: "AuthServiceError",
      operation: "signIn",
      code: expectedCode,
    });
    await expect(request).rejects.not.toThrow("sensitive provider message");
  });

  it("maps retryable fetch failures to network_error", async () => {
    mockGetSession.mockRejectedValue(new AuthRetryableFetchError("private network detail", 503));

    await expect(new SupabaseAuthService().getSession()).rejects.toMatchObject({
      operation: "getSession",
      code: "network_error",
    });
  });

  it("sanitizes missing results and thrown provider failures", async () => {
    mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: null });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    mockSignOut.mockRejectedValue(new Error("private thrown detail"));
    const service = new SupabaseAuthService();

    await expect(service.signUp(credentials)).rejects.toMatchObject({
      operation: "signUp",
      code: "unknown",
    });
    await expect(service.signIn(credentials)).rejects.toMatchObject({
      operation: "signIn",
      code: "unknown",
    });
    const signOutRequest = service.signOut();
    await expect(signOutRequest).rejects.toBeInstanceOf(AuthServiceError);
    await expect(signOutRequest).rejects.not.toThrow("private thrown detail");
  });

  it("exposes canonical service return types", () => {
    type SignInResult = Awaited<ReturnType<AuthService["signIn"]>>;
    type SessionResult = Awaited<ReturnType<AuthService["getSession"]>>;
    const authResult: SignInResult = {
      user: canonicalUser,
      session: canonicalSession,
    } satisfies AuthResult;
    const session: SessionResult = canonicalSession;

    expect(authResult).toEqual({ user: canonicalUser, session });
  });
});
