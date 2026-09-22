import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { NetworkStatusService } from "@/features/network/networkStatus";
import type { AppStateSource, SyncProcessor } from "@/features/sync/services";

import { SyncTriggerBridge } from "./SyncTriggerBridge";

type SyncStatusContextValue = {
  failed: boolean;
  lastSuccessfulSyncAt?: string;
  retry: () => Promise<void>;
  retrying: boolean;
};

const SyncStatusContext = createContext<SyncStatusContextValue>({
  failed: false,
  retry: async () => {},
  retrying: false,
});

export type SyncStatusProviderProps = PropsWithChildren<{
  appStateSource?: AppStateSource;
  networkService?: NetworkStatusService;
  now?: () => string;
  processor: SyncProcessor;
}>;

export function SyncStatusProvider({
  appStateSource,
  children,
  networkService,
  now = () => new Date().toISOString(),
  processor,
}: SyncStatusProviderProps) {
  const [failed, setFailed] = useState(false);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string>();
  const [retrying, setRetrying] = useState(false);

  const synchronize = useCallback(async (): ReturnType<SyncProcessor["synchronize"]> => {
    setRetrying(true);
    try {
      const result = await processor.synchronize();
      setFailed(!result.success && result.remainingQueueSize > 0);
      if (result.success) setLastSuccessfulSyncAt(now());
      return result;
    } catch (error) {
      // Preconditions can disappear during auth or network transitions. Existing
      // visible failures remain actionable; unknown trigger failures stay quiet.
      throw error;
    } finally {
      setRetrying(false);
    }
  }, [now, processor]);

  const observedProcessor = useMemo<SyncProcessor>(() => ({ synchronize }), [synchronize]);
  const value = useMemo(() => ({
    failed,
    lastSuccessfulSyncAt,
    retry: async () => { await synchronize().catch(() => {}); },
    retrying,
  }), [failed, lastSuccessfulSyncAt, retrying, synchronize]);

  return (
    <SyncStatusContext.Provider value={value}>
      <SyncTriggerBridge
        appStateSource={appStateSource}
        networkService={networkService}
        processor={observedProcessor}
      >
        {children}
      </SyncTriggerBridge>
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  return useContext(SyncStatusContext);
}
