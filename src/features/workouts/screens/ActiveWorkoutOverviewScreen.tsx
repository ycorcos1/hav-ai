import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { BottomSheet } from "@/components/BottomSheet";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextButton } from "@/components/TextButton";
import { TextInput } from "@/components/TextInput";
import { WorkoutElapsedTime } from "@/features/workouts/components/WorkoutElapsedTime";
import type { ActiveWorkoutOverview } from "@/features/workouts/services/workoutApplication";
import type { Workout } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type ActiveWorkoutOverviewScreenProps = {
  loadWorkout: () => Promise<ActiveWorkoutOverview | null>;
  onOpenExercise: (workoutExerciseId: string) => void;
  saveWorkoutNote: (notes?: string) => Promise<Workout>;
};

export function ActiveWorkoutOverviewScreen({
  loadWorkout,
  onOpenExercise,
  saveWorkoutNote,
}: ActiveWorkoutOverviewScreenProps) {
  const [overview, setOverview] = useState<ActiveWorkoutOverview | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const [noteSaveFailed, setNoteSaveFailed] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const noteSavingRef = useRef(false);

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

  function openNoteEditor(): void {
    setNoteDraft(overview?.workout.notes ?? "");
    setNoteSaveFailed(false);
    setNoteEditorVisible(true);
  }

  async function saveNote(): Promise<void> {
    if (noteSavingRef.current) return;
    noteSavingRef.current = true;
    setNoteSaving(true);
    setNoteSaveFailed(false);
    try {
      const workout = await saveWorkoutNote(noteDraft);
      setOverview((current) => current ? { ...current, workout } : current);
      setNoteEditorVisible(false);
    } catch {
      setNoteSaveFailed(true);
    } finally {
      noteSavingRef.current = false;
      setNoteSaving(false);
    }
  }

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
      <Card style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <AppText color="secondary" variant="metadata">WORKOUT NOTE</AppText>
          <TextButton
            label={overview.workout.notes ? "Edit Workout Note" : "Add Workout Note"}
            onPress={openNoteEditor}
          />
        </View>
        {overview.workout.notes ? (
          <AppText color="secondary">{overview.workout.notes}</AppText>
        ) : (
          <AppText color="muted">No workout note.</AppText>
        )}
      </Card>
      <View style={styles.list}>
        {overview.exercises.map(({ exercise, workoutExercise }) => (
          <Pressable
            accessibilityLabel={`Open ${exercise?.name ?? "exercise"}`}
            accessibilityRole="button"
            key={workoutExercise.id}
            onPress={() => onOpenExercise(workoutExercise.id)}
          >
            <Card>
              <AppText variant="exerciseName">{exercise?.name ?? "Exercise unavailable"}</AppText>
              <AppText color={isExerciseComplete(workoutExercise) ? "primary" : "secondary"}>
                {exerciseProgressLabel(workoutExercise)}
              </AppText>
            </Card>
          </Pressable>
        ))}
      </View>
      <SecondaryButton accessibilityHint="Exercise changes are enabled in a later task." disabled label="Add Exercise" />
      <PrimaryButton accessibilityHint="Workout completion is enabled in a later task." disabled label="Finish Workout" />
      <BottomSheet
        accessibilityLabel="Workout note editor"
        dismissOnBackdropPress={!noteSaving}
        onDismiss={() => {
          if (!noteSavingRef.current) setNoteEditorVisible(false);
        }}
        showCloseAction={!noteSaving}
        title="Workout Note"
        visible={noteEditorVisible}
      >
        <TextInput
          accessibilityLabel="Workout note"
          multiline
          onChangeText={setNoteDraft}
          placeholder="Add an optional note about this workout"
          value={noteDraft}
        />
        {noteSaveFailed ? (
          <AppText accessibilityRole="alert" style={styles.noteError} variant="metadata">
            Unable to save the workout note. Your draft was preserved.
          </AppText>
        ) : null}
        <PrimaryButton label="Save Workout Note" loading={noteSaving} onPress={() => { void saveNote(); }} />
      </BottomSheet>
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
  noteCard: { gap: spacing.sm },
  noteError: { color: colors.semantic.error },
  noteHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
