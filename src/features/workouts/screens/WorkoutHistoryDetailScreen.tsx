import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { BottomSheet } from "@/components/BottomSheet";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { TextButton } from "@/components/TextButton";
import { SetInputRow, type SetInputValues } from "@/features/workouts/components/SetInputRow";
import type { HistoricalSetEditResult } from "@/features/workouts/services/historicalWorkoutMutations";
import type { WorkoutHistoryDetail } from "@/features/workouts/services/workoutApplication";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import type { WorkoutSet } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type WorkoutHistoryDetailScreenProps = {
  deleteWorkout?: () => Promise<void>;
  editSet?: (input: SetInputValues & { setId: string }) => Promise<HistoricalSetEditResult>;
  loadWorkout: () => Promise<WorkoutHistoryDetail | null>;
  onDeleted?: () => void;
};

export function WorkoutHistoryDetailScreen({
  deleteWorkout,
  editSet,
  loadWorkout,
  onDeleted,
}: WorkoutHistoryDetailScreenProps) {
  const [detail, setDetail] = useState<WorkoutHistoryDetail | null>();
  const [failed, setFailed] = useState(false);
  const [editingSet, setEditingSet] = useState<WorkoutSet>();
  const [savingSet, setSavingSet] = useState(false);
  const [editError, setEditError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const saveSet = async (values: SetInputValues): Promise<void> => {
    if (!editingSet || !editSet || savingSet) return;
    setSavingSet(true);
    setEditError(false);
    try {
      const result = await editSet({ setId: editingSet.id, ...values });
      setDetail((current) => current ? {
        ...current,
        exercises: current.exercises.map((item) => ({
          ...item,
          workoutExercise: {
            ...item.workoutExercise,
            sets: item.workoutExercise.sets.map((set) => (
              set.id === result.set.id ? result.set : set
            )),
          },
        })),
      } : current);
      setEditingSet(undefined);
    } catch {
      setEditError(true);
    } finally {
      setSavingSet(false);
    }
  };

  const removeWorkout = async (): Promise<void> => {
    if (!deleteWorkout || deleting) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await deleteWorkout();
      onDeleted?.();
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  };

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
                {editSet ? (
                  <TextButton
                    accessibilityLabel={`Edit ${setLabel(set, detail.weightUnit)}`}
                    label={setLabel(set, detail.weightUnit)}
                    onPress={() => { setEditError(false); setEditingSet(set); }}
                  />
                ) : <AppText>{setLabel(set, detail.weightUnit)}</AppText>}
                {set.notes ? <AppText color="secondary" variant="metadata">{set.notes}</AppText> : null}
              </View>
            ))}
        </Card>
      ))}
      {deleteWorkout ? (
        <TextButton
          disabled={deleting}
          label="Delete Workout"
          onPress={() => {
            Alert.alert(
              "Delete workout?",
              "This workout and its sets will be removed. Your records and recommendations will be recalculated.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete Workout", style: "destructive", onPress: () => { void removeWorkout(); } },
              ],
            );
          }}
        />
      ) : null}
      {deleteError ? (
        <ErrorState
          message="This workout is still available. Try again."
          title="Unable to delete workout"
        />
      ) : null}
      <BottomSheet
        accessibilityLabel="Edit historical set"
        onDismiss={() => { if (!savingSet) setEditingSet(undefined); }}
        title="Edit completed set"
        visible={editingSet !== undefined}
      >
        {editingSet ? (
          <SetInputRow
            key={`${editingSet.id}-${editingSet.updatedAt}`}
            actionLabel="Save Set"
            disabled={savingSet}
            initialNotes={editingSet.notes}
            initialReps={editingSet.reps}
            initialRpe={editingSet.rpe}
            initialWeightKg={editingSet.weightKg}
            onComplete={(values) => { void saveSet(values); }}
            requiresWeight={detail.exercises.some(({ exercise, workoutExercise }) => (
              workoutExercise.id === editingSet.workoutExerciseId
              && exercise?.measurementType === "weight_reps"
            ))}
            rpePreference={detail.rpePreference}
            weightUnit={detail.weightUnit}
          />
        ) : null}
        {editError ? (
          <AppText accessibilityRole="alert" color="secondary" variant="metadata">
            This set could not be updated. Your previous values were kept.
          </AppText>
        ) : null}
      </BottomSheet>
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
