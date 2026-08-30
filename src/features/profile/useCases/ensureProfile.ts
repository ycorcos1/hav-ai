import type { ProfileRepository } from '@/lib/supabase/repositories/ProfileRepository';
import type { AuthService } from '@/lib/supabase/services/AuthService';
import type { UserProfile } from '@/shared/contracts';

export type EnsureProfileErrorCode = 'no_authenticated_session';

export class EnsureProfileError extends Error {
  constructor(readonly code: EnsureProfileErrorCode) {
    super('Unable to ensure a profile without an authenticated session.');
    this.name = 'EnsureProfileError';
  }
}

export type EnsureProfileDependencies = {
  authService: AuthService;
  profileRepository: ProfileRepository;
};

export async function ensureProfile({
  authService,
  profileRepository,
}: EnsureProfileDependencies): Promise<UserProfile> {
  const session = await authService.getSession();

  if (!session) {
    throw new EnsureProfileError('no_authenticated_session');
  }

  const existingProfile = await profileRepository.getOwnProfile();

  if (existingProfile) return existingProfile;

  try {
    return await profileRepository.createOwnProfile({
      userId: session.user.id,
      weightUnit: 'lb',
      primaryGoal: 'hybrid',
    });
  } catch (creationError) {
    try {
      const concurrentlyCreatedProfile = await profileRepository.getOwnProfile();

      if (concurrentlyCreatedProfile) return concurrentlyCreatedProfile;
    } catch {
      // Preserve the original creation failure when race recovery cannot resolve a profile.
    }

    throw creationError;
  }
}
