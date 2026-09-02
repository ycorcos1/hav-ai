import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import { colors, spacing } from "@/theme";

export type ActiveExerciseLoggingScreenProps = {
  loadExercise: () => Promise<ActiveWorkoutExercise | null>;
  onOpenExercise: (workoutExerciseId: string) => void;
  onOverview: () => void;
};

export function ActiveExerciseLoggingScreen({
  loadExercise,
  onOpenExercise,
  onOverview,
}: ActiveExerciseLoggingScreenProps) {
  const [activeExercise, setActiveExercise] = useState<ActiveWorkoutExercise | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadExercise().then(
      (loaded) => {
        if (active) {
          setActiveExercise(loaded);
          setFailed(false);
        }
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, loadExercise]);

  if (failed || activeExercise === null) {
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
          ) : undefined}
          message={failed
            ? "This exercise could not be loaded. Your workout was not changed."
            : "This exercise is not part of the active workout."}
          title="Unable to load exercise"
        />
      </Screen>
    );
  }

  if (!activeExercise) {
    return (
      <Screen accessibilityLabel="Loading active exercise" contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent.primary} />
      </Screen>
    );
  }

  const {
    exercise,
    exercisePreference,
    previousPerformance,
    workout,
    workoutExercise,
  } = activeExercise;
  const orderedExercises = [...workout.exercises].sort((left, right) => left.position - right.position);
  const currentIndex = orderedExercises.findIndex(({ id }) => id === workoutExercise.id);
  const previousExercise = currentIndex > 0 ? orderedExercises[currentIndex - 1] : undefined;
  const nextExercise = currentIndex >= 0 && currentIndex < orderedExercises.length - 1
    ? orderedExercises[currentIndex + 1]
    : undefined;

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <SecondaryButton label="Workout Overview" onPress={onOverview} />
      <AppText color="secondary" variant="metadata">{workout.name}</AppText>
      <AppText variant="screenTitle">{exercise?.name ?? "Exercise unavailable"}</AppText>
      {exercisePreference?.notes ? (
        <View accessibilityLabel="Your persistent exercise note" style={styles.note}>
          <AppText color="muted" variant="metadata">YOUR EXERCISE NOTE</AppText>
          <AppText color="secondary">{exercisePreference.notes}</AppText>
        </View>
      ) : null}

      <Card style={styles.targetCard}>
        <AppText color="secondary" variant="metadata">TODAY&apos;S TARGET</AppText>
        {workoutExercise.targetWeightKg !== undefined ? (
          <AppText variant="sectionHeading">{workoutExercise.targetWeightKg} kg</AppText>
        ) : null}
        <AppText>{targetDescription(workoutExercise)}</AppText>
      </Card>

      <View style={styles.section}>
        <AppText color="secondary" variant="metadata">LAST SESSION</AppText>
        {previousPerformance ? (
          previousPerformance.sets.map((set, index) => (
            <AppText key={`${previousPerformance.workoutId}-${index}`} color="secondary">
              {setLabel(index, set.weightKg, set.reps)}
            </AppText>
          ))
        ) : (
          <AppText color="muted">No previous performance yet.</AppText>
        )}
      </View>

      <View style={styles.section}>
        <AppText color="secondary" variant="metadata">TODAY&apos;S SETS</AppText>
        {workoutExercise.sets.length === 0 ? (
          <AppText color="muted">No sets completed yet.</AppText>
        ) : (
          workoutExercise.sets.map((set, index) => (
            <AppText key={set.id} color="secondary">
              {setLabel(index, set.weightKg, set.reps)}
            </AppText>
          ))
        )}
      </View>

      <PrimaryButton
        accessibilityHint="Set completion is enabled when set logging is implemented."
        disabled
        label="Complete Set"
      />
      <View style={styles.switchingControls}>
        <SecondaryButton
          disabled={!previousExercise}
          label="Previous Exercise"
          onPress={() => {
            if (previousExercise) onOpenExercise(previousExercise.id);
          }}
        />
        <SecondaryButton
          disabled={!nextExercise}
          label="Next Exercise"
          onPress={() => {
            if (nextExercise) onOpenExercise(nextExercise.id);
          }}
        />
      </View>
    </Screen>
  );
}

function targetDescription(
  exercise: ActiveWorkoutExercise["workoutExercise"],
): string {
  const setCount = exercise.targetSets;
  const minimum = exercise.targetMinReps;
  const maximum = exercise.targetMaxReps;
  if (setCount !== undefined && minimum !== undefined && maximum !== undefined) {
    return `${setCount} × ${minimum}-${maximum} reps`;
  }
  if (setCount !== undefined) return `${setCount} target sets`;
  if (minimum !== undefined && maximum !== undefined) return `${minimum}-${maximum} reps`;
  return "No target was snapshotted.";
}

function setLabel(index: number, weightKg: number | undefined, reps: number): string {
  const weight = weightKg === undefined ? "Bodyweight" : `${weightKg} kg`;
  return `Set ${index + 1}: ${weight} × ${reps}`;
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  note: { gap: spacing.xs },
  section: { gap: spacing.sm },
  switchingControls: { gap: spacing.sm },
  targetCard: { borderLeftColor: colors.accent.primary, borderLeftWidth: 3, gap: spacing.sm },
});
