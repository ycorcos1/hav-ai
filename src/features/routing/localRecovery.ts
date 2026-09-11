import { createProfileCachePersistence } from "@/features/profile/services/profileCachePersistence";
import { ensureProfile } from "@/features/profile/useCases/ensureProfile";
import { createWorkoutPersistence } from "@/features/workouts/services/workoutPersistence";
import { environment } from "@/lib/environment";
import { authStorage } from "@/lib/supabase/authStorage";
import { readPersistedOwner, sessionStorageKey } from "@/lib/supabase/persistedOwner";
import { authService } from "@/lib/supabase/services";
import type { EnsureProfileDependencies } from "@/features/profile/useCases/ensureProfile";

import { resolveLocalOwner } from "./localOwnerIdentity";
import type { RootRoutingState } from "./resolveRootRoute";

export async function resolveCurrentLocalOwner() {
  const { profileCacheRepository } = await createProfileCachePersistence();
  return resolveLocalOwner({
    authService,
    profileCache: profileCacheRepository,
    readOwner: () => readPersistedOwner(authStorage, sessionStorageKey(environment.supabaseUrl)),
  });
}

export async function requireCurrentLocalOwner() {
  const owner = await resolveCurrentLocalOwner();
  if (!owner) throw new Error("Local workouts require an identified owner.");
  return owner;
}

export async function recoverLocalStartup(dependencies: EnsureProfileDependencies): Promise<RootRoutingState> {
  // Initialize local persistence before resolving auth or reading owned data.
  const persistence = await createWorkoutPersistence();
  const owner = await resolveCurrentLocalOwner();
  if (!owner) return { status: "unauthenticated" };
  const profile = owner.cachedProfile ?? await ensureProfile(dependencies);
  owner.assertCurrent();
  if (profile.userId !== owner.userId) throw new Error("Startup ownership changed.");
  await persistence.workoutRepository.getActiveForUser(owner.userId);
  owner.assertCurrent();
  return { status: owner.source === "session" ? "authenticated" : "local-owner",
    onboardingComplete: profile.onboardingCompleted };
}
