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

export type ResolvedPersistentRootRoute =
  | ResolvedRootRoute
  | { status: 'allow' };

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

export function resolvePersistentRootRoute(
  state: RootRoutingState,
  segments: readonly string[],
): ResolvedPersistentRootRoute {
  const destination = resolveRootRoute(state);
  if (destination.status !== 'redirect') return destination;

  const currentArea = routeAreaFromSegments(segments);
  const destinationArea = routeAreaFromHref(destination.href);

  return currentArea === destinationArea
    ? { status: 'allow' }
    : destination;
}

type RouteArea = 'auth' | 'onboarding' | 'protected' | 'root';

function routeAreaFromSegments(segments: readonly string[]): RouteArea {
  const rootSegment = segments[0];
  if (!rootSegment) return 'root';
  if (rootSegment === '(auth)') return 'auth';
  if (rootSegment === '(onboarding)') return 'onboarding';
  return 'protected';
}

function routeAreaFromHref(
  href: Extract<ResolvedRootRoute, { status: 'redirect' }>['href'],
): Exclude<RouteArea, 'root'> {
  if (href === '/(auth)/welcome') return 'auth';
  if (href === '/(onboarding)/setup') return 'onboarding';
  return 'protected';
}
