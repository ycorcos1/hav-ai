import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { NetworkStatusProvider, useNetworkStatus } from "@/features/network/components/NetworkStatusProvider";
import { WorkoutOfflineBanner } from "@/features/network/components/WorkoutOfflineBanner";
import { createNetworkStatusService, mapNetworkStatus, type NetworkStatus, type NetworkStatusService } from "@/features/network/networkStatus";

function StatusProbe() {
  return <Text>{useNetworkStatus()}</Text>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function controllableService(initial: Promise<NetworkStatus>) {
  let listener: ((status: NetworkStatus) => void) | undefined;
  const unsubscribe = jest.fn();
  const service: NetworkStatusService = {
    getCurrentStatus: jest.fn(() => initial),
    subscribe: jest.fn((next) => { listener = next; return unsubscribe; }),
  };
  return { emit: (status: NetworkStatus) => listener?.(status), service, unsubscribe };
}

describe("network status", () => {
  it("maps explicit platform evidence to online, offline, or unknown", () => {
    expect(mapNetworkStatus({ isConnected: true, isInternetReachable: true })).toBe("online");
    expect(mapNetworkStatus({ isConnected: false, isInternetReachable: true })).toBe("offline");
    expect(mapNetworkStatus({ isConnected: true, isInternetReachable: false })).toBe("offline");
    expect(mapNetworkStatus({ isConnected: true })).toBe("unknown");
    expect(mapNetworkStatus({})).toBe("unknown");
  });

  it("provides equivalent initial and subscription mapping through the platform contract", async () => {
    let listener: ((state: { isConnected?: boolean; isInternetReachable?: boolean }) => void) | undefined;
    const remove = jest.fn();
    const service = createNetworkStatusService({
      getCurrentState: async () => ({ isConnected: false, isInternetReachable: false }),
      subscribe: (next) => { listener = next; return remove; },
    });
    expect(await service.getCurrentStatus()).toBe("offline");
    const statuses: NetworkStatus[] = [];
    const unsubscribe = service.subscribe((status) => statuses.push(status));
    listener?.({ isConnected: true, isInternetReachable: true });
    listener?.({});
    expect(statuses).toEqual(["online", "unknown"]);
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("updates in both directions without duplicating or leaking subscriptions", async () => {
    const controlled = controllableService(Promise.resolve("online"));
    const screen = await render(<NetworkStatusProvider service={controlled.service}><StatusProbe /></NetworkStatusProvider>);
    expect(await screen.findByText("online")).toBeTruthy();
    await act(async () => controlled.emit("offline"));
    expect(screen.getByText("offline")).toBeTruthy();
    await act(async () => controlled.emit("online"));
    expect(screen.getByText("online")).toBeTruthy();
    await screen.rerender(<NetworkStatusProvider service={controlled.service}><StatusProbe /></NetworkStatusProvider>);
    expect(controlled.service.subscribe).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(controlled.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("keeps unknown non-blocking and prevents a stale initial query from replacing a newer update", async () => {
    const initial = deferred<NetworkStatus>();
    const controlled = controllableService(initial.promise);
    const screen = await render(<NetworkStatusProvider service={controlled.service}><StatusProbe /></NetworkStatusProvider>);
    expect(screen.getByText("unknown")).toBeTruthy();
    await act(async () => controlled.emit("offline"));
    await act(async () => initial.resolve("online"));
    expect(screen.getByText("offline")).toBeTruthy();
  });

  it("keeps the workout banner hidden for unknown and online states", async () => {
    const controlled = controllableService(Promise.resolve("unknown"));
    const screen = await render(
      <NetworkStatusProvider service={controlled.service}><WorkoutOfflineBanner /></NetworkStatusProvider>,
    );
    expect(screen.queryByText("Offline · Saved on device")).toBeNull();
    await act(async () => controlled.emit("offline"));
    expect(screen.getByText("Offline · Saved on device")).toBeTruthy();
    await act(async () => controlled.emit("online"));
    expect(screen.queryByText("Offline · Saved on device")).toBeNull();
  });
});
