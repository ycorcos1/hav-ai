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
import { ExercisePicker } from "@/features/exercises/components/ExercisePicker";
import { WorkoutElapsedTime } from "@/features/workouts/components/WorkoutElapsedTime";
import { WorkoutOfflineBanner } from "@/features/network/components/WorkoutOfflineBanner";
import type { ActiveWorkoutOverview } from "@/features/workouts/services/workoutApplication";
import type { RecoveryWorkoutOverview } from "@/features/workouts/services/workoutRecoveryContext";
import type {
  Exercise,
  FinishWorkoutResult,
  UserExercisePreference,
  Workout,
} from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type ActiveWorkoutOverviewScreenProps = {
  addExercise?: (exerciseId: string) => Promise<ActiveWorkoutOverview>;
  loadWorkout: () => Promise<RecoveryWorkoutOverview | null>;
  loadExercises?: () => Promise<Exercise[]>;
  loadPreferences?: () => Promise<UserExercisePreference[]>;
  moveExercise?: (
    workoutExerciseId: string,
    direction: "down" | "up",
  ) => Promise<ActiveWorkoutOverview>;
  onOpenExercise: (workoutExerciseId: string) => void;
  onBack?: () => void;
  onWorkoutFinished: (result: FinishWorkoutResult) => void;
  removeExercise?: (workoutExerciseId: string) => Promise<ActiveWorkoutOverview>;
  saveWorkoutNote: (notes?: string) => Promise<Workout>;
  finishWorkout: () => Promise<FinishWorkoutResult>;
};

