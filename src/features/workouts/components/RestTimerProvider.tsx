import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { AppState, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { TextButton } from "@/components/TextButton";
import { remainingRestMs, transitionRestTimer, type RestTimer, type RestTimerAction } from "@/features/workouts/services/restTimer";
import { colors, spacing } from "@/theme";
import { RestTimerFeedback } from "./RestTimerFeedback";

export class RestTimerStore {
  private timer: RestTimer | null = null;
  private sequence = 0;
  private listeners = new Set<() => void>();
  get = (): RestTimer | null => this.timer;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  dispatch = (action: RestTimerAction): void => {
    const next = transitionRestTimer(this.timer, action, Date.now(), this.sequence + 1);
    if (next === this.timer) return;
    if (action.type === "start") this.sequence += 1;
    this.timer = next;
    this.listeners.forEach((listener) => listener());
  };
}

const RestTimerContext = createContext<RestTimerStore | null>(null);
export function useRestTimer(): RestTimerStore | null { return useContext(RestTimerContext); }

export function RestTimerProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => new RestTimerStore());
  return <RestTimerContext.Provider value={store}>{children}<RestTimerPanel store={store} /></RestTimerContext.Provider>;
}

export function RestTimerPanel({ store }: { store: RestTimerStore }) {
  const [timer, setTimer] = useState(store.get);
  const [now, setNow] = useState(Date.now);
  useEffect(() => store.subscribe(() => setTimer(store.get())), [store]);
  useEffect(() => {
    const refresh = () => { store.dispatch({ type: "tick" }); setNow(Date.now()); };
    const tick = setInterval(refresh, 250);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => { clearInterval(tick); subscription.remove(); };
  }, [store]);
  if (!timer) return null;
  const seconds = Math.ceil(remainingRestMs(timer, now) / 1000);
  return (
    <View accessibilityLabel="Rest timer" style={styles.panel}>
      <AppText accessibilityLiveRegion="polite" variant="sectionHeading">
        {timer.mode === "completed" ? "Rest complete" : `Rest ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
      </AppText>
      <View style={styles.controls}>
        {timer.mode !== "completed" ? <>
          <TextButton label={timer.mode === "paused" ? "Resume" : "Pause"} onPress={() => store.dispatch({ type: timer.mode === "paused" ? "resume" : "pause" })} />
          <TextButton label="Reset" onPress={() => store.dispatch({ type: "reset" })} />
          <TextButton label="+30 seconds" onPress={() => store.dispatch({ type: "add" })} />
        </> : null}
        <TextButton label="Dismiss rest timer" onPress={() => store.dispatch({ type: "dismiss" })} />
      </View>
      <RestTimerFeedback store={store} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.background.primary, padding: spacing.md, gap: spacing.sm },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
