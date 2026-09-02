import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { WorkoutElapsedTime } from "@/features/workouts/components/WorkoutElapsedTime";
import type { ActiveWorkoutOverview } from "@/features/workouts/services/workoutApplication";
import { colors, spacing } from "@/theme";

export type ActiveWorkoutOverviewScreenProps = {
  loadWorkout: () => Promise<ActiveWorkoutOverview | null>;
};

export function ActiveWorkoutOverviewScreen({ loadWorkout }: ActiveWorkoutOverviewScreenProps) {
  const [overview, setOverview] = useState<ActiveWorkoutOverview | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadWorkout().then(
      (loaded) => { if (active) { setOverview(loaded); setFailed(false); } },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [attempt, loadWorkout]);

  if (failed || overview === null) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ErrorState
          action={failed ? <SecondaryButton label="Try Again" onPress={() => { setFailed(false); setAttempt((value) => value + 1); }} /> : undefined}
          message={failed ? "Your active workout could not be loaded. Your local data was not changed." : "This active workout is no longer available."}
          title="Unable to load workout"
        />
      </Screen>
    );
  }
  if (!overview) {
    return <Screen accessibilityLabel="Loading active workout" contentContainerStyle={styles.centered}><ActivityIndicator color={colors.accent.primary} /></Screen>;
  }

  const completedExercises = overview.exercises.filter(({ workoutExercise }) => isExerciseComplete(workoutExercise)).length;

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <View style={styles.header}>
        <View style={styles.heading}>
          <AppText color="secondary" variant="metadata">Workout in Progress</AppText>
          <AppText variant="screenTitle">{overview.workout.name}</AppText>
        </View>
        <WorkoutElapsedTime startedAt={overview.workout.startedAt} />
      </View>
      <AppText color="secondary">{completedExercises} / {overview.exercises.length} exercises</AppText>
      <View style={styles.list}>
        {overview.exercises.map(({ exercise, workoutExercise }) => (
          <Card key={workoutExercise.id}>
            <AppText variant="exerciseName">{exercise?.name ?? "Exercise unavailable"}</AppText>
            <AppText color={isExerciseComplete(workoutExercise) ? "primary" : "secondary"}>
              {exerciseProgressLabel(workoutExercise)}
            </AppText>
          </Card>
        ))}
      </View>
      <SecondaryButton accessibilityHint="Exercise changes are enabled in a later task." disabled label="Add Exercise" />
      <PrimaryButton accessibilityHint="Workout completion is enabled in a later task." disabled label="Finish Workout" />
    </Screen>
  );
}

function completedWorkingSets(exercise: ActiveWorkoutOverview["exercises"][number]["workoutExercise"]): number {
  return exercise.sets.filter(({ setType }) => setType === "working").length;
}

function isExerciseComplete(exercise: ActiveWorkoutOverview["exercises"][number]["workoutExercise"]): boolean {
  return exercise.targetSets !== undefined
    && exercise.targetSets > 0
    && completedWorkingSets(exercise) >= exercise.targetSets;
}

function exerciseProgressLabel(exercise: ActiveWorkoutOverview["exercises"][number]["workoutExercise"]): string {
  if (isExerciseComplete(exercise)) return "Complete";
  const completed = completedWorkingSets(exercise);
  return exercise.targetSets === undefined
    ? `${completed} sets completed`
    : `${completed}/${exercise.targetSets} sets`;
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  heading: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.sm },
});
