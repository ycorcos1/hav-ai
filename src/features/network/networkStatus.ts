export type NetworkStatus = "unknown" | "online" | "offline";

export interface NetworkStatusService {
  getCurrentStatus(): Promise<NetworkStatus>;
  subscribe(listener: (status: NetworkStatus) => void): () => void;
}

export type PlatformNetworkState = {
  isConnected?: boolean;
  isInternetReachable?: boolean;
};

export interface PlatformNetworkSource {
  getCurrentState(): Promise<PlatformNetworkState>;
  subscribe(listener: (state: PlatformNetworkState) => void): () => void;
}

export function mapNetworkStatus(state: PlatformNetworkState): NetworkStatus {
  if (state.isConnected === false || state.isInternetReachable === false) return "offline";
  if (state.isConnected === true && state.isInternetReachable === true) return "online";
  return "unknown";
}

export function createNetworkStatusService(source: PlatformNetworkSource): NetworkStatusService {
  return {
    getCurrentStatus: async () => mapNetworkStatus(await source.getCurrentState()),
    subscribe: (listener) => source.subscribe((state) => listener(mapNetworkStatus(state))),
  };
}
