import { act, fireEvent, render } from '@testing-library/react-native';

import { RootRouteGuard } from '@/features/routing/components/RootRouteGuard';
import type { ProfileRepository } from '@/lib/supabase/repositories/ProfileRepository';
import type {
  AuthService,
  SessionListener,
} from '@/lib/supabase/services/AuthService';
import type { AuthSession, UserProfile } from '@/shared/contracts';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, `redirect:${href}`),
  };
});

const session: AuthSession = {
  user: { id: '00000000-0000-4000-8000-000000000001' },
};
const incompleteProfile: UserProfile = {
  userId: session.user.id,
  weightUnit: 'lb',
  primaryGoal: 'hybrid',
  rpePreference: 'optional',
  progressionStyle: 'balanced',
  defaultRestDurationSeconds: 120,
  onboardingCompleted: false,
  createdAt: '2026-08-30T12:00:00.000Z',
  updatedAt: '2026-08-30T12:00:00.000Z',
};
const completeProfile: UserProfile = {
  ...incompleteProfile,
  onboardingCompleted: true,
};

type RoutingMocks = {
  authService: jest.Mocked<AuthService>;
  emitSession: (nextSession: AuthSession | null) => void;
  profileRepository: jest.Mocked<ProfileRepository>;
  unsubscribe: jest.Mock;
};

function createRoutingMocks(initialSession: AuthSession | null): RoutingMocks {
  let listener: SessionListener | undefined;
  const unsubscribe = jest.fn();
  const authService: jest.Mocked<AuthService> = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn().mockResolvedValue(initialSession),
    subscribeToSession: jest.fn((nextListener) => {
      listener = nextListener;
      return unsubscribe;
    }),
  };
  const profileRepository: jest.Mocked<ProfileRepository> = {
    getOwnProfile: jest.fn(),
    createOwnProfile: jest.fn(),
    updateOwnProfile: jest.fn(),
  };

  return {
    authService,
    emitSession: (nextSession) => listener?.(nextSession),
    profileRepository,
    unsubscribe,
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

describe('RootRouteGuard', () => {
  it('routes startup without a session to Welcome without resolving a profile', async () => {
    const mocks = createRoutingMocks(null);
    const screen = await render(<RootRouteGuard {...mocks} />);

    expect(await screen.findByText('redirect:/(auth)/welcome')).toBeTruthy();
    expect(mocks.profileRepository.getOwnProfile).not.toHaveBeenCalled();
    expect(mocks.profileRepository.createOwnProfile).not.toHaveBeenCalled();
  });

  it('routes an incomplete authenticated profile to Onboarding', async () => {
    const mocks = createRoutingMocks(session);
    mocks.profileRepository.getOwnProfile.mockResolvedValue(incompleteProfile);
    const screen = await render(<RootRouteGuard {...mocks} />);

    expect(await screen.findByText('redirect:/(onboarding)/setup')).toBeTruthy();
  });

  it('routes a complete authenticated profile to Home', async () => {
    const mocks = createRoutingMocks(session);
    mocks.profileRepository.getOwnProfile.mockResolvedValue(completeProfile);
    const screen = await render(<RootRouteGuard {...mocks} />);

    expect(await screen.findByText('redirect:/(tabs)/home')).toBeTruthy();
  });

  it('keeps the loading state while persisted auth is unresolved', async () => {
    const mocks = createRoutingMocks(null);
    const pendingSession = deferred<AuthSession | null>();
    mocks.authService.getSession.mockReturnValue(pendingSession.promise);
    const screen = await render(<RootRouteGuard {...mocks} />);

    expect(screen.getByText('havAI')).toBeTruthy();
    expect(screen.queryByText(/redirect:/)).toBeNull();
  });

  it('responds to signed-out and signed-in profile transitions', async () => {
    const mocks = createRoutingMocks(null);
    const screen = await render(<RootRouteGuard {...mocks} />);
    expect(await screen.findByText('redirect:/(auth)/welcome')).toBeTruthy();

    mocks.authService.getSession.mockResolvedValue(session);
    mocks.profileRepository.getOwnProfile
      .mockResolvedValueOnce(incompleteProfile)
      .mockResolvedValueOnce(completeProfile);

    await act(async () => mocks.emitSession(session));
    expect(await screen.findByText('redirect:/(onboarding)/setup')).toBeTruthy();

    await act(async () => mocks.emitSession(session));
    expect(await screen.findByText('redirect:/(tabs)/home')).toBeTruthy();

    await act(async () => mocks.emitSession(null));
    expect(await screen.findByText('redirect:/(auth)/welcome')).toBeTruthy();
  });

  it('shows a sanitized error and retries profile resolution', async () => {
    const mocks = createRoutingMocks(session);
    mocks.profileRepository.getOwnProfile
      .mockRejectedValueOnce(new Error('private provider detail'))
      .mockResolvedValueOnce(completeProfile);
    const screen = await render(<RootRouteGuard {...mocks} />);

    expect(await screen.findByText('Couldn’t start havAI')).toBeTruthy();
    expect(screen.queryByText('private provider detail')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    });

    expect(await screen.findByText('redirect:/(tabs)/home')).toBeTruthy();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not allow stale profile resolution to override sign-out', async () => {
    const mocks = createRoutingMocks(session);
    const pendingProfile = deferred<UserProfile | null>();
    mocks.profileRepository.getOwnProfile.mockReturnValue(pendingProfile.promise);
    const screen = await render(<RootRouteGuard {...mocks} />);
    expect(screen.getByText('havAI')).toBeTruthy();

    await act(async () => mocks.emitSession(null));
    expect(await screen.findByText('redirect:/(auth)/welcome')).toBeTruthy();

    await act(async () => pendingProfile.resolve(completeProfile));
    expect(screen.getByText('redirect:/(auth)/welcome')).toBeTruthy();
    expect(screen.queryByText('redirect:/(tabs)/home')).toBeNull();
  });

  it('disposes its single active subscription on unmount', async () => {
    const mocks = createRoutingMocks(null);
    const screen = await render(<RootRouteGuard {...mocks} />);
    await screen.findByText('redirect:/(auth)/welcome');

    expect(mocks.authService.subscribeToSession).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
