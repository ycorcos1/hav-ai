import {
  ProfileRepositoryError,
  type ProfileRepository,
} from '@/lib/supabase/repositories/ProfileRepository';
import type { AuthService } from '@/lib/supabase/services/AuthService';
import type { UserProfile } from '@/shared/contracts';
import {
  ensureProfile,
  EnsureProfileError,
} from '@/features/profile/useCases/ensureProfile';

const userId = '00000000-0000-4000-8000-000000000001';
const createdAt = '2026-08-30T12:00:00.000Z';
const updatedAt = '2026-08-30T12:00:00.000Z';

const incompleteProfile: UserProfile = {
  userId,
  weightUnit: 'lb',
  primaryGoal: 'hybrid',
  rpePreference: 'optional',
  progressionStyle: 'balanced',
  defaultRestDurationSeconds: 120,
  onboardingCompleted: false,
  createdAt,
  updatedAt,
};

function createAuthService(
  session: Awaited<ReturnType<AuthService['getSession']>> = { user: { id: userId } },
): jest.Mocked<AuthService> {
  return {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn().mockResolvedValue(session),
    subscribeToSession: jest.fn(),
  };
}

function createProfileRepository(): jest.Mocked<ProfileRepository> {
  return {
    getOwnProfile: jest.fn(),
    createOwnProfile: jest.fn(),
    updateOwnProfile: jest.fn(),
  };
}

describe('ensureProfile', () => {
  it('returns an existing profile unchanged without creating another', async () => {
    const authService = createAuthService();
    const profileRepository = createProfileRepository();
    const existingProfile = { ...incompleteProfile, primaryGoal: 'strength' as const };
    profileRepository.getOwnProfile.mockResolvedValue(existingProfile);

    await expect(ensureProfile({ authService, profileRepository })).resolves.toBe(
      existingProfile,
    );
    expect(profileRepository.createOwnProfile).not.toHaveBeenCalled();
    expect(profileRepository.updateOwnProfile).not.toHaveBeenCalled();
  });

  it('creates and returns the canonical incomplete profile for the authenticated user', async () => {
    const authService = createAuthService();
    const profileRepository = createProfileRepository();
    profileRepository.getOwnProfile.mockResolvedValue(null);
    profileRepository.createOwnProfile.mockResolvedValue(incompleteProfile);

    await expect(ensureProfile({ authService, profileRepository })).resolves.toEqual(
      incompleteProfile,
    );
    expect(profileRepository.createOwnProfile).toHaveBeenCalledWith({
      userId,
      weightUnit: 'lb',
      primaryGoal: 'hybrid',
    });
    expect(incompleteProfile).toMatchObject({
      rpePreference: 'optional',
      progressionStyle: 'balanced',
      defaultRestDurationSeconds: 120,
      onboardingCompleted: false,
    });
  });

  it('is idempotent across repeated execution', async () => {
    const authService = createAuthService();
    const profileRepository = createProfileRepository();
    profileRepository.getOwnProfile
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(incompleteProfile);
    profileRepository.createOwnProfile.mockResolvedValue(incompleteProfile);

    await expect(ensureProfile({ authService, profileRepository })).resolves.toEqual(
      incompleteProfile,
    );
    await expect(ensureProfile({ authService, profileRepository })).resolves.toEqual(
      incompleteProfile,
    );
    expect(profileRepository.createOwnProfile).toHaveBeenCalledTimes(1);
  });

  it('fails with a sanitized error before profile access when no session exists', async () => {
    const authService = createAuthService(null);
    const profileRepository = createProfileRepository();

    const request = ensureProfile({ authService, profileRepository });

    await expect(request).rejects.toBeInstanceOf(EnsureProfileError);
    await expect(request).rejects.toMatchObject({
      name: 'EnsureProfileError',
      code: 'no_authenticated_session',
    });
    expect(profileRepository.getOwnProfile).not.toHaveBeenCalled();
    expect(profileRepository.createOwnProfile).not.toHaveBeenCalled();
  });

  it('recovers when another startup call creates the profile first', async () => {
    const authService = createAuthService();
    const profileRepository = createProfileRepository();
    const creationError = new ProfileRepositoryError('createOwnProfile');
    profileRepository.getOwnProfile
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(incompleteProfile);
    profileRepository.createOwnProfile.mockRejectedValue(creationError);

    await expect(ensureProfile({ authService, profileRepository })).resolves.toBe(
      incompleteProfile,
    );
    expect(profileRepository.createOwnProfile).toHaveBeenCalledTimes(1);
    expect(profileRepository.getOwnProfile).toHaveBeenCalledTimes(2);
  });

  it('rethrows the original creation failure when recovery finds no profile', async () => {
    const authService = createAuthService();
    const profileRepository = createProfileRepository();
    const creationError = new ProfileRepositoryError('createOwnProfile');
    profileRepository.getOwnProfile.mockResolvedValue(null);
    profileRepository.createOwnProfile.mockRejectedValue(creationError);

    await expect(ensureProfile({ authService, profileRepository })).rejects.toBe(
      creationError,
    );
    expect(profileRepository.getOwnProfile).toHaveBeenCalledTimes(2);
    expect(profileRepository.createOwnProfile).toHaveBeenCalledTimes(1);
  });

  it('preserves the original creation failure if the recovery lookup also fails', async () => {
    const authService = createAuthService();
    const profileRepository = createProfileRepository();
    const creationError = new ProfileRepositoryError('createOwnProfile');
    profileRepository.getOwnProfile
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new ProfileRepositoryError('getOwnProfile'));
    profileRepository.createOwnProfile.mockRejectedValue(creationError);

    await expect(ensureProfile({ authService, profileRepository })).rejects.toBe(
      creationError,
    );
  });

  it('propagates lookup failures without attempting creation', async () => {
    const authService = createAuthService();
    const profileRepository = createProfileRepository();
    const lookupError = new ProfileRepositoryError('getOwnProfile');
    profileRepository.getOwnProfile.mockRejectedValue(lookupError);

    await expect(ensureProfile({ authService, profileRepository })).rejects.toBe(
      lookupError,
    );
    expect(profileRepository.createOwnProfile).not.toHaveBeenCalled();
  });
});
