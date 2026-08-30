import { act, fireEvent, render } from '@testing-library/react-native';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';
import type { ProfileRepository } from '@/lib/supabase/repositories';

function createProfileRepository(): jest.Mocked<ProfileRepository> {
  return {
    getOwnProfile: jest.fn(),
    createOwnProfile: jest.fn(),
    updateOwnProfile: jest.fn(),
  };
}

async function selectRequiredChoices(
  screen: Awaited<ReturnType<typeof render>>,
) {
  await fireEvent.press(screen.getByLabelText('Kilograms'));
  await fireEvent.press(screen.getByLabelText('Build muscle'));
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders unselected required choices instead of accepting provisional values', async () => {
    const profileRepository = createProfileRepository();
    const screen = await render(<OnboardingScreen profileRepository={profileRepository} />);

    expect(screen.getByText('Weight unit')).toBeTruthy();
    expect(screen.getByText('Primary goal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start Training' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.getByLabelText('Pounds')).toHaveProp('accessibilityState',
      expect.objectContaining({ selected: false }),
    );
    expect(screen.getByLabelText('Both')).toHaveProp('accessibilityState',
      expect.objectContaining({ selected: false }),
    );
    expect(profileRepository.updateOwnProfile).not.toHaveBeenCalled();
  });

  it('requires both selections before completion', async () => {
    const profileRepository = createProfileRepository();
    const screen = await render(<OnboardingScreen profileRepository={profileRepository} />);

    await fireEvent.press(screen.getByLabelText('Kilograms'));
    expect(screen.getByRole('button', { name: 'Start Training' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ disabled: true }),
    );
    expect(profileRepository.updateOwnProfile).not.toHaveBeenCalled();
  });

  it('persists the selected profile values and returns to root routing', async () => {
    const profileRepository = createProfileRepository();
    profileRepository.updateOwnProfile.mockResolvedValue({} as never);
    const screen = await render(<OnboardingScreen profileRepository={profileRepository} />);
    await selectRequiredChoices(screen);

    await fireEvent.press(screen.getByRole('button', { name: 'Start Training' }));

    expect(profileRepository.updateOwnProfile).toHaveBeenCalledWith({
      weightUnit: 'kg',
      primaryGoal: 'hypertrophy',
      rpePreference: 'optional',
      progressionStyle: 'balanced',
      defaultRestDurationSeconds: 120,
      onboardingCompleted: true,
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('stays in onboarding and shows a recoverable error when persistence fails', async () => {
    const profileRepository = createProfileRepository();
    profileRepository.updateOwnProfile.mockRejectedValue(new Error('private provider detail'));
    const screen = await render(<OnboardingScreen profileRepository={profileRepository} />);
    await selectRequiredChoices(screen);

    await fireEvent.press(screen.getByRole('button', { name: 'Start Training' }));

    expect(
      await screen.findByText('Unable to save your setup. Check your connection and try again.'),
    ).toBeTruthy();
    expect(screen.queryByText('private provider detail')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Set up your profile')).toBeTruthy();
  });

  it('prevents duplicate completion submissions while saving', async () => {
    const profileRepository = createProfileRepository();
    let resolveUpdate!: (value: never) => void;
    profileRepository.updateOwnProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const screen = await render(<OnboardingScreen profileRepository={profileRepository} />);
    await selectRequiredChoices(screen);
    const submit = screen.getByRole('button', { name: 'Start Training' });

    await act(async () => {
      fireEvent.press(submit);
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.press(submit);
      await Promise.resolve();
    });

    expect(profileRepository.updateOwnProfile).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => {
      resolveUpdate(undefined as never);
      await Promise.resolve();
    });
  });
});
