import { RootRouteGuard } from '@/features/routing/components/RootRouteGuard';
import { rootRoutingDependencies } from '@/features/routing/rootRoutingDependencies';

export default function Index() {
  return <RootRouteGuard {...rootRoutingDependencies} />;
}