export function ActiveWorkoutOverviewScreen({
  addExercise,
  loadWorkout,
  loadExercises,
  loadPreferences,
  moveExercise,
  onBack,
  onOpenExercise,
  onWorkoutFinished,
  removeExercise,
  saveWorkoutNote,
  finishWorkout,
}: ActiveWorkoutOverviewScreenProps) {
  const [overview, setOverview] = useState<RecoveryWorkoutOverview | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const [noteSaveFailed, setNoteSaveFailed] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const noteSavingRef = useRef(false);
  const [finishConfirmationVisible, setFinishConfirmationVisible] = useState(false);
  const [finishFailed, setFinishFailed] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const mutationLocked = useRef(false);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [pickerStatus, setPickerStatus] = useState<"error" | "loading" | "ready">("loading");
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [mutationError, setMutationError] = useState(false);
  const [mutatingExercise, setMutatingExercise] = useState(false);
  const [removeCandidate, setRemoveCandidate] = useState<ActiveWorkoutOverview["exercises"][number]>();

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
      <Screen contentContainerStyle={styles.centered} navigationAction={onBack ? { onBack } : undefined}>
        <ErrorState
          action={failed ? <SecondaryButton label="Try Again" onPress={() => { setFailed(false); setAttempt((value) => value + 1); }} /> : undefined}
          message={failed ? "Your active workout could not be loaded. Your local data was not changed." : "This active workout is no longer available."}
          title="Unable to load workout"
        />
      </Screen>
    );
  }
  if (!overview) {
    return <Screen accessibilityLabel="Loading active workout" contentContainerStyle={styles.centered} navigationAction={onBack ? { onBack } : undefined}><ActivityIndicator color={colors.accent.primary} /></Screen>;
  }

  const completedExercises = overview.exercises.filter(({ workoutExercise }) => isExerciseComplete(workoutExercise)).length;
  const incompletePlannedExercises = overview.exercises.filter(({ workoutExercise }) => (
    hasIncompletePlannedWork(workoutExercise)
  )).length;
  const workingSetCount = overview.exercises.reduce(
    (total, { workoutExercise }) => total + completedWorkingSets(workoutExercise),
    0,
  );

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

  function requestFinish(): void {
    setFinishFailed(false);
    if (incompletePlannedExercises > 0) {
      setFinishConfirmationVisible(true);
      return;
    }
    void completeWorkout();
  }

  async function completeWorkout(): Promise<void> {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    setFinishFailed(false);
    try {
      const result = await finishWorkout();
      setFinishConfirmationVisible(false);
      onWorkoutFinished(result);
    } catch {
      setFinishFailed(true);
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  }

  async function openExercisePicker(): Promise<void> {
    if (!addExercise || !loadExercises || !loadPreferences) return;
    setExercisePickerVisible(true);
    setPickerStatus("loading");
    setMutationError(false);
    try {
      const [exercises, preferences] = await Promise.all([
        loadExercises(),
        loadPreferences(),
      ]);
      setAvailableExercises(exercises);
      setFavoriteIds(new Set(
        preferences.filter(({ isFavorite }) => isFavorite).map(({ exerciseId }) => exerciseId),
      ));
      setPickerStatus("ready");
    } catch {
      setPickerStatus("error");
    }
  }

  async function addSelectedExercise(exercise: Exercise): Promise<void> {
    if (!addExercise || mutationLocked.current) return;
    mutationLocked.current = true;
    setMutatingExercise(true);
    setMutationError(false);
    try {
      applyMutationOverview(await addExercise(exercise.id));
      setExercisePickerVisible(false);
    } catch {
      setMutationError(true);
    } finally {
      mutationLocked.current = false;
      setMutatingExercise(false);
    }
  }

  async function moveWorkoutExercise(
    workoutExerciseId: string,
    direction: "down" | "up",
  ): Promise<void> {
    if (!moveExercise || mutationLocked.current) return;
    mutationLocked.current = true;
    setMutatingExercise(true);
    setMutationError(false);
    try {
      applyMutationOverview(await moveExercise(workoutExerciseId, direction));
    } catch {
      setMutationError(true);
    } finally {
      mutationLocked.current = false;
      setMutatingExercise(false);
    }
  }

  function requestExerciseRemoval(
    entry: ActiveWorkoutOverview["exercises"][number],
  ): void {
    if (!removeExercise || mutationLocked.current) return;
    if (entry.workoutExercise.sets.length > 0) {
      setRemoveCandidate(entry);
      return;
    }
    void removeWorkoutExercise(entry.workoutExercise.id);
  }

  async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
    if (!removeExercise || mutationLocked.current) return;
    mutationLocked.current = true;
    setMutatingExercise(true);
    setMutationError(false);
    try {
      applyMutationOverview(await removeExercise(workoutExerciseId));
      setRemoveCandidate(undefined);
    } catch {
      setMutationError(true);
    } finally {
      mutationLocked.current = false;
      setMutatingExercise(false);
    }
  }

  function applyMutationOverview(updated: ActiveWorkoutOverview): void {
    setOverview((current) => ({
      ...updated,
      ...(current?.lastActiveWorkoutExerciseId
        ? { lastActiveWorkoutExerciseId: current.lastActiveWorkoutExerciseId }
        : {}),
    }));
  }

  return (
    <Screen contentContainerStyle={styles.content} navigationAction={onBack ? { onBack } : undefined} scroll>
      <WorkoutOfflineBanner />
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
        {overview.exercises.map((entry, index) => {
          const { exercise, workoutExercise } = entry;
          const name = exercise?.name ?? "exercise";
          return (
            <Card key={workoutExercise.id} style={styles.exerciseCard}>
              <Pressable
                accessibilityLabel={`Open ${name}`}
                accessibilityRole="button"
                onPress={() => onOpenExercise(workoutExercise.id)}
              >
              <AppText variant="exerciseName">{exercise?.name ?? "Exercise unavailable"}</AppText>
              {overview.lastActiveWorkoutExerciseId === workoutExercise.id ? (
                <AppText color="secondary" variant="metadata">Last active</AppText>
              ) : null}
              <AppText color={isExerciseComplete(workoutExercise) ? "primary" : "secondary"}>
                {exerciseProgressLabel(workoutExercise)}
              </AppText>
              </Pressable>
              {moveExercise ? (
                <View style={styles.exerciseActions}>
                  <SecondaryButton
                    accessibilityLabel={`Move ${name} up`}
                    disabled={mutatingExercise || index === 0}
                    label="Move Up"
                    onPress={() => { void moveWorkoutExercise(workoutExercise.id, "up"); }}
                  />
                  <SecondaryButton
                    accessibilityLabel={`Move ${name} down`}
                    disabled={mutatingExercise || index === overview.exercises.length - 1}
                    label="Move Down"
                    onPress={() => { void moveWorkoutExercise(workoutExercise.id, "down"); }}
                  />
                </View>
              ) : null}
              {removeExercise ? (
                <SecondaryButton
                  accessibilityLabel={`Remove ${name}`}
                  disabled={mutatingExercise}
                  label="Remove Exercise"
                  onPress={() => requestExerciseRemoval(entry)}
                />
              ) : null}
            </Card>
          );
        })}
      </View>
      <SecondaryButton
        disabled={!addExercise || !loadExercises || !loadPreferences || mutatingExercise}
        label="Add Exercise"
        onPress={() => { void openExercisePicker(); }}
      />
      {mutationError ? (
        <AppText accessibilityRole="alert" style={styles.noteError} variant="metadata">
          Unable to change this workout. Your saved session was not changed.
        </AppText>
      ) : null}
      <SecondaryButton label="Finish Workout" loading={finishing} onPress={requestFinish} />
      {finishFailed && !finishConfirmationVisible ? (
        <AppText accessibilityRole="alert" style={styles.noteError} variant="metadata">
          Unable to finish the workout. Your local workout is still available.
        </AppText>
      ) : null}
      <BottomSheet
        accessibilityLabel="Add exercise picker"
        dismissOnBackdropPress={!mutatingExercise}
        onDismiss={() => {
          if (!mutationLocked.current) setExercisePickerVisible(false);
        }}
        showCloseAction={!mutatingExercise}
        title="Add Exercise"
        visible={exercisePickerVisible}
      >
        {pickerStatus === "loading" ? <ActivityIndicator color={colors.accent.primary} /> : null}
        {pickerStatus === "error" ? (
          <ErrorState
            message="Your exercise library could not be loaded."
            title="Unable to add exercise"
          />
        ) : null}
        {pickerStatus === "ready" ? (
          <ExercisePicker
            exercises={availableExercises}
            favoriteIds={favoriteIds}
            onSelect={(exercise) => { void addSelectedExercise(exercise); }}
          />
        ) : null}
      </BottomSheet>
      <BottomSheet
        accessibilityLabel="Remove exercise confirmation"
        dismissOnBackdropPress={!mutatingExercise}
        onDismiss={() => {
          if (!mutationLocked.current) setRemoveCandidate(undefined);
        }}
        showCloseAction={!mutatingExercise}
        title="Remove exercise?"
        visible={removeCandidate !== undefined}
      >
        <AppText>
          This exercise has completed set data. Removing it will remove those sets from this workout.
        </AppText>
        <PrimaryButton
          label="Remove Exercise"
          loading={mutatingExercise}
          onPress={() => {
            if (removeCandidate) void removeWorkoutExercise(removeCandidate.workoutExercise.id);
          }}
        />
        <SecondaryButton
          disabled={mutatingExercise}
          label="Keep Exercise"
          onPress={() => setRemoveCandidate(undefined)}
        />
      </BottomSheet>
      <BottomSheet
        accessibilityLabel="Finish workout confirmation"
        dismissOnBackdropPress={!finishing}
        onDismiss={() => {
          if (!finishingRef.current) setFinishConfirmationVisible(false);
        }}
        showCloseAction={!finishing}
        title="Finish workout?"
        visible={finishConfirmationVisible}
      >
        <AppText>You still have planned sets/exercises remaining.</AppText>
        <AppText color="secondary">
          {workingSetCount} working sets · {overview.exercises.length} exercises
        </AppText>
        <AppText color="secondary">
          {incompletePlannedExercises} planned {incompletePlannedExercises === 1 ? "exercise" : "exercises"} incomplete
        </AppText>
        {finishFailed ? (
          <AppText accessibilityRole="alert" style={styles.noteError} variant="metadata">
            Unable to finish the workout. Your local workout is still available.
          </AppText>
        ) : null}
        <PrimaryButton label="Finish Workout" loading={finishing} onPress={() => { void completeWorkout(); }} />
        <SecondaryButton
          disabled={finishing}
          label="Keep Training"
          onPress={() => setFinishConfirmationVisible(false)}
        />
      </BottomSheet>
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

function hasIncompletePlannedWork(
  exercise: ActiveWorkoutOverview["exercises"][number]["workoutExercise"],
): boolean {
  return exercise.targetSets !== undefined
    && exercise.targetSets > completedWorkingSets(exercise);
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
  exerciseActions: { flexDirection: "row", gap: spacing.sm },
  exerciseCard: { gap: spacing.sm },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  heading: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.sm },
  noteCard: { gap: spacing.sm },
  noteError: { color: colors.semantic.error },
  noteHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
