export type RootRoutingState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; onboardingComplete: boolean };

export type ResolvedRootRoute =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'redirect';
      href:
        | '/(auth)/welcome'
        | '/(onboarding)/setup'
        | '/(tabs)/home';
    };

export function resolveRootRoute(
  state: RootRoutingState,
): ResolvedRootRoute {
  if (state.status === 'loading') {
    return { status: 'loading' };
  }

  if (state.status === 'error') {
    return { status: 'error' };
  }

  if (state.status === 'unauthenticated') {
    return { status: 'redirect', href: '/(auth)/welcome' };
  }

  if (!state.onboardingComplete) {
    return { status: 'redirect', href: '/(onboarding)/setup' };
  }

  return { status: 'redirect', href: '/(tabs)/home' };
}
