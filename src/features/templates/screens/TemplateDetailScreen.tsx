import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextButton } from "@/components/TextButton";
import type { TemplateDetail } from "@/features/templates/services/templateApplication";
import { useStartWorkoutFlow } from "@/features/workouts/hooks/useStartWorkoutFlow";
import type { StartWorkoutResult } from "@/features/workouts/services/startWorkout";
import type { WorkoutTemplate } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type TemplateDetailScreenProps = {
  discardActiveWorkout: (workoutId: string) => Promise<void>;
  loadTemplate: () => Promise<TemplateDetail | null>;
  onArchive?: (id: string) => Promise<void>;
  onArchived?: () => void;
  onBack?: () => void;
  onDuplicate?: (id: string) => Promise<WorkoutTemplate>;
  onDuplicated?: (id: string) => void;
  onEdit?: (id: string) => void;
  onOpenWorkout: (workoutId: string) => void;
  startWorkout: (templateId: string) => Promise<StartWorkoutResult>;
};

export function TemplateDetailScreen({
  discardActiveWorkout,
  loadTemplate,
  onArchive,
  onArchived,
  onBack,
  onDuplicate,
  onDuplicated,
  onEdit,
  onOpenWorkout,
  startWorkout,
}: TemplateDetailScreenProps) {
  const [detail, setDetail] = useState<TemplateDetail | null>();
  const [failed, setFailed] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [archiveError, setArchiveError] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const {
    start,
    startError,
    startingTemplateId,
  } = useStartWorkoutFlow({ discardActiveWorkout, onOpenWorkout, startWorkout });

  useEffect(() => {
    let active = true;
    void loadTemplate().then(
      (loaded) => { if (active) setDetail(loaded); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [loadTemplate]);

  async function duplicate(): Promise<void> {
    if (!detail || !onDuplicate || duplicating) return;
    setDuplicateError(false);
    setDuplicating(true);
    try {
      const copy = await onDuplicate(detail.template.id);
      onDuplicated?.(copy.id);
    } catch {
      setDuplicateError(true);
    } finally {
      setDuplicating(false);
    }
  }

  async function archive(): Promise<void> {
    if (!detail || !onArchive || archiving) return;
    setArchiveError(false);
    setArchiving(true);
    try {
      await onArchive(detail.template.id);
      onArchived?.();
    } catch {
      setArchiveError(true);
    } finally {
      setArchiving(false);
    }
  }

  function confirmArchive(): void {
    if (!detail || archiving) return;
    Alert.alert(
      "Delete template?",
      `${detail.template.name} will be removed from your workouts. Historical workouts will not change.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Template", style: "destructive", onPress: () => { void archive(); } },
      ],
    );
  }

  if (failed || detail === null) {
    return <Screen navigationAction={onBack ? { onBack } : undefined}><ErrorState message="This local workout could not be loaded." title="Unable to load workout" /></Screen>;
  }
  if (!detail) {
    return <Screen contentContainerStyle={styles.loading} navigationAction={onBack ? { onBack } : undefined}><ActivityIndicator color={colors.accent.primary} /></Screen>;
  }

  return (
    <Screen contentContainerStyle={styles.content} navigationAction={onBack ? { onBack } : undefined} scroll>
      <AppText variant="screenTitle">{detail.template.name}</AppText>
      {detail.template.notes ? <AppText color="secondary">{detail.template.notes}</AppText> : null}
      <View style={styles.list}>
        {detail.exercises.map(({ exercise, templateExercise }) => (
          <Card key={templateExercise.id}>
            <AppText variant="exerciseName">{exercise.name}</AppText>
            <AppText color="secondary">
              {templateExercise.targetSets} sets · {templateExercise.targetMinReps}-{templateExercise.targetMaxReps} reps
            </AppText>
            {templateExercise.notes ? <AppText color="muted" variant="metadata">{templateExercise.notes}</AppText> : null}
          </Card>
        ))}
      </View>
      <PrimaryButton
        label={startingTemplateId === detail.template.id ? "Starting…" : "Start Workout"}
        loading={startingTemplateId === detail.template.id}
        onPress={() => { void start(detail.template.id); }}
      />
      {startError ? (
        <ErrorState
          message="Your workout could not be started. Nothing was replaced. Try again."
          title="Unable to start workout"
        />
      ) : null}
      {onEdit ? <SecondaryButton label="Edit Template" onPress={() => onEdit(detail.template.id)} /> : null}
      {onDuplicate ? (
        <SecondaryButton label="Duplicate Template" loading={duplicating} onPress={() => { void duplicate(); }} />
      ) : null}
      {duplicateError ? (
        <ErrorState
          message="This workout could not be duplicated. The original is unchanged. Try again."
          title="Unable to duplicate workout"
        />
      ) : null}
      {onArchive ? <TextButton disabled={archiving} label="Delete Template" onPress={confirmArchive} /> : null}
      {archiveError ? (
        <ErrorState
          message="This workout could not be deleted. It is still available. Try again."
          title="Unable to delete workout"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  list: { gap: spacing.sm },
  loading: { alignItems: "center", justifyContent: "center" },
});
