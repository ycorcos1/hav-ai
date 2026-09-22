import { createDevelopmentNetworkStatusService } from "@/features/network/developmentNetworkStatus";
import type { NetworkStatus, NetworkStatusService } from "@/features/network/networkStatus";

function controlledPlatform(initial: NetworkStatus) {
  let current = initial;
  let listener: ((status: NetworkStatus) => void) | undefined;
  const stop = jest.fn();
  const service: NetworkStatusService = {
    getCurrentStatus: jest.fn(async () => current),
    subscribe: jest.fn((next) => {
      listener = next;
      return stop;
    }),
  };
  return {
    emit(status: NetworkStatus) {
      current = status;
      listener?.(status);
    },
    service,
    stop,
  };
}

describe("development network status", () => {
  it("overrides platform updates while simulated offline and restores the current platform state", async () => {
    const platform = controlledPlatform("online");
    const service = createDevelopmentNetworkStatusService(platform.service, true);
    const observed: NetworkStatus[] = [];
    const unsubscribe = service.subscribe((status) => observed.push(status));

    expect(await service.getCurrentStatus()).toBe("online");
    await service.setSimulatedOffline(true);
    platform.emit("online");
    expect(await service.getCurrentStatus()).toBe("offline");
    await service.setSimulatedOffline(false);

    expect(observed).toEqual(["offline", "offline", "online"]);
    expect(await service.getCurrentStatus()).toBe("online");
    unsubscribe();
    expect(platform.stop).toHaveBeenCalledTimes(1);
  });

  it("rejects simulation outside development without changing connectivity", async () => {
    const platform = controlledPlatform("online");
    const service = createDevelopmentNetworkStatusService(platform.service, false);

    await expect(service.setSimulatedOffline(true)).rejects.toThrow(
      "available only in development",
    );
    expect(service.isSimulatingOffline()).toBe(false);
    expect(await service.getCurrentStatus()).toBe("online");
  });
});
