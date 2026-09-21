import { CachedProfileRepository } from "@/features/profile/services/CachedProfileRepository";
import {
  SupabaseProfileRepository,
  type ProfileRepository,
  type UpdateOwnProfileInput,
} from "@/lib/supabase/repositories";
import { authService } from "@/lib/supabase/services";
import type { UserProfile } from "@/shared/contracts";

const profileRepository = new CachedProfileRepository(new SupabaseProfileRepository());

export type ProfileSettings = {
  email?: string;
  profile: UserProfile;
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
): Promise<UserProfile> {
  return repository.updateOwnProfile(input);
}
