import type { UserProfile } from "@/shared/contracts";

export type CreateOwnProfileInput = Pick<
  UserProfile,
  "userId" | "weightUnit" | "primaryGoal"
> &
  Partial<
    Pick<
      UserProfile,
      | "displayName"
      | "rpePreference"
      | "progressionStyle"
      | "defaultRestDurationSeconds"
      | "onboardingCompleted"
    >
  >;

export type UpdateOwnProfileInput = Partial<
  Pick<
    UserProfile,
    | "displayName"
    | "weightUnit"
    | "primaryGoal"
    | "rpePreference"
    | "progressionStyle"
    | "defaultRestDurationSeconds"
    | "onboardingCompleted"
  >
>;

export interface ProfileRepository {
  getOwnProfile(): Promise<UserProfile | null>;
  createOwnProfile(input: CreateOwnProfileInput): Promise<UserProfile>;
  updateOwnProfile(input: UpdateOwnProfileInput): Promise<UserProfile>;
}

export type ProfileRepositoryOperation =
  | "getOwnProfile"
  | "createOwnProfile"
  | "updateOwnProfile";

export class ProfileRepositoryError extends Error {
  readonly code = "PROFILE_REPOSITORY_ERROR";

  constructor(readonly operation: ProfileRepositoryOperation) {
    super(`Profile repository operation failed: ${operation}.`);
    this.name = "ProfileRepositoryError";
  }
}
