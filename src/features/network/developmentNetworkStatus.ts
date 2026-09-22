import type { NetworkStatus, NetworkStatusService } from "./networkStatus";

export type DevelopmentNetworkStatusService = NetworkStatusService & {
  readonly simulationEnabled: boolean;
  isSimulatingOffline(): boolean;
  setSimulatedOffline(simulated: boolean): Promise<void>;
};

export function createDevelopmentNetworkStatusService(
  platformService: NetworkStatusService,
  simulationEnabled: boolean,
): DevelopmentNetworkStatusService {
  let platformStatus: NetworkStatus = "unknown";
  let simulatedOffline = false;
  let stopPlatform: (() => void) | undefined;
  const listeners = new Set<(status: NetworkStatus) => void>();
  const effectiveStatus = () => simulatedOffline ? "offline" as const : platformStatus;
  const notify = () => listeners.forEach((listener) => listener(effectiveStatus()));

  function ensurePlatformSubscription(): void {
    if (stopPlatform) return;
    stopPlatform = platformService.subscribe((status) => {
      platformStatus = status;
      notify();
    });
  }

  return {
    simulationEnabled,
    async getCurrentStatus() {
      platformStatus = await platformService.getCurrentStatus();
      return effectiveStatus();
    },
    isSimulatingOffline: () => simulatedOffline,
    async setSimulatedOffline(simulated) {
      if (!simulationEnabled) {
        throw new Error("Offline simulation is available only in development.");
      }
      if (simulatedOffline === simulated) return;
      simulatedOffline = simulated;
      if (!simulated) platformStatus = await platformService.getCurrentStatus();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      ensurePlatformSubscription();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopPlatform?.();
          stopPlatform = undefined;
        }
      };
    },
  };
}
