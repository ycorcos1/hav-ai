import type { RestTimer } from "./restTimer";
import type { RestAlerts, RestAlertPermission } from "./restAlertsTypes";

export class RestAlertController {
  private timer: RestTimer | null = null;
  private permissionState: RestAlertPermission = "unavailable";
  private scheduled: string | null = null;
  private revision = 0;
  private chain: Promise<void> = Promise.resolve();
  private completedId: number | null = null;
  private disposed = false;
  private requesting = false;
  private readonly namespace = `rest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  constructor(
    private readonly alerts: RestAlerts,
    private readonly active: () => boolean,
    private readonly status: (permission: RestAlertPermission, failed: boolean) => void,
  ) {}
  async initialize(): Promise<void> {
    try { this.permissionState = await this.alerts.permission(); }
    catch { this.permissionState = "unavailable"; }
    if (this.disposed) return;
    this.status(this.permissionState, false);
    this.update(this.timer);
  }
  async enable(): Promise<void> {
    if (this.requesting || this.permissionState !== "undetermined" || this.disposed) return;
    this.requesting = true;
    try {
      this.permissionState = await this.alerts.requestPermission();
      if (!this.disposed) { this.status(this.permissionState, false); this.update(this.timer); }
    } catch {
      if (!this.disposed) this.status(this.permissionState, true);
    } finally { this.requesting = false; }
  }
  update(timer: RestTimer | null): void {
    if (this.disposed) return;
    this.timer = timer;
    const revision = ++this.revision;
    const desired = timer?.mode === "running" && this.permissionState === "granted"
      ? `${this.namespace}-${timer.id}-${timer.deadline}` : null;
    this.alerts.allow(desired);
    if (timer?.mode === "completed" && this.completedId !== timer.id) {
      this.completedId = timer.id;
      if (this.active()) void this.alerts.foreground().catch(() => {});
    }
    // Serialize native writes: a late schedule must be cancelled before its replacement.
    this.chain = this.chain.then(async () => {
      if (this.scheduled && this.scheduled !== desired) {
        await this.alerts.cancel(this.scheduled);
        this.scheduled = null;
      }
      if (this.disposed || revision !== this.revision || !desired || desired === this.scheduled
        || timer?.mode !== "running" || timer.deadline <= Date.now()) return;
      this.scheduled = desired;
      await this.alerts.schedule(desired, timer.deadline);
    }).catch(() => { if (!this.disposed) this.status(this.permissionState, true); });
  }
  dispose(): void {
    this.update(null);
    this.disposed = true;
  }
  settled(): Promise<void> { return this.chain; }
}
