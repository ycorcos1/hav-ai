import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import type { WorkoutHistoryDetail } from "@/features/workouts/services/workoutApplication";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import type { WorkoutSet } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type WorkoutHistoryDetailScreenProps = {
  loadWorkout: () => Promise<WorkoutHistoryDetail | null>;
};

export function WorkoutHistoryDetailScreen({ loadWorkout }: WorkoutHistoryDetailScreenProps) {
  const [detail, setDetail] = useState<WorkoutHistoryDetail | null>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void loadWorkout().then(
      (loaded) => { if (active) setDetail(loaded); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [loadWorkout]);

  if (failed || detail === null) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ErrorState
          message={failed ? "Your locally saved workout could not be loaded." : "This completed workout is not available."}
          title="Unable to load workout"
        />
      </Screen>
    );
  }
  if (!detail) {
    return (
      <Screen accessibilityLabel="Loading workout detail" contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent.primary} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <View style={styles.header}>
        <AppText variant="screenTitle">{detail.workout.name}</AppText>
        <AppText color="secondary" variant="metadata">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(detail.workout.completedAt!))}
        </AppText>
        {detail.workout.notes ? <AppText>{detail.workout.notes}</AppText> : null}
      </View>
      {detail.exercises.map(({ exercise, workoutExercise }) => (
        <Card key={workoutExercise.id}>
          <AppText variant="exerciseName">{exercise?.name ?? "Exercise unavailable"}</AppText>
          {[...workoutExercise.sets]
            .sort((left, right) => left.position - right.position)
            .map((set) => (
              <View key={set.id} style={styles.set}>
                <AppText>{setLabel(set, detail.weightUnit)}</AppText>
                {set.notes ? <AppText color="secondary" variant="metadata">{set.notes}</AppText> : null}
              </View>
            ))}
        </Card>
      ))}
    </Screen>
  );
}

function setLabel(set: WorkoutSet, unit: WorkoutHistoryDetail["weightUnit"]): string {
  const type = set.setType === "warmup" ? "Warm-up" : "Working";
  const weight = set.weightKg === undefined ? "Bodyweight" : `${formatDisplayWeight(set.weightKg, unit)} ${unit}`;
  const rpe = set.rpe === undefined ? "" : ` · RPE ${set.rpe}`;
  return `${type} ${set.position + 1} · ${weight} × ${set.reps}${rpe}`;
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  container: { backgroundColor: colors.background.primary, gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  header: { gap: spacing.sm },
  set: { gap: spacing.xs, paddingTop: spacing.md },
});
