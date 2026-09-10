import type { RestAlerts } from "./restAlertsTypes";

export function createRestAlerts(): RestAlerts {
  return {
    permission: async () => "unavailable",
    requestPermission: async () => "unavailable",
    schedule: async () => {}, cancel: async () => {}, allow: () => {}, foreground: async () => {},
  };
}
