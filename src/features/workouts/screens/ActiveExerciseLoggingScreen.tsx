import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { BottomSheet } from "@/components/BottomSheet";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextButton } from "@/components/TextButton";
import {
  SetInputRow,
  type SetInputDraft,
  type SetInputValues,
} from "@/features/workouts/components/SetInputRow";
import { triggerSetCompletionHaptic } from "@/features/workouts/services/setCompletionFeedback";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import type {
  CompleteSetInput,
  CompleteSetResult,
  EditSetInput,
  UndoSetCompletionResult,
  WorkoutSet,
  WorkoutSetType,
} from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type ActiveExerciseLoggingScreenProps = {
  completeSet: (input: CompleteSetInput) => Promise<CompleteSetResult>;
  deleteSet?: (setId: string) => Promise<void>;
  editSet?: (input: EditSetInput) => Promise<WorkoutSet>;
  loadExercise: () => Promise<ActiveWorkoutExercise | null>;
  onOpenExercise: (workoutExerciseId: string) => void;
  onOverview: () => void;
  undoSet?: (setId: string) => Promise<UndoSetCompletionResult>;
};

export const SET_COMPLETION_UNDO_DURATION_MS = 5_000;

type SetCompletionUndoOpportunity = {
  deadline: number;
  draft: SetInputDraft;
  extraSetEntryVisible: boolean;
  setId: string;
  setType: WorkoutSetType;
  token: number;
};

