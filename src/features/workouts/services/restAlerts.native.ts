import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { AppState, Platform } from "react-native";
import type { RestAlerts, RestAlertPermission } from "./restAlertsTypes";

function permissionValue(value: Notifications.NotificationPermissionsStatus): RestAlertPermission {
  if (value.granted || value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  return value.status === "undetermined" && value.canAskAgain ? "undetermined" : "denied";
}

export function createRestAlerts(): RestAlerts {
  let allowed: string | null = null;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const show = notification.request.identifier === allowed && AppState.currentState !== "active";
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
  return {
    permission: async () => permissionValue(await Notifications.getPermissionsAsync()),
    requestPermission: async () => {
      const existing = permissionValue(await Notifications.getPermissionsAsync());
      if (existing !== "undetermined") return existing;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("rest-completion", {
          name: "Rest completion", importance: Notifications.AndroidImportance.DEFAULT, sound: "default",
        });
      }
      return permissionValue(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
    },
    allow: (id) => { allowed = id; },
    schedule: async (id, deadline) => {
      await Notifications.scheduleNotificationAsync({ identifier: id,
        content: { title: "Rest complete", body: "Ready for your next set.", sound: "default" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(deadline), channelId: "rest-completion" },
      });
    },
    cancel: async (id) => { await Notifications.cancelScheduledNotificationAsync(id); },
    foreground: async () => { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  };
}
