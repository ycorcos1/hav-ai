import { OfflineBanner } from "@/components/OfflineBanner";
import { PersistentSyncFailureBanner } from "@/features/sync/components/PersistentSyncFailureBanner";

import { useNetworkStatus } from "./NetworkStatusProvider";

export function WorkoutOfflineBanner() {
  return (
    <>
      <OfflineBanner visible={useNetworkStatus() === "offline"} />
      <PersistentSyncFailureBanner />
    </>
  );
}
