import type { LocalProfileCacheRepository } from "@/db/repositories/types";
import type { UserProfile, UUID } from "@/shared/contracts";

export class WorkoutProfilePreferenceError extends Error {
  readonly name = "WorkoutProfilePreferenceError";

  constructor() {
    super("Workout preferences are not available on this device.");
  }
}

export async function getCachedWorkoutProfile(
  repository: LocalProfileCacheRepository,
  userId: UUID,
): Promise<UserProfile> {
  const profile = await repository.get(userId);
  if (!profile) throw new WorkoutProfilePreferenceError();
  return profile;
}
