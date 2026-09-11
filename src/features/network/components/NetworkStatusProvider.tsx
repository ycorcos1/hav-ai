import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { type NetworkStatus, type NetworkStatusService } from "../networkStatus";
import { networkStatusService } from "../networkStatusService";

const NetworkStatusContext = createContext<NetworkStatus>("unknown");

export type NetworkStatusProviderProps = PropsWithChildren<{ service?: NetworkStatusService }>;

export function NetworkStatusProvider({ children, service = networkStatusService }: NetworkStatusProviderProps) {
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    let active = true;
    let subscriptionRevision = 0;
    const unsubscribe = service.subscribe((nextStatus) => {
      subscriptionRevision += 1;
      if (active) setStatus(nextStatus);
    });
    const initialRevision = subscriptionRevision;
    void service.getCurrentStatus().then(
      (initialStatus) => {
        if (active && subscriptionRevision === initialRevision) setStatus(initialStatus);
      },
      () => { /* Unknown remains advisory when the platform query fails. */ },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [service]);

  return <NetworkStatusContext.Provider value={status}>{children}</NetworkStatusContext.Provider>;
}

export function useNetworkStatus(): NetworkStatus {
  return useContext(NetworkStatusContext);
}
