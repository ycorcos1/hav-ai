import * as Network from "expo-network";

import { createDevelopmentNetworkStatusService } from "./developmentNetworkStatus";
import { createNetworkStatusService } from "./networkStatus";

const platformNetworkStatusService = createNetworkStatusService({
  getCurrentState: Network.getNetworkStateAsync,
  subscribe: (listener) => {
    const subscription = Network.addNetworkStateListener(listener);
    return () => subscription.remove();
  },
});

export const networkStatusService = createDevelopmentNetworkStatusService(
  platformNetworkStatusService,
  process.env.EXPO_PUBLIC_APP_ENV === "development",
);
