import type { AuthErrorCode } from '@/shared/contracts';

const authErrorMessages: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Incorrect email or password.',
  email_not_confirmed: 'Please confirm your email before logging in.',
  email_already_registered: 'An account with this email already exists.',
  invalid_email: 'Enter a valid email address.',
  weak_password: 'Choose a stronger password.',
  rate_limited: 'Too many attempts. Try again shortly.',
  network_error: 'Unable to connect. Check your connection and try again.',
  unknown: 'Something went wrong. Try again.',
};

export function authErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;

    if (typeof code === 'string' && code in authErrorMessages) {
      return authErrorMessages[code as AuthErrorCode];
    }
  }

  return authErrorMessages.unknown;
}
