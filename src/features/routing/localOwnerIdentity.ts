import type { LocalProfileCacheRepository } from "@/db/repositories/types";
import { AuthServiceError, type AuthService } from "@/lib/supabase/services/AuthService";
import type { PersistedOwner } from "@/lib/supabase/persistedOwner";
import type { UserProfile } from "@/shared/contracts";
import { userProfileSchema } from "@/shared/schemas/profile";

export type LocalOwnerIdentity = {
  userId: string;
  source: "session" | "offline-persisted-owner";
  cachedProfile: UserProfile | null;
  assertCurrent: () => void;
};

export type LocalOwnerDependencies = {
  authService: Pick<AuthService, "getSession">;
  readOwner: () => PersistedOwner | null;
  profileCache: Pick<LocalProfileCacheRepository, "get">;
};

export async function resolveLocalOwner(dependencies: LocalOwnerDependencies): Promise<LocalOwnerIdentity | null> {
  const before = dependencies.readOwner();
  let userId: string;
  let source: LocalOwnerIdentity["source"] = "session";
  try {
    const session = await dependencies.authService.getSession();
    if (!session) return null;
    userId = session.user.id;
  } catch (error) {
    if (!(error instanceof AuthServiceError) || error.code !== "network_error") throw error;
    if (!before || !before.isCurrent()) throw error;
    userId = before.userId;
    source = "offline-persisted-owner";
  }
  const current = dependencies.readOwner();
  if (!current || current.userId !== userId) throw new Error("Local ownership is unavailable.");
  const assertCurrent = () => {
    if (!current.isCurrent()) throw new Error("Local ownership changed. Try again.");
  };
  const cachedProfile = await dependencies.profileCache.get(userId);
  assertCurrent();
  if (cachedProfile && cachedProfile.userId !== userId) throw new Error("Local profile ownership does not match.");
  if (cachedProfile && !userProfileSchema.safeParse(cachedProfile).success) throw new Error("Local profile is invalid.");
  if (source === "offline-persisted-owner" && !cachedProfile) throw new Error("An owned local profile is required for offline recovery.");
  return { userId, source, cachedProfile, assertCurrent };
}
