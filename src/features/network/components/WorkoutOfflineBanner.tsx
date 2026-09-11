import { OfflineBanner } from "@/components/OfflineBanner";

import { useNetworkStatus } from "./NetworkStatusProvider";

export function WorkoutOfflineBanner() {
  return <OfflineBanner visible={useNetworkStatus() === "offline"} />;
}
