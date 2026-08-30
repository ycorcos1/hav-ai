import type { ISODateTime, UUID } from "./common";

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthSession = {
  user: AuthUser;
};

export type AuthResult = {
  user: AuthUser;
  session: AuthSession | null;
};

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_already_registered"
  | "invalid_email"
  | "weak_password"
  | "rate_limited"
  | "network_error"
  | "unknown";

export type WeightUnit = "lb" | "kg";

export type PrimaryGoal = "strength" | "hypertrophy" | "hybrid";

export type RpePreference = "hidden" | "optional" | "preferred";

export type ProgressionStyle = "conservative" | "balanced" | "aggressive";

export type UserProfile = {
  userId: UUID;
  displayName?: string;
  weightUnit: WeightUnit;
  primaryGoal: PrimaryGoal;
  rpePreference: RpePreference;
  progressionStyle: ProgressionStyle;
  defaultRestDurationSeconds: number;
  onboardingCompleted: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
