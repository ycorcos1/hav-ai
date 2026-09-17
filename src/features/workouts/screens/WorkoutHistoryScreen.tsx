import { useEffect, useEffectEvent, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import type { WorkoutHistoryCursor, WorkoutHistoryPage } from "@/db/repositories";
import { useNetworkStatus } from "@/features/network/components/NetworkStatusProvider";
import type { Workout } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type WorkoutHistoryScreenProps = {
  loadPage: (cursor?: WorkoutHistoryCursor) => Promise<WorkoutHistoryPage>;
  onOpenWorkout: (id: string) => void;
};

export function WorkoutHistoryScreen({ loadPage, onOpenWorkout }: WorkoutHistoryScreenProps) {
  const networkStatus = useNetworkStatus();
  const [items, setItems] = useState<Workout[]>([]);
  const [nextCursor, setNextCursor] = useState<WorkoutHistoryCursor>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loadInitialPage = useEffectEvent(loadPage);

  useEffect(() => {
    let active = true;
    void loadInitialPage().then(
      (page) => {
        if (!active) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setStatus("ready");
      },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false; };
  }, [attempt]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPage(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <AppText variant="screenTitle">Workout History</AppText>
      <OfflineBanner
        message="Offline · Some historical data may be unavailable"
        visible={networkStatus === "offline"}
      />
      {status === "loading" ? (
        <View accessibilityLabel="Loading workout history" style={styles.feedback}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : null}
      {status === "error" ? (
        <ErrorState
          action={<SecondaryButton label="Try Again" onPress={() => { setStatus("loading"); setAttempt((value) => value + 1); }} />}
          message="Your locally saved workout history could not be loaded."
          title="Unable to load history"
        />
      ) : null}
      {status === "ready" && items.length === 0 ? (
        <EmptyState
          message="Finish your first workout to start building history."
          title="No completed workouts yet"
        />
      ) : null}
      {status === "ready" ? (
        <View style={styles.list}>
          {items.map((workout) => (
            <Card key={workout.id} testID={`history-${workout.id}`}>
              <AppText variant="exerciseName">{workout.name}</AppText>
              <AppText color="secondary" variant="metadata">{formatDate(workout.completedAt!)}</AppText>
              <AppText color="secondary">
                {formatDuration(workout)} · {workout.exercises.length} {workout.exercises.length === 1 ? "exercise" : "exercises"}
              </AppText>
              <SecondaryButton label="View Workout" onPress={() => onOpenWorkout(workout.id)} />
            </Card>
          ))}
          {nextCursor ? (
            <SecondaryButton label="Load More" loading={loadingMore} onPress={() => void loadMore()} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formatDuration(workout: Workout): string {
  const seconds = Math.max(0, Math.floor(
    (new Date(workout.completedAt!).getTime() - new Date(workout.startedAt).getTime()) / 1000,
  ));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background.primary, gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  feedback: { alignItems: "center", paddingVertical: spacing.xl },
  list: { gap: spacing.md },
});
