import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useNetworkStatus } from "@/features/network/components/NetworkStatusProvider";
import { StrengthTrendChart } from "@/features/progress/components/StrengthTrendChart";
import type { ExerciseProgress } from "@/features/progress/services/progressApplication";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import { colors, spacing } from "@/theme";

export type ExerciseProgressScreenProps = {
  loadProgress: () => Promise<ExerciseProgress | null>;
};

export function ExerciseProgressScreen({ loadProgress }: ExerciseProgressScreenProps) {
  const networkStatus = useNetworkStatus();
  const [progress, setProgress] = useState<ExerciseProgress | null>();
  const [failed, setFailed] = useState(false);
  const [graphVisible, setGraphVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void loadProgress().then(
      (loaded) => { if (active) setProgress(loaded); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [loadProgress]);

  if (failed || progress === null) {
    return <Screen><ErrorState message="This exercise progress is not available." title="Unable to load progress" /></Screen>;
  }
  if (!progress) {
    return <Screen accessibilityLabel="Loading exercise progress" contentContainerStyle={styles.centered}><ActivityIndicator color={colors.accent.primary} /></Screen>;
  }
  const { metrics } = progress;
  const insufficient = metrics.trend.length < 2;
  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <AppText variant="screenTitle">{progress.exercise.name}</AppText>
      <OfflineBanner
        message="Offline · Some historical data may be unavailable"
        visible={networkStatus === "offline"}
      />
      <Card>
        <AppText color="secondary" variant="metadata">ESTIMATED 1RM</AppText>
        <AppText variant="display">{weightLabel(metrics.currentEstimated1RMKg, progress.weightUnit)}</AppText>
        {metrics.recentChangeKg !== undefined ? (
          <AppText color="secondary">{changeLabel(metrics.recentChangeKg, progress.weightUnit)}</AppText>
        ) : null}
        <AppText color="secondary" variant="metadata">Best · {weightLabel(metrics.bestEstimated1RMKg, progress.weightUnit)}</AppText>
      </Card>
      {insufficient ? (
        <AppText color="muted">Train this exercise a few more times to build a meaningful trend.</AppText>
      ) : null}
      {metrics.trend.length > 0 ? (
        <SecondaryButton
          label={graphVisible ? "Hide Graph" : "Show Graph"}
          onPress={() => setGraphVisible((visible) => !visible)}
        />
      ) : null}
      {graphVisible ? (
        <StrengthTrendChart limited={networkStatus === "offline"} points={metrics.trend} />
      ) : null}
      <View style={styles.metrics}>
        <Card style={styles.metricCard}>
          <AppText color="secondary" variant="metadata">BEST SET</AppText>
          <AppText>{metrics.bestSet ? setLabel(metrics.bestSet, progress.weightUnit) : "Not enough data"}</AppText>
        </Card>
        <Card style={styles.metricCard}>
          <AppText color="secondary" variant="metadata">BEST WEIGHT</AppText>
          <AppText>{weightLabel(metrics.bestWeightKg, progress.weightUnit)}</AppText>
        </Card>
      </View>
      <View style={styles.section}>
        <AppText variant="sectionHeading">Recent Sessions</AppText>
        {progress.sessions.length === 0 ? <AppText color="muted">No completed sessions yet.</AppText> : null}
        {progress.sessions.map((session) => (
          <Card key={session.workoutId}>
            <AppText variant="exerciseName">
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(session.completedAt))}
            </AppText>
            {session.sets.map((set, index) => (
              <AppText color="secondary" key={`${session.workoutId}-${index}`}>
                Set {index + 1} · {setLabel(set, progress.weightUnit)}{set.rpe === undefined ? "" : ` · RPE ${set.rpe}`}
              </AppText>
            ))}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function weightLabel(value: number | undefined, unit: ExerciseProgress["weightUnit"]): string {
  return value === undefined ? "Not enough data" : `${formatDisplayWeight(value, unit)} ${unit}`;
}

function changeLabel(value: number, unit: ExerciseProgress["weightUnit"]): string {
  const display = formatDisplayWeight(Math.abs(value), unit);
  if (Math.abs(value) < 0.0001) return "No recent change";
  return `${value > 0 ? "↑" : "↓"} ${display} ${unit} from previous session`;
}

function setLabel(
  set: { reps: number; weightKg?: number },
  unit: ExerciseProgress["weightUnit"],
): string {
  return set.weightKg === undefined
    ? `${set.reps} reps`
    : `${formatDisplayWeight(set.weightKg, unit)} ${unit} × ${set.reps}`;
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  container: { backgroundColor: colors.background.primary, gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  metricCard: { flex: 1 },
  metrics: { flexDirection: "row", gap: spacing.md },
  section: { gap: spacing.md },
});