export function ActiveExerciseLoggingScreen({
  completeSet,
  deleteSet,
  editSet,
  loadExercise,
  onOpenExercise,
  onOverview,
  undoSet,
}: ActiveExerciseLoggingScreenProps) {
  const [activeExercise, setActiveExercise] = useState<ActiveWorkoutExercise | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [completionError, setCompletionError] = useState(false);
  const [entryVersion, setEntryVersion] = useState(0);
  const [entrySetType, setEntrySetType] = useState<WorkoutSetType>("working");
  const [extraSetEntryVisible, setExtraSetEntryVisible] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [editingSet, setEditingSet] = useState<WorkoutSet>();
  const [editError, setEditError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingSet, setDeletingSet] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState<SetInputDraft>();
  const [undoOpportunity, setUndoOpportunity] = useState<SetCompletionUndoOpportunity>();
  const [undoError, setUndoError] = useState(false);
  const [undoingSet, setUndoingSet] = useState(false);
  const completionDraft = useRef<SetInputDraft | undefined>(undefined);
  const completionLocked = useRef(false);
  const deleteLocked = useRef(false);
  const editLocked = useRef(false);
  const undoLocked = useRef(false);
  const activeUndoToken = useRef(0);
  const undoSequence = useRef(0);

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

  useEffect(() => {
    if (!undoOpportunity) return;
    const remaining = Math.max(0, undoOpportunity.deadline - Date.now());
    const timeout = setTimeout(() => {
      if (undoLocked.current) return;
      setUndoOpportunity((current) => {
        if (current?.token !== undoOpportunity.token) return current;
        activeUndoToken.current = 0;
        return undefined;
      });
    }, remaining);
    return () => clearTimeout(timeout);
  }, [undoOpportunity]);

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
  const completedWorkingSetCount = workoutExercise.sets.filter(
    ({ setType }) => setType === "working",
  ).length;
  const plannedWorkingSetsComplete = workoutExercise.targetSets !== undefined
    && completedWorkingSetCount >= workoutExercise.targetSets;
  const setEntryVisible = entrySetType === "warmup"
    || !plannedWorkingSetsComplete
    || extraSetEntryVisible;
  const previousWorkingSetWeight = [...(previousPerformance?.sets ?? [])]
    .reverse()
    .find(({ weightKg }) => weightKg !== undefined)?.weightKg;
  const entryWeightKg = previousWorkingSetWeight ?? workoutExercise.targetWeightKg;

  const completeCurrentSet = async (values: SetInputValues): Promise<void> => {
    if (completionLocked.current) return;
    completionLocked.current = true;
    setSavingSet(true);
    setCompletionError(false);
    const capturedDraft = completionDraft.current;
    const capturedSetType = entrySetType;
    const capturedExtraSetEntryVisible = extraSetEntryVisible;
    try {
      const result = await completeSet({
        exerciseId: workoutExercise.exerciseId,
        ...(values.notes === undefined ? {} : { notes: values.notes }),
        reps: values.reps,
        ...(values.rpe === undefined ? {} : { rpe: values.rpe }),
        setType: entrySetType,
        ...(values.weightKg === undefined ? {} : { weightKg: values.weightKg }),
        workoutExerciseId: workoutExercise.id,
        workoutId: workout.id,
      });
      setActiveExercise((current) => current
        ? appendCompletedSet(current, result.set)
        : current);
      if (capturedDraft && undoSet) {
        const token = undoSequence.current + 1;
        undoSequence.current = token;
        activeUndoToken.current = token;
        setUndoOpportunity({
          deadline: Date.now() + SET_COMPLETION_UNDO_DURATION_MS,
          draft: capturedDraft,
          extraSetEntryVisible: capturedExtraSetEntryVisible,
          setId: result.set.id,
          setType: capturedSetType,
          token,
        });
        setUndoError(false);
      }
      completionDraft.current = undefined;
      setRestoredDraft(undefined);
      setEntrySetType("working");
      setExtraSetEntryVisible(false);
      setEntryVersion((value) => value + 1);
      await triggerSetCompletionHaptic();
    } catch {
      setCompletionError(true);
    } finally {
      completionLocked.current = false;
      setSavingSet(false);
    }
  };

  const undoCompletedSet = async (): Promise<void> => {
    const opportunity = undoOpportunity;
    if (!opportunity || !undoSet || undoLocked.current) return;
    if (Date.now() >= opportunity.deadline) {
      if (activeUndoToken.current === opportunity.token) activeUndoToken.current = 0;
      setUndoOpportunity((current) => (
        current?.token === opportunity.token ? undefined : current
      ));
      return;
    }

    undoLocked.current = true;
    setUndoingSet(true);
    setUndoError(false);
    try {
      await undoSet(opportunity.setId);
      setActiveExercise((current) => current
        ? removeCompletedSet(current, opportunity.setId)
        : current);
      if (activeUndoToken.current === opportunity.token) {
        activeUndoToken.current = 0;
        setEntrySetType(opportunity.setType);
        setExtraSetEntryVisible(opportunity.extraSetEntryVisible);
        setRestoredDraft(opportunity.draft);
        setEntryVersion((value) => value + 1);
        setUndoOpportunity(undefined);
      }
    } catch {
      setUndoError(true);
      if (Date.now() >= opportunity.deadline && activeUndoToken.current === opportunity.token) {
        activeUndoToken.current = 0;
        setUndoOpportunity(undefined);
      } else {
        setUndoOpportunity((current) => (
          current?.token === opportunity.token ? { ...current } : current
        ));
      }
    } finally {
      undoLocked.current = false;
      setUndoingSet(false);
    }
  };

  const saveEditedSet = async (values: SetInputValues): Promise<void> => {
    if (!editingSet || !editSet || editLocked.current) return;
    editLocked.current = true;
    setSavingEdit(true);
    setEditError(false);
    setDeleteError(false);
    try {
      const saved = await editSet({
        setId: editingSet.id,
        ...(Object.prototype.hasOwnProperty.call(values, "notes")
          ? { notes: values.notes }
          : {}),
        reps: values.reps,
        ...(values.rpe === undefined ? {} : { rpe: values.rpe }),
        ...(values.weightKg === undefined ? {} : { weightKg: values.weightKg }),
      });
      setActiveExercise((current) => current ? replaceCompletedSet(current, saved) : current);
      setEditingSet(undefined);
    } catch {
      setEditError(true);
    } finally {
      editLocked.current = false;
      setSavingEdit(false);
    }
  };

  const deleteEditedSet = async (): Promise<void> => {
    if (!editingSet || !deleteSet || deleteLocked.current) return;
    deleteLocked.current = true;
    setDeletingSet(true);
    setEditError(false);
    setDeleteError(false);
    try {
      await deleteSet(editingSet.id);
      setActiveExercise((current) => current ? removeCompletedSet(current, editingSet.id) : current);
      setEditingSet(undefined);
    } catch {
      setDeleteError(true);
    } finally {
      deleteLocked.current = false;
      setDeletingSet(false);
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
          completedSetLabels(workoutExercise.sets, profile.weightUnit).map(({ label, set }) => (
            <View key={set.id} style={styles.completedSet}>
              <TextButton
                accessibilityLabel={`Edit ${label}`}
                disabled={!editSet}
                label={label}
                onPress={() => {
                  setEditError(false);
                  setDeleteError(false);
                  setEditingSet(set);
                }}
              />
              {set.notes ? (
                <AppText
                  accessibilityLabel={`Note for ${label}`}
                  color="muted"
                  variant="metadata"
                >
                  Set note: {set.notes}
                </AppText>
              ) : null}
            </View>
          ))
        )}
      </View>

      {undoOpportunity ? (
        <View accessibilityLabel="Set completion undo" style={styles.undoMessage}>
          <AppText color="secondary">Set completed</AppText>
          <TextButton
            disabled={undoingSet}
            label="Undo"
            onPress={() => {
              void undoCompletedSet();
            }}
          />
        </View>
      ) : null}
      {undoError ? (
        <AppText accessibilityRole="alert" style={styles.error} variant="metadata">
          This set could not be undone. It remains in your workout.
        </AppText>
      ) : null}

      {entrySetType === "warmup" ? (
        <AppText color="secondary" variant="sectionHeading">WARM-UP SET</AppText>
      ) : null}
      {setEntryVisible ? (
        <SetInputRow
          key={`${workoutExercise.id}-${entryVersion}`}
          disabled={savingSet || !exercise}
          initialDraft={restoredDraft}
          initialWeightKg={entryWeightKg}
          onCompleteDraftCaptured={(draft) => {
            completionDraft.current = draft;
          }}
          onComplete={(values) => {
            void completeCurrentSet(values);
          }}
          requiresWeight={exercise?.measurementType === "weight_reps"}
          rpePreference={profile.rpePreference}
          weightUnit={profile.weightUnit}
        />
      ) : (
        <SecondaryButton
          accessibilityHint="Adds another working-set entry to this workout only."
          label="Add Set"
          onPress={() => setExtraSetEntryVisible(true)}
        />
      )}
      {entrySetType !== "warmup" ? (
        <SecondaryButton
          accessibilityHint="Logs a warm-up without counting it as a working set."
          label="Add Warm-Up Set"
          onPress={() => {
            setEntrySetType("warmup");
            setExtraSetEntryVisible(false);
            setEntryVersion((value) => value + 1);
          }}
        />
      ) : null}
      {completionError ? (
        <AppText accessibilityRole="alert" style={styles.error} variant="metadata">
          This set could not be saved. Check your entries and try again.
        </AppText>
      ) : null}
      <BottomSheet
        accessibilityLabel="Edit completed set"
        onDismiss={() => {
          if (!savingEdit && !deletingSet) setEditingSet(undefined);
        }}
        title="Edit completed set"
        visible={editingSet !== undefined}
      >
        {editingSet ? (
          <SetInputRow
            key={`${editingSet.id}-${editingSet.updatedAt}`}
            actionLabel="Save Set"
            disabled={savingEdit || deletingSet}
            initialNotes={editingSet.notes}
            initialReps={editingSet.reps}
            initialRpe={editingSet.rpe}
            initialWeightKg={editingSet.weightKg}
            onComplete={(values) => {
              void saveEditedSet(values);
            }}
            requiresWeight={exercise?.measurementType === "weight_reps"}
            rpePreference={profile.rpePreference}
            weightUnit={profile.weightUnit}
          />
        ) : null}
        {editingSet && deleteSet ? (
          <SecondaryButton
            disabled={savingEdit || deletingSet}
            label="Delete Set"
            loading={deletingSet}
            onPress={() => {
              Alert.alert(
                "Delete set?",
                "This completed set will be removed from the workout.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      void deleteEditedSet();
                    },
                  },
                ],
              );
            }}
          />
        ) : null}
        {editError ? (
          <AppText accessibilityRole="alert" style={styles.error} variant="metadata">
            This set could not be updated. Your previous values were kept.
          </AppText>
        ) : null}
        {deleteError ? (
          <AppText accessibilityRole="alert" style={styles.error} variant="metadata">
            This set could not be deleted. It remains in your workout.
          </AppText>
        ) : null}
      </BottomSheet>
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

