import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { createRestAlerts } from "@/features/workouts/services/restAlerts.native";
import { RestTimerFeedback } from "@/features/workouts/components/RestTimerFeedback";
import { RestTimerStore } from "@/features/workouts/components/RestTimerProvider";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notification"),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(), setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { DATE: "date" }, AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  PermissionStatus: { UNDETERMINED: "undetermined", GRANTED: "granted" },
}));
jest.mock("expo-haptics", () => ({ notificationAsync: jest.fn().mockResolvedValue(undefined), NotificationFeedbackType: { Success: "success" } }));

describe("native local rest alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: Notifications.PermissionStatus.UNDETERMINED, granted: false, canAskAgain: true, expires: "never" });
  });
  afterEach(async () => { await cleanup(); });
  it("requests permission only through Enable rest alerts and schedules the current deadline", async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ status: Notifications.PermissionStatus.GRANTED, granted: true, canAskAgain: true, expires: "never" });
    const store = new RestTimerStore();
    store.dispatch({ type: "start", setId: "s", durationSeconds: 60 });
    const screen = await render(<RestTimerFeedback store={store} />);
    expect(await screen.findByText("Enable rest alerts")).toBeTruthy();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("Enable rest alerts"));
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: { title: "Rest complete", body: "Ready for your next set.", sound: "default" },
      trigger: expect.objectContaining({ type: "date", date: expect.any(Date) }),
    }));
    expect(screen.queryByText("Enable rest alerts")).toBeNull();
    await act(async () => { store.dispatch({ type: "pause" }); });
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  });
  it("uses OS cancellation and suppresses obsolete or foreground notification presentation", async () => {
    const adapter = createRestAlerts();
    adapter.allow("current");
    await adapter.schedule("current", Date.now() + 60_000);
    await adapter.cancel("current");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("current");
    const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0][0]!;
    const notification = { date: 0, request: { identifier: "obsolete", content: {}, trigger: null } } as Notifications.Notification;
    expect(await handler.handleNotification(notification)).toMatchObject({ shouldShowBanner: false, shouldPlaySound: false });
    const previous = AppState.currentState;
    AppState.currentState = "background";
    try {
      expect(await handler.handleNotification({ ...notification, request: { ...notification.request, identifier: "current" } })).toMatchObject({ shouldShowBanner: true, shouldPlaySound: true });
    } finally { AppState.currentState = previous; }
  });
});
