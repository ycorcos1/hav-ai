import { createNetworkStatusService, type PlatformNetworkState } from "./networkStatus";

function currentBrowserState(): PlatformNetworkState {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return {};
  return { isConnected: navigator.onLine, isInternetReachable: navigator.onLine };
}

export const networkStatusService = createNetworkStatusService({
  getCurrentState: async () => currentBrowserState(),
  subscribe: (listener) => {
    if (typeof window === "undefined") return () => {};
    const update = () => listener(currentBrowserState());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  },
});
