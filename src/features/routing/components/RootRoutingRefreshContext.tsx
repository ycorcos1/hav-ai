import { createContext, type ReactNode, useContext } from 'react';

const RootRoutingRefreshContext = createContext<() => void>(() => {});

export function RootRoutingRefreshProvider({
  children,
  refresh,
}: {
  children: ReactNode;
  refresh: () => void;
}) {
  return (
    <RootRoutingRefreshContext.Provider value={refresh}>
      {children}
    </RootRoutingRefreshContext.Provider>
  );
}

export function useRootRoutingRefresh(): () => void {
  return useContext(RootRoutingRefreshContext);
}
