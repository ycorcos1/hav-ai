import { act, fireEvent, render } from "@testing-library/react-native";
import { Text, type AppStateStatus } from "react-native";

import { PersistentSyncFailureBanner } from "@/features/sync/components/PersistentSyncFailureBanner";
import { SyncStatusProvider } from "@/features/sync/components/SyncStatusProvider";
import type { NetworkStatus, NetworkStatusService } from "@/features/network/networkStatus";
import type { AppStateSource, SyncProcessor } from "@/features/sync/services";
import type { SyncResult } from "@/shared/contracts";

const failedResult: SyncResult = {
  success: false,
  processed: 1,
  succeeded: 0,
  failed: 1,
  remainingQueueSize: 1,
  errors: [{
    queueItemId: "queue-a",
    entityType: "workout",
    entityId: "workout-a",
    code: "SYNC_NETWORK_ERROR",
  }],
};
const successResult: SyncResult = {
  success: true,
  processed: 1,
  succeeded: 1,
  failed: 0,
  remainingQueueSize: 0,
  errors: [],
};

describe("persistent sync failure UX", () => {
  it("keeps local content available and offers a successful manual retry", async () => {
    const network = controlledNetwork("offline");
    const appState = controlledAppState("active");
    const synchronize = jest.fn()
      .mockResolvedValueOnce(failedResult)
      .mockResolvedValueOnce(successResult);
    const screen = await render(
      <SyncStatusProvider
        appStateSource={appState.source}
        networkService={network.service}
        processor={{ synchronize }}
      >
        <Text>local workout stays usable</Text>
        <PersistentSyncFailureBanner />
      </SyncStatusProvider>,
    );
    await network.initialSettled();

    await act(async () => network.emit("online"));
    expect(await screen.findByText("Couldn't sync workout")).toBeOnTheScreen();
    expect(screen.getByText("Your workout is saved on this device.")).toBeOnTheScreen();
    expect(screen.getByText("local workout stays usable")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(synchronize).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Couldn't sync workout")).toBeNull();
    await screen.unmount();
  });

  it("keeps the retry surface visible after another persistent failure", async () => {
    const network = controlledNetwork("offline");
    const appState = controlledAppState("active");
    const synchronize = jest.fn().mockResolvedValue(failedResult);
    const screen = await render(
      <SyncStatusProvider
        appStateSource={appState.source}
        networkService={network.service}
        processor={{ synchronize }}
      >
        <PersistentSyncFailureBanner />
      </SyncStatusProvider>,
    );
    await network.initialSettled();
    await act(async () => network.emit("online"));
    await fireEvent.press(await screen.findByRole("button", { name: "Retry" }));
    expect(screen.getByText("Your workout is saved on this device.")).toBeOnTheScreen();
    expect(synchronize).toHaveBeenCalledTimes(2);
    await screen.unmount();
  });
});

function controlledNetwork(initial: NetworkStatus) {
  let listener: ((status: NetworkStatus) => void) | undefined;
  let resolveInitial!: (status: NetworkStatus) => void;
  const initialPromise = new Promise<NetworkStatus>((resolve) => { resolveInitial = resolve; });
  const service: NetworkStatusService = {
    getCurrentStatus: jest.fn(() => initialPromise),
    subscribe: jest.fn((next) => { listener = next; return jest.fn(); }),
  };
  return {
    emit: (status: NetworkStatus) => listener?.(status),
    initialSettled: async () => { await act(async () => resolveInitial(initial)); },
    service,
  };
}

function controlledAppState(initial: AppStateStatus) {
  let listener: ((status: AppStateStatus) => void) | undefined;
  const source: AppStateSource = {
    currentState: initial,
    addEventListener: jest.fn((_type, next) => {
      listener = next;
      return { remove: jest.fn() };
    }),
  };
  return { emit: (status: AppStateStatus) => listener?.(status), source };
}
