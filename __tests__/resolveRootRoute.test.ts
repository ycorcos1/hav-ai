import { resolveRootRoute } from '@/features/routing/resolveRootRoute';

describe('root route guard', () => {
  it('keeps the loading state on the splash branch', () => {
    expect(resolveRootRoute({ status: 'loading' })).toEqual({
      status: 'loading',
    });
  });

  it('keeps startup failures separate from valid auth states', () => {
    expect(resolveRootRoute({ status: 'error' })).toEqual({
      status: 'error',
    });
  });

  it('routes unauthenticated users to the auth group', () => {
    expect(resolveRootRoute({ status: 'unauthenticated' })).toEqual({
      status: 'redirect',
      href: '/(auth)/welcome',
    });
  });

  it('routes incomplete profiles to the onboarding group', () => {
    expect(
      resolveRootRoute({
        status: 'authenticated',
        onboardingComplete: false,
      }),
    ).toEqual({
      status: 'redirect',
      href: '/(onboarding)/setup',
    });
  });

  it('routes completed profiles to the main tabs', () => {
    expect(
      resolveRootRoute({
        status: 'authenticated',
        onboardingComplete: true,
      }),
    ).toEqual({
      status: 'redirect',
      href: '/(tabs)/home',
    });
  });
});
