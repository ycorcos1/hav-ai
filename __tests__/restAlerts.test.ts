import { RestAlertController } from "@/features/workouts/services/restAlertController";
import type { RestAlerts, RestAlertPermission } from "@/features/workouts/services/restAlertsTypes";
import { transitionRestTimer } from "@/features/workouts/services/restTimer";
import { createRestAlerts as createWebAlerts } from "@/features/workouts/services/restAlerts.web";

function setup(permission: RestAlertPermission = "granted", active = true) {
  const alerts = {
    permission: jest.fn(async (): Promise<RestAlertPermission> => permission),
    requestPermission: jest.fn(async (): Promise<RestAlertPermission> => "granted"),
    schedule: jest.fn(async (_id: string, _deadline: number): Promise<void> => {}),
    cancel: jest.fn(async (_id: string): Promise<void> => {}),
    allow: jest.fn(), foreground: jest.fn(async (): Promise<void> => {}),
  } satisfies RestAlerts;
  const status = jest.fn();
  const controller = new RestAlertController(alerts, () => active, status);
  return { alerts, status, controller };
}
describe("rest alert lifecycle", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(0); });
  afterEach(() => jest.useRealTimers());
  it("schedules and cancels for pause/resume/reset/add/replacement/owned dismissal", async () => {
    const { alerts, controller } = setup();
    await controller.initialize();
    let timer = transitionRestTimer(null, { type: "start", setId: "s", durationSeconds: 60 }, 0, 1)!;
    controller.update(timer); await controller.settled();
    expect(alerts.schedule).toHaveBeenLastCalledWith(expect.any(String), 60_000);
    timer = transitionRestTimer(timer, { type: "pause" }, 1000, 2)!;
    controller.update(timer); await controller.settled();
    expect(alerts.cancel).toHaveBeenCalledTimes(1);
    timer = transitionRestTimer(timer, { type: "reset" }, 1000, 2)!;
    controller.update(timer); await controller.settled();
    timer = transitionRestTimer(timer, { type: "add" }, 1000, 2)!;
    controller.update(timer); await controller.settled();
    expect(alerts.schedule).toHaveBeenCalledTimes(1);
    timer = transitionRestTimer(timer, { type: "resume" }, 1000, 2)!;
    controller.update(timer); await controller.settled();
    expect(alerts.schedule).toHaveBeenLastCalledWith(expect.any(String), 91_000);
    timer = transitionRestTimer(timer, { type: "reset" }, 2000, 2)!;
    controller.update(timer); await controller.settled();
    expect(alerts.schedule).toHaveBeenLastCalledWith(expect.any(String), 62_000);
    timer = transitionRestTimer(timer, { type: "add" }, 2000, 2)!;
    controller.update(timer); await controller.settled();
    expect(alerts.schedule).toHaveBeenLastCalledWith(expect.any(String), 92_000);
    timer = transitionRestTimer(timer, { type: "start", setId: "new", durationSeconds: 120 }, 3000, 2)!;
    controller.update(timer); await controller.settled();
    const count = alerts.cancel.mock.calls.length;
    controller.update(transitionRestTimer(timer, { type: "dismiss", setId: "s" }, 4000, 3));
    await controller.settled(); expect(alerts.cancel).toHaveBeenCalledTimes(count);
    controller.update(transitionRestTimer(timer, { type: "dismiss", setId: "new" }, 4000, 3));
    await controller.settled(); expect(alerts.cancel).toHaveBeenCalledTimes(count + 1);
  });
  it("requires opt-in and never prompts for denied or unavailable permission", async () => {
    for (const permission of ["undetermined", "denied", "unavailable"] as const) {
      const { controller, alerts } = setup(permission);
      await controller.initialize();
      controller.update(transitionRestTimer(null, { type: "start", setId: "s", durationSeconds: 60 }, 0, 1));
      await controller.settled();
      expect(alerts.requestPermission).not.toHaveBeenCalled();
      expect(alerts.schedule).not.toHaveBeenCalled();
      await controller.enable(); await controller.settled();
      expect(alerts.requestPermission).toHaveBeenCalledTimes(permission === "undetermined" ? 1 : 0);
      expect(alerts.schedule).toHaveBeenCalledTimes(permission === "undetermined" ? 1 : 0);
      controller.dispose(); await controller.settled();
    }
  });
  it("isolates permission/haptic failures and fires foreground completion once", async () => {
    const { controller, alerts, status } = setup("undetermined");
    await controller.initialize();
    alerts.requestPermission.mockRejectedValueOnce(new Error("permission failed"));
    await controller.enable();
    expect(status).toHaveBeenLastCalledWith("undetermined", true);
    alerts.foreground.mockRejectedValueOnce(new Error("haptic failed"));
    const timer = transitionRestTimer(null, { type: "start", setId: "s", durationSeconds: 1 }, 0, 1)!;
    const done = transitionRestTimer(timer, { type: "tick" }, 1000, 2);
    controller.update(done); controller.update(done); await controller.settled();
    expect(alerts.foreground).toHaveBeenCalledTimes(1);
  });
  it("schedules in background and cancels a stale in-flight schedule on replacement", async () => {
    const { controller, alerts } = setup("granted", false);
    await controller.initialize(); await controller.settled();
    let resolve!: () => void;
    alerts.schedule.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
    const first = transitionRestTimer(null, { type: "start", setId: "s", durationSeconds: 60 }, 0, 1)!;
    controller.update(first);
    await Promise.resolve();
    const second = transitionRestTimer(first, { type: "start", setId: "new", durationSeconds: 90 }, 0, 2)!;
    controller.update(second);
    resolve(); await controller.settled();
    expect(alerts.cancel).toHaveBeenCalledWith(alerts.schedule.mock.calls[0][0]);
    expect(alerts.schedule).toHaveBeenLastCalledWith(expect.any(String), 90_000);
    controller.update(transitionRestTimer(second, { type: "tick" }, 90_000, 3));
    await controller.settled(); expect(alerts.foreground).not.toHaveBeenCalled();
  });
  it("provides a safe web fallback with no native permissions", async () => {
    const web = createWebAlerts();
    await expect(web.permission()).resolves.toBe("unavailable");
    await expect(web.requestPermission()).resolves.toBe("unavailable");
    await expect(web.foreground()).resolves.toBeUndefined();
  });
});
