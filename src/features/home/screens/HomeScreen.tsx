import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { CompactButton } from "@/components/CompactButton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { GroupedSeparator, GroupedSurface } from "@/components/GroupedSurface";
import { ListRow } from "@/components/ListRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { WorkoutElapsedTime } from "@/features/workouts/components/WorkoutElapsedTime";
import type { StartWorkoutResult } from "@/features/workouts/services/startWorkout";
import type { WorkoutHomeState } from "@/features/workouts/services/workoutApplication";
import { colors, spacing } from "@/theme";

export type HomeScreenProps = {
  discardActiveWorkout: (workoutId: string) => Promise<void>;
  loadHome: () => Promise<WorkoutHomeState>;
  onCreateTemplate?: () => void;
  onOpenWorkout: (workoutId: string) => void;
  startWorkout: (templateId: string) => Promise<StartWorkoutResult>;
};

export function HomeScreen({
  discardActiveWorkout,
  loadHome,
  onCreateTemplate,
  onOpenWorkout,
  startWorkout,
}: HomeScreenProps) {
  const [state, setState] = useState<WorkoutHomeState>();
  const [loadError, setLoadError] = useState(false);
  const [startError, setStartError] = useState(false);
  const [startingTemplateId, setStartingTemplateId] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadHome().then(
      (loaded) => { if (active) { setState(loaded); setLoadError(false); } },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [attempt, loadHome]);

  async function executeStart(templateId: string): Promise<StartWorkoutResult | undefined> {
    if (startingTemplateId) return;
    setStartError(false);
    setStartingTemplateId(templateId);
    try {
      const result = await startWorkout(templateId);
      if (result.status === "started") onOpenWorkout(result.workout.id);
      return result;
    } catch {
      setStartError(true);
      return undefined;
    } finally {
      setStartingTemplateId(undefined);
    }
  }

  function presentActiveWorkoutChoices(
    result: Extract<StartWorkoutResult, { status: "active_workout_exists" }>,
    templateId: string,
  ): void {
    showActiveWorkoutChoices(result, {
        discard: async () => {
          try {
            await discardActiveWorkout(result.activeWorkout.id);
            const retryResult = await executeStart(templateId);
            if (retryResult?.status === "active_workout_exists") {
              presentActiveWorkoutChoices(retryResult, templateId);
            }
          } catch {
            setStartError(true);
            setStartingTemplateId(undefined);
          }
        },
        resume: () => onOpenWorkout(result.activeWorkout.id),
      },
    );
  }

  async function start(templateId: string): Promise<void> {
    const result = await executeStart(templateId);
    if (result?.status === "active_workout_exists") {
      presentActiveWorkoutChoices(result, templateId);
    }
  }

  if (loadError) return (
    <Screen contentContainerStyle={styles.centered}>
      <ErrorState
        action={<SecondaryButton label="Try Again" onPress={() => { setLoadError(false); setAttempt((value) => value + 1); }} />}
        message="Your local training state could not be loaded. Try again."
        title="Unable to load Home"
      />
    </Screen>
  );
  if (!state) return <Screen accessibilityLabel="Loading Home" contentContainerStyle={styles.centered}><ActivityIndicator color={colors.accent.primary} /></Screen>;

  if (state.activeWorkout) {
    const completedExercises = state.activeWorkout.exercises.filter((exercise) => {
      if (!exercise.targetSets) return false;
      return exercise.sets.filter(({ setType }) => setType === "working").length >= exercise.targetSets;
    }).length;

    return (
      <Screen contentContainerStyle={styles.content} scroll>
        <View style={styles.pageHeader}>
          <AppText color="secondary" variant="metadata">WORKOUT IN PROGRESS</AppText>
          <AppText variant="screenTitle">{state.activeWorkout.name}</AppText>
          <AppText color="secondary">Pick up exactly where you left off.</AppText>
        </View>
        <Card style={styles.activeWorkoutCard}>
          <View style={styles.activeWorkoutDetails}>
            <View style={styles.metric}>
              <AppText color="muted" variant="metadata">Elapsed Time</AppText>
              <WorkoutElapsedTime startedAt={state.activeWorkout.startedAt} />
            </View>
            <View style={styles.metric}>
              <AppText color="muted" variant="metadata">Progress</AppText>
              <AppText variant="sectionHeading">
                {completedExercises} / {state.activeWorkout.exercises.length} exercises
              </AppText>
            </View>
          </View>
          <PrimaryButton label="Resume Workout" onPress={() => onOpenWorkout(state.activeWorkout!.id)} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <View style={styles.pageHeader}>
        <AppText variant="screenTitle">Ready to Train</AppText>
        <AppText color="secondary">Choose a workout and start when you’re ready.</AppText>
      </View>

      <View style={styles.section}>
        <SectionHeader color="secondary" title="WORKOUT TEMPLATES" />
        {state.templates.length === 0 ? (
          <GroupedSurface>
            <EmptyState
              action={onCreateTemplate ? (
                <CompactButton label="Create Workout" onPress={onCreateTemplate} tone="accent" />
              ) : undefined}
              message="Create your first reusable workout to begin training."
              title="No workouts yet"
            />
          </GroupedSurface>
        ) : (
          <GroupedSurface>
            {state.templates.map((template, index) => (
              <View key={template.id}>
                {index > 0 ? <GroupedSeparator /> : null}
                <ListRow
                  subtitle={`${template.exercises.length} ${template.exercises.length === 1 ? "exercise" : "exercises"}`}
                  title={template.name}
                  trailing={(
                    <CompactButton
                      accessibilityLabel="Start Workout"
                      disabled={Boolean(startingTemplateId)}
                      label={startingTemplateId === template.id ? "Starting…" : "Start"}
                      onPress={() => { void start(template.id); }}
                      tone="accent"
                    />
                  )}
                />
              </View>
            ))}
          </GroupedSurface>
        )}
      </View>
      {startError ? <ErrorState message="Your workout could not be started. Nothing was replaced. Try again." title="Unable to start workout" /> : null}
      <View style={styles.section}>
        <SectionHeader color="secondary" title="RECENT TRAINING" />
        <GroupedSurface>
          <EmptyState
            message="Completed workouts will appear here as your training history grows."
            title="No completed sessions yet"
          />
        </GroupedSurface>
      </View>
    </Screen>
  );
}

function showActiveWorkoutChoices(
  result: Extract<StartWorkoutResult, { status: "active_workout_exists" }>,
  actions: { discard: () => Promise<void>; resume: () => void },
): void {
  Alert.alert("Workout in progress", `${result.activeWorkout.name} is already active.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Resume", onPress: actions.resume },
    {
      text: "Discard", style: "destructive", onPress: () => Alert.alert(
        "Discard current workout?",
        "Unsaved active workout data will be discarded.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Discard Workout", style: "destructive", onPress: () => { void actions.discard(); } },
        ],
      ),
    },
  ]);
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  content: { gap: spacing.xl, paddingBottom: spacing.xxxl + spacing.xl, paddingTop: spacing.xl },
  pageHeader: { gap: spacing.sm },
  section: { gap: spacing.sm },
  activeWorkoutCard: { gap: spacing.lg },
  activeWorkoutDetails: { flexDirection: "row", gap: spacing.xl },
  metric: { flex: 1, gap: spacing.xs },
});
