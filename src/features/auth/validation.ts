export type SignupFieldErrors = {
  confirmPassword?: string;
  email?: string;
  password?: string;
};

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Enter a valid email address.';
  }

  return undefined;
}

export function validateSignupFields(
  email: string,
  password: string,
  confirmPassword: string,
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const emailError = validateEmail(email);

  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Enter a password.';
  if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function validateLoginFields(
  email: string,
  password: string,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const emailError = validateEmail(email);

  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Enter your password.';

  return errors;
}
