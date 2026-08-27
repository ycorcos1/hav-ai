import { RootRouteGuard } from '@/features/routing/components/RootRouteGuard';
import type { RootRoutingState } from '@/features/routing/resolveRootRoute';

// Temporary until the real session and profile state are implemented.
const temporaryRootRoutingState: RootRoutingState = {
  status: 'authenticated',
  onboardingComplete: true,
};

export default function Index() {
  return <RootRouteGuard state={temporaryRootRoutingState} />;
}
