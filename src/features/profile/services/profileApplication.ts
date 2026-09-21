import { CachedProfileRepository } from "@/features/profile/services/CachedProfileRepository";
import { recalculateActiveRecommendations } from "@/features/recommendations/services";
import { createWorkoutPersistence } from "@/features/workouts/services/workoutPersistence";
import {
  SupabaseProfileRepository,
  type ProfileRepository,
  type UpdateOwnProfileInput,
} from "@/lib/supabase/repositories";
import { authService } from "@/lib/supabase/services";
import type { UserProfile } from "@/shared/contracts";

import {
  countPendingSyncItems,
  synchronizePendingItems,
} from "./logoutSafetyPersistence";

const profileRepository = new CachedProfileRepository(new SupabaseProfileRepository());

export type ProfileSettings = {
  email?: string;
  profile: UserProfile;
};

type RecommendationRecalculator = (profile: UserProfile) => Promise<void>;

export type LogoutPreparation = "pending_sync" | "signed_out";

export type SafeLogoutDependencies = {
  countPending: (userId: string) => Promise<number>;
  getCurrentUserId: () => Promise<string | null>;
  signOut: () => Promise<void>;
  synchronize: (userId: string) => Promise<{ remainingQueueSize: number; success: boolean }>;
};

export async function loadCurrentProfileSettings(): Promise<ProfileSettings | null> {
  const session = await authService.getSession();
  if (!session) return null;
  const profile = await profileRepository.getOwnProfile();
  if (!profile || profile.userId !== session.user.id) return null;
  return { email: session.user.email, profile };
}

export async function updateCurrentProfileSettings(
  input: UpdateOwnProfileInput,
  repository: ProfileRepository = profileRepository,
  recalculateRecommendations: RecommendationRecalculator = recalculateRecommendationsForProfile,
): Promise<UserProfile> {
  const profile = await repository.updateOwnProfile(input);
  if (input.progressionStyle !== undefined) {
    await recalculateRecommendations(profile);
  }
  return profile;
}

async function recalculateRecommendationsForProfile(profile: UserProfile): Promise<void> {
  const persistence = await createWorkoutPersistence();
  await recalculateActiveRecommendations(persistence, profile.userId);
}

export async function prepareSafeLogout(
  dependencies: SafeLogoutDependencies = safeLogoutDependencies,
): Promise<LogoutPreparation> {
  const userId = await dependencies.getCurrentUserId();
  if (userId && await dependencies.countPending(userId) > 0) return "pending_sync";
  await dependencies.signOut();
  return "signed_out";
}

export async function trySyncAndLogout(
  dependencies: SafeLogoutDependencies = safeLogoutDependencies,
): Promise<boolean> {
  const userId = await dependencies.getCurrentUserId();
  if (!userId) {
    await dependencies.signOut();
    return true;
  }
  const result = await dependencies.synchronize(userId);
  if (!result.success || result.remainingQueueSize > 0 || await dependencies.countPending(userId) > 0) {
    return false;
  }
  await dependencies.signOut();
  return true;
}

const safeLogoutDependencies: SafeLogoutDependencies = {
  countPending: countPendingSyncItems,
  getCurrentUserId: async () => (await authService.getSession())?.user.id ?? null,
  signOut: () => authService.signOut(),
  synchronize: synchronizePendingItems,
};
