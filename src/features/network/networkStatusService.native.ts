import * as Network from "expo-network";

import { createNetworkStatusService } from "./networkStatus";

export const networkStatusService = createNetworkStatusService({
  getCurrentState: Network.getNetworkStateAsync,
  subscribe: (listener) => {
    const subscription = Network.addNetworkStateListener(listener);
    return () => subscription.remove();
  },
});
