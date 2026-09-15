import { useEffect, type PropsWithChildren } from "react";
import { AppState } from "react-native";

import { networkStatusService } from "@/features/network/networkStatusService";

import {
  SyncTriggerController,
  type AppStateSource,
} from "../services/SyncTriggerController";
import type { SyncProcessor } from "../services/syncTypes";
import type { NetworkStatusService } from "@/features/network/networkStatus";

export type SyncTriggerBridgeProps = PropsWithChildren<{
  processor: SyncProcessor;
  networkService?: NetworkStatusService;
  appStateSource?: AppStateSource;
}>;

export function SyncTriggerBridge({
  appStateSource = AppState,
  children,
  networkService = networkStatusService,
  processor,
}: SyncTriggerBridgeProps) {
  useEffect(() => {
    const controller = new SyncTriggerController(processor, networkService, appStateSource);
    controller.start();
    return () => controller.stop();
  }, [appStateSource, networkService, processor]);

  return children;
}
