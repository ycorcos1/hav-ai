export type RestAlertPermission = "undetermined" | "granted" | "denied" | "unavailable";
export interface RestAlerts {
  permission(): Promise<RestAlertPermission>;
  requestPermission(): Promise<RestAlertPermission>;
  schedule(id: string, deadline: number): Promise<void>;
  cancel(id: string): Promise<void>;
  allow(id: string | null): void;
  foreground(): Promise<void>;
}
