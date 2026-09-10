import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { AppText } from "@/components/AppText";
import { TextButton } from "@/components/TextButton";
import { createRestAlerts } from "@/features/workouts/services/restAlerts";
import { RestAlertController } from "@/features/workouts/services/restAlertController";
import type { RestAlertPermission } from "@/features/workouts/services/restAlertsTypes";
import type { RestTimerStore } from "./RestTimerProvider";

export function RestTimerFeedback({ store }: { store: RestTimerStore }) {
  const [status, setStatus] = useState<{ permission: RestAlertPermission; failed: boolean }>({ permission: "unavailable", failed: false });
  const [controller, setController] = useState<RestAlertController | null>(null);
  useEffect(() => {
    const feedback = new RestAlertController(createRestAlerts(), () => AppState.currentState === "active",
      (permission, failed) => { setStatus({ permission, failed }); setController(feedback); });
    const unsubscribe = store.subscribe(() => feedback.update(store.get()));
    feedback.update(store.get());
    void feedback.initialize();
    return () => { unsubscribe(); feedback.dispose(); };
  }, [store]);
  return <>
    {status.permission === "undetermined" ? <TextButton label="Enable rest alerts" onPress={() => { void controller?.enable(); }} /> : null}
    {status.failed ? <AppText accessibilityRole="alert" color="secondary">Rest alerts could not be updated. Your timer and workout remain available.</AppText> : null}
  </>;
}
