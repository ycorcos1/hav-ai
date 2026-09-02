import { Slot, useSegments } from 'expo-router';

import { RootRouteGuard } from '@/features/routing/components/RootRouteGuard';
import { rootRoutingDependencies } from '@/features/routing/rootRoutingDependencies';
import '@/lib/environment';
import '@/lib/supabase/client';

export default function RootLayout() {
  const segments = useSegments();

  return (
    <RootRouteGuard {...rootRoutingDependencies} segments={segments}>
      <Slot />
    </RootRouteGuard>
  );
}
