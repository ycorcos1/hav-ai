import type { ISODateTime, UUID } from "./common";

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
