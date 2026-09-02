import { act, cleanup, render } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { WorkoutElapsedTime } from "@/features/workouts/components/WorkoutElapsedTime";

const startedAt = "2026-09-02T12:00:00.000Z";

describe("WorkoutElapsedTime", () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse(startedAt) + 5 * 60 * 1000);
    appStateListener = undefined;
    remove.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListener = listener;
      return { remove };
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("updates from current time without accumulating elapsed state", async () => {
    const rendered = await render(<WorkoutElapsedTime startedAt={startedAt} />);
    expect(rendered.getByText("5:00")).toBeTruthy();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(rendered.getByText("5:01")).toBeTruthy();
  });

  it("recomputes from the persisted timestamp after remount", async () => {
    const first = await render(<WorkoutElapsedTime startedAt={startedAt} />);
    expect(first.getByText("5:00")).toBeTruthy();
    await first.unmount();

    jest.setSystemTime(Date.parse(startedAt) + 25 * 60 * 1000);
    const restored = await render(<WorkoutElapsedTime startedAt={startedAt} />);
    expect(restored.getByText("25:00")).toBeTruthy();
  });

  it("catches up immediately when the app returns to the foreground", async () => {
    const rendered = await render(<WorkoutElapsedTime startedAt={startedAt} />);
    expect(rendered.getByText("5:00")).toBeTruthy();

    jest.setSystemTime(Date.parse(startedAt) + 65 * 60 * 1000 + 9 * 1000);
    await act(async () => appStateListener?.("background"));
    expect(rendered.getByText("5:00")).toBeTruthy();
    await act(async () => appStateListener?.("active"));
    expect(rendered.getByText("1:05:09")).toBeTruthy();
  });

  it("cleans up timer and AppState subscriptions", async () => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");
    const rendered = await render(<WorkoutElapsedTime startedAt={startedAt} />);
    await rendered.unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
