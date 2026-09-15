import type { AppStateStatus, NativeEventSubscription } from "react-native";

import type { NetworkStatus, NetworkStatusService } from "@/features/network/networkStatus";

import type { SyncProcessor } from "./syncTypes";

export interface AppStateSource {
  readonly currentState: AppStateStatus;
  addEventListener(
    type: "change",
    listener: (state: AppStateStatus) => void,
  ): NativeEventSubscription;
}

export class SyncTriggerController {
  private stopNetwork: (() => void) | undefined;
  private stopAppState: (() => void) | undefined;
  private networkStatus: NetworkStatus = "unknown";
  private appState: AppStateStatus;
  private networkRevision = 0;
  private active = false;

  constructor(
    private readonly processor: SyncProcessor,
    private readonly networkService: NetworkStatusService,
    private readonly appStateSource: AppStateSource,
  ) {
    this.appState = appStateSource.currentState;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.appState = this.appStateSource.currentState;
    this.stopNetwork = this.networkService.subscribe((status) => {
      this.networkRevision += 1;
      const previous = this.networkStatus;
      this.networkStatus = status;
      if (previous === "offline" && status === "online") this.requestSync();
    });
    const initialRevision = this.networkRevision;
    void this.networkService.getCurrentStatus().then(
      (status) => {
        if (!this.active || this.networkRevision !== initialRevision) return;
        this.networkStatus = status;
      },
      () => { /* Unknown connectivity remains non-triggering. */ },
    );
    const subscription = this.appStateSource.addEventListener("change", (state) => {
      const previous = this.appState;
      this.appState = state;
      if (previous !== "active" && state === "active") this.requestSync();
    });
    this.stopAppState = () => subscription.remove();
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.stopNetwork?.();
    this.stopAppState?.();
    this.stopNetwork = undefined;
    this.stopAppState = undefined;
  }

  private requestSync(): void {
    void this.processor.synchronize().catch(() => {
      // Queue state remains authoritative; triggers never make local work fail.
    });
  }
}
