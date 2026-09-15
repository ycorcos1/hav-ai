import { act, render } from "@testing-library/react-native";
import { Text, type AppStateStatus } from "react-native";

import { SyncTriggerBridge } from "@/features/sync/components/SyncTriggerBridge";
import type { NetworkStatus, NetworkStatusService } from "@/features/network/networkStatus";
import type { AppStateSource, SyncProcessor } from "@/features/sync/services";
import type { SyncResult } from "@/shared/contracts";

const emptyResult: SyncResult = {
  success: true,
  processed: 0,
  succeeded: 0,
  failed: 0,
  remainingQueueSize: 0,
  errors: [],
};

describe("sync triggers", () => {
  it("triggers only on a proven offline-to-online transition", async () => {
    const network = controlledNetwork("offline");
    const appState = controlledAppState("active");
    const processor = controlledProcessor();
    const screen = await render(
      <SyncTriggerBridge
        processor={processor.service}
        networkService={network.service}
        appStateSource={appState.source}
      >
        <Text>child</Text>
      </SyncTriggerBridge>,
    );
    await network.initialSettled();

    await act(async () => network.emit("unknown"));
    await act(async () => network.emit("online"));
    expect(processor.synchronize).not.toHaveBeenCalled();

    await act(async () => network.emit("offline"));
    await act(async () => network.emit("online"));
    expect(processor.synchronize).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it("triggers when the app returns to foreground and ignores repeated active events", async () => {
    const network = controlledNetwork("online");
    const appState = controlledAppState("background");
    const processor = controlledProcessor();
    const screen = await render(
      <SyncTriggerBridge
        processor={processor.service}
        networkService={network.service}
        appStateSource={appState.source}
      >
        <Text>child</Text>
      </SyncTriggerBridge>,
    );

    await act(async () => appState.emit("active"));
    await act(async () => appState.emit("active"));
    expect(processor.synchronize).toHaveBeenCalledTimes(1);

    await act(async () => appState.emit("background"));
    await act(async () => appState.emit("active"));
    expect(processor.synchronize).toHaveBeenCalledTimes(2);
    await screen.unmount();
  });

  it("creates one subscription per source and cleans both up", async () => {
    const network = controlledNetwork("unknown");
    const appState = controlledAppState("active");
    const processor = controlledProcessor();
    const props = {
      processor: processor.service,
      networkService: network.service,
      appStateSource: appState.source,
    };
    const screen = await render(
      <SyncTriggerBridge {...props}><Text>child</Text></SyncTriggerBridge>,
    );
    await screen.rerender(
      <SyncTriggerBridge {...props}><Text>updated</Text></SyncTriggerBridge>,
    );

    expect(network.subscribe).toHaveBeenCalledTimes(1);
    expect(appState.addEventListener).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(network.unsubscribe).toHaveBeenCalledTimes(1);
    expect(appState.remove).toHaveBeenCalledTimes(1);
  });

  it("protects local UI from rejected sync attempts", async () => {
    const network = controlledNetwork("offline");
    const appState = controlledAppState("active");
    const processor = controlledProcessor(new Error("auth not ready"));
    const screen = await render(
      <SyncTriggerBridge
        processor={processor.service}
        networkService={network.service}
        appStateSource={appState.source}
      >
        <Text>local workout remains available</Text>
      </SyncTriggerBridge>,
    );
    await network.initialSettled();

    await act(async () => network.emit("online"));
    expect(await screen.findByText("local workout remains available")).toBeOnTheScreen();
    expect(processor.synchronize).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });
});

function controlledNetwork(initial: NetworkStatus) {
  let listener: ((status: NetworkStatus) => void) | undefined;
  let resolveInitial!: (status: NetworkStatus) => void;
  const initialPromise = new Promise<NetworkStatus>((resolve) => { resolveInitial = resolve; });
  const unsubscribe = jest.fn();
  const subscribe = jest.fn((next: (status: NetworkStatus) => void) => {
    listener = next;
    return unsubscribe;
  });
  const service: NetworkStatusService = {
    getCurrentStatus: jest.fn(() => initialPromise),
    subscribe,
  };
  return {
    emit: (status: NetworkStatus) => listener?.(status),
    initialSettled: async () => {
      await act(async () => resolveInitial(initial));
    },
    service,
    subscribe,
    unsubscribe,
  };
}

function controlledAppState(initial: AppStateStatus) {
  let listener: ((status: AppStateStatus) => void) | undefined;
  let currentState = initial;
  const remove = jest.fn();
  const addEventListener = jest.fn((
    _type: "change",
    next: (status: AppStateStatus) => void,
  ) => {
    listener = next;
    return { remove };
  });
  const source: AppStateSource = {
    get currentState() { return currentState; },
    addEventListener,
  };
  return {
    addEventListener,
    emit: (status: AppStateStatus) => {
      currentState = status;
      listener?.(status);
    },
    remove,
    source,
  };
}

function controlledProcessor(failure?: Error): {
  service: SyncProcessor;
  synchronize: jest.Mock<Promise<SyncResult>, []>;
} {
  const synchronize = jest.fn(async () => {
    if (failure) throw failure;
    return emptyResult;
  });
  return { service: { synchronize }, synchronize };
}
