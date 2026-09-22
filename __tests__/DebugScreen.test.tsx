import { act, fireEvent, render } from "@testing-library/react-native";
import type { AppStateStatus } from "react-native";

import { DebugScreen } from "@/features/diagnostics/screens/DebugScreen";
import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import { createDevelopmentNetworkStatusService } from "@/features/network/developmentNetworkStatus";
import type { NetworkStatusService } from "@/features/network/networkStatus";
import { SyncStatusProvider } from "@/features/sync/components/SyncStatusProvider";
import type { AppStateSource } from "@/features/sync/services";
import type { SyncResult } from "@/shared/contracts";

const success: SyncResult = {
  success: true,
  processed: 1,
  succeeded: 1,
  failed: 0,
  remainingQueueSize: 0,
  errors: [],
};

describe("developer diagnostics screen", () => {
  it("shows runtime diagnostics and development-only controls", async () => {
    const platform: NetworkStatusService = {
      getCurrentStatus: jest.fn().mockResolvedValue("online"),
      subscribe: jest.fn(() => jest.fn()),
    };
    const network = createDevelopmentNetworkStatusService(platform, true);
    const synchronize = jest.fn().mockResolvedValue(success);
    const loadDiagnostics = jest.fn()
      .mockResolvedValueOnce({
        activeWorkoutId: "workout-id",
        pendingItems: [{
          id: "queue-id",
          entityType: "set",
          entityId: "set-id",
          operation: "upsert",
          attemptCount: 1,
          createdAt: "2026-09-22T10:00:00.000Z",
        }],
        schemaVersion: "8",
        userId: "user-id",
      })
      .mockResolvedValue({
        activeWorkoutId: "workout-id",
        pendingItems: [],
        schemaVersion: "8",
        userId: "user-id",
      });
    const screen = await render(
      <NetworkStatusProvider service={network}>
        <SyncStatusProvider
          appStateSource={appStateSource()}
          networkService={network}
          now={() => "2026-09-22T11:00:00.000Z"}
          processor={{ synchronize }}
        >
          <DebugScreen
            appVersion="1.0.0"
            environmentName="development"
            loadAIDiagnostics={async () => ({
              provider: "mock",
              models: {
                coach: "mock-coach",
                explanation: "mock-explanation",
                parser: "mock-parser",
              },
              promptVersions: {
                coach: "coach-v1",
                explanation: "explanation-v1",
                parser: "parser-v1",
              },
            })}
            loadDiagnostics={loadDiagnostics}
            networkControls={network}
          />
        </SyncStatusProvider>
      </NetworkStatusProvider>,
    );

    expect(await screen.findByLabelText("Environment: development")).toBeOnTheScreen();
    expect(screen.getByLabelText("App version: 1.0.0")).toBeOnTheScreen();
    expect(screen.getByLabelText("SQLite schema version: 8")).toBeOnTheScreen();
    expect(screen.getByLabelText("User ID: user-id")).toBeOnTheScreen();
    expect(screen.getByLabelText("Active workout ID: workout-id")).toBeOnTheScreen();
    expect(await screen.findByLabelText("Network state: online")).toBeOnTheScreen();
    expect(screen.getByLabelText("Pending sync count: 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("AI provider: mock")).toBeOnTheScreen();
    expect(screen.getByLabelText("Coach prompt: coach-v1")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "View Sync Queue" }));
    expect(screen.getByText("set · upsert")).toBeOnTheScreen();
    expect(screen.getByText("Attempts 1")).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Simulate Offline" }));
      await Promise.resolve();
    });
    expect(screen.getByLabelText("Network state: offline")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Force Sync" }));
    expect(synchronize).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Pending sync count: 0")).toBeOnTheScreen();
    expect(screen.getByLabelText(
      "Last successful sync: 2026-09-22T11:00:00.000Z",
    )).toBeOnTheScreen();
  });
});

function appStateSource(): AppStateSource {
  return {
    currentState: "active" as AppStateStatus,
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
}
