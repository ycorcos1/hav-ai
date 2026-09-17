import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import type { CompletedWorkoutSummary } from "@/features/workouts/services/workoutApplication";
import type { DetectedPersonalRecordType, ExerciseWorkoutSummary } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type WorkoutSummaryScreenProps = {
  loadSummary: () => Promise<CompletedWorkoutSummary | null>;
  onDone: () => void;
};

export function WorkoutSummaryScreen({ loadSummary, onDone }: WorkoutSummaryScreenProps) {
  const [result, setResult] = useState<CompletedWorkoutSummary | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadSummary().then(
      (loaded) => {
        if (!active) return;
        setResult(loaded);
        setFailed(false);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => { active = false; };
  }, [attempt, loadSummary]);

  if (failed || result === null) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ErrorState
          action={failed ? (
            <SecondaryButton
              label="Try Again"
              onPress={() => {
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            />
          ) : <PrimaryButton label="Done" onPress={onDone} />}
          message={failed
            ? "Your locally saved workout summary could not be loaded."
            : "This completed workout is not available."}
          title="Unable to load summary"
        />
      </Screen>
    );
  }
  if (!result) {
    return (
      <Screen accessibilityLabel="Loading workout summary" contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent.primary} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <View style={styles.hero}>
        <AppText color="secondary" variant="metadata">WORKOUT COMPLETE</AppText>
        <AppText variant="display">{result.workout.name}</AppText>
        <AppText color="secondary" variant="sectionHeading">
          {formatDuration(result.summary.durationSeconds)}
        </AppText>
      </View>
      <View style={styles.metrics}>
        <Card style={styles.metricCard}>
          <AppText variant="screenTitle">{result.summary.workingSetCount}</AppText>
          <AppText color="secondary" variant="metadata">WORKING SETS</AppText>
        </Card>
        <Card style={styles.metricCard}>
          <AppText variant="screenTitle">{result.summary.exerciseCount}</AppText>
          <AppText color="secondary" variant="metadata">EXERCISES</AppText>
        </Card>
      </View>
      <View style={styles.section}>
        <AppText variant="sectionHeading">Progress</AppText>
        {result.exercises.map(({ exercise, summary }) => (
          <Card key={summary.exerciseId} style={styles.exerciseCard}>
            <AppText variant="exerciseName">{exercise?.name ?? "Exercise unavailable"}</AppText>
            <AppText color="secondary">{summary.totalWorkingSets} working sets · {summary.totalReps} total reps</AppText>
            <AppText color={summary.repDelta !== undefined && summary.repDelta > 0 ? "primary" : "secondary"}>
              {progressLabel(summary)}
            </AppText>
            {summary.detectedPRs.map((type) => (
              <AppText key={type} style={styles.record} variant="metadata">
                {personalRecordLabel(type)}
              </AppText>
            ))}
          </Card>
        ))}
      </View>
      <Card style={styles.section}>
        <AppText variant="sectionHeading">Next Targets</AppText>
        <AppText color="muted">Next targets will appear after progression is available.</AppText>
      </Card>
      <PrimaryButton label="Done" onPress={onDone} />
    </Screen>
  );
}

function progressLabel(summary: ExerciseWorkoutSummary): string {
  if (summary.repDelta === undefined) return "No previous session comparison";
  if (summary.repDelta > 0) return `↑ +${summary.repDelta} total reps`;
  if (summary.repDelta < 0) return `↓ ${summary.repDelta} total reps`;
  return "Matched previous total reps";
}

function personalRecordLabel(type: DetectedPersonalRecordType): string {
  switch (type) {
    case "max_weight": return "NEW MAX WEIGHT PR";
    case "estimated_1rm": return "NEW ESTIMATED 1RM PR";
    case "rep_pr": return "NEW REP PR";
  }
}

function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  content: { gap: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  exerciseCard: { gap: spacing.sm },
  hero: { gap: spacing.xs },
  metricCard: { flex: 1, gap: spacing.xs },
  metrics: { flexDirection: "row", gap: spacing.sm },
  record: { color: colors.accent.primary },
  section: { gap: spacing.md },
});
