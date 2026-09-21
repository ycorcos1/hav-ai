import { Slot, useSegments } from 'expo-router';

import { RootRouteGuard } from '@/features/routing/components/RootRouteGuard';
import { rootRoutingDependencies } from '@/features/routing/rootRoutingDependencies';
import '@/lib/environment';
import '@/lib/supabase/client';
import { RestTimerProvider } from '@/features/workouts/components/RestTimerProvider';
import { NetworkStatusProvider } from '@/features/network/components/NetworkStatusProvider';
import { SyncStatusProvider } from '@/features/sync/components/SyncStatusProvider';
import { applicationSyncProcessor } from '@/features/sync/services/applicationSyncProcessor';

export default function RootLayout() {
  const segments = useSegments();

  return (
    <RootRouteGuard {...rootRoutingDependencies} segments={segments}>
      <NetworkStatusProvider>
        <SyncStatusProvider processor={applicationSyncProcessor}>
          <RestTimerProvider><Slot /></RestTimerProvider>
        </SyncStatusProvider>
      </NetworkStatusProvider>
    </RootRouteGuard>
  );
}
