import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { SetInputRow, type SetInputValues } from "@/features/workouts/components/SetInputRow";
import { triggerSetCompletionHaptic } from "@/features/workouts/services/setCompletionFeedback";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import type { CompleteSetInput, CompleteSetResult, WorkoutSet } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type ActiveExerciseLoggingScreenProps = {
  completeSet: (input: CompleteSetInput) => Promise<CompleteSetResult>;
  loadExercise: () => Promise<ActiveWorkoutExercise | null>;
  onOpenExercise: (workoutExerciseId: string) => void;
  onOverview: () => void;
};

export function ActiveExerciseLoggingScreen({
  completeSet,
  loadExercise,
  onOpenExercise,
  onOverview,
}: ActiveExerciseLoggingScreenProps) {
  const [activeExercise, setActiveExercise] = useState<ActiveWorkoutExercise | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [completionError, setCompletionError] = useState(false);
  const [entryVersion, setEntryVersion] = useState(0);
  const [savingSet, setSavingSet] = useState(false);
  const completionLocked = useRef(false);

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
    profile,
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

  const completeCurrentSet = async (values: SetInputValues): Promise<void> => {
    if (completionLocked.current) return;
    completionLocked.current = true;
    setSavingSet(true);
    setCompletionError(false);
    try {
      const result = await completeSet({
        exerciseId: workoutExercise.exerciseId,
        reps: values.reps,
        ...(values.rpe === undefined ? {} : { rpe: values.rpe }),
        setType: "working",
        ...(values.weightKg === undefined ? {} : { weightKg: values.weightKg }),
        workoutExerciseId: workoutExercise.id,
        workoutId: workout.id,
      });
      setActiveExercise((current) => current
        ? appendCompletedSet(current, result.set)
        : current);
      setEntryVersion((value) => value + 1);
      await triggerSetCompletionHaptic();
    } catch {
      setCompletionError(true);
    } finally {
      completionLocked.current = false;
      setSavingSet(false);
    }
  };

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
          <AppText variant="sectionHeading">
            {formatDisplayWeight(workoutExercise.targetWeightKg, profile.weightUnit)} {profile.weightUnit}
          </AppText>
        ) : null}
        <AppText>{targetDescription(workoutExercise)}</AppText>
      </Card>

      <View style={styles.section}>
        <AppText color="secondary" variant="metadata">LAST SESSION</AppText>
        {previousPerformance ? (
          previousPerformance.sets.map((set, index) => (
            <AppText key={`${previousPerformance.workoutId}-${index}`} color="secondary">
              {setLabel(index, set.weightKg, set.reps, profile.weightUnit)}
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
              {setLabel(index, set.weightKg, set.reps, profile.weightUnit)}
            </AppText>
          ))
        )}
      </View>

      <SetInputRow
        key={`${workoutExercise.id}-${entryVersion}`}
        disabled={savingSet || !exercise}
        initialWeightKg={workoutExercise.targetWeightKg}
        onComplete={(values) => {
          void completeCurrentSet(values);
        }}
        requiresWeight={exercise?.measurementType === "weight_reps"}
        rpePreference={profile.rpePreference}
        weightUnit={profile.weightUnit}
      />
      {completionError ? (
        <AppText accessibilityRole="alert" style={styles.error} variant="metadata">
          This set could not be saved. Check your entries and try again.
        </AppText>
      ) : null}
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

function setLabel(
  index: number,
  weightKg: number | undefined,
  reps: number,
  weightUnit: ActiveWorkoutExercise["profile"]["weightUnit"],
): string {
  const weight = weightKg === undefined
    ? "Bodyweight"
    : `${formatDisplayWeight(weightKg, weightUnit)} ${weightUnit}`;
  return `Set ${index + 1}: ${weight} × ${reps}`;
}

function appendCompletedSet(
  activeExercise: ActiveWorkoutExercise,
  completedSet: WorkoutSet,
): ActiveWorkoutExercise {
  const append = (sets: WorkoutSet[]) => [...sets, completedSet]
    .sort((left, right) => left.position - right.position);
  const workoutExercise = {
    ...activeExercise.workoutExercise,
    sets: append(activeExercise.workoutExercise.sets),
  };
  return {
    ...activeExercise,
    workout: {
      ...activeExercise.workout,
      exercises: activeExercise.workout.exercises.map((exercise) => (
        exercise.id === workoutExercise.id ? workoutExercise : exercise
      )),
    },
    workoutExercise,
  };
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  error: { color: colors.semantic.error },
  note: { gap: spacing.xs },
  section: { gap: spacing.sm },
  switchingControls: { gap: spacing.sm },
  targetCard: { borderLeftColor: colors.accent.primary, borderLeftWidth: 3, gap: spacing.sm },
});