function completedSetLabels(
  sets: WorkoutSet[],
  weightUnit: ActiveWorkoutExercise["profile"]["weightUnit"],
): { label: string; set: WorkoutSet }[] {
  let warmupCount = 0;
  let workingCount = 0;
  return [...sets]
    .sort((left, right) => left.position - right.position)
    .map((set) => {
      const prefix = set.setType === "warmup"
        ? `Warm-up ${warmupCount += 1}`
        : `Set ${workingCount += 1}`;
      const weight = set.weightKg === undefined
        ? "Bodyweight"
        : `${formatDisplayWeight(set.weightKg, weightUnit)} ${weightUnit}`;
      return { label: `${prefix}: ${weight} × ${set.reps}`, set };
    });
}

function replaceCompletedSet(
  activeExercise: ActiveWorkoutExercise,
  editedSet: WorkoutSet,
): ActiveWorkoutExercise {
  const replace = (sets: WorkoutSet[]) => sets.map((set) => (
    set.id === editedSet.id ? editedSet : set
  ));
  const workoutExercise = {
    ...activeExercise.workoutExercise,
    sets: replace(activeExercise.workoutExercise.sets),
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

function removeCompletedSet(
  activeExercise: ActiveWorkoutExercise,
  setId: string,
): ActiveWorkoutExercise {
  const remove = (sets: WorkoutSet[]) => sets.filter(({ id }) => id !== setId);
  const workoutExercise = {
    ...activeExercise.workoutExercise,
    sets: remove(activeExercise.workoutExercise.sets),
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
  completedSet: { gap: spacing.xs },
  content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  error: { color: colors.semantic.error },
  note: { gap: spacing.xs },
  section: { gap: spacing.sm },
  switchingControls: { gap: spacing.sm },
  targetCard: { borderLeftColor: colors.accent.primary, borderLeftWidth: 3, gap: spacing.sm },
  undoMessage: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
