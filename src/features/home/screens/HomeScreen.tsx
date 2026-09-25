import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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
import { useStartWorkoutFlow } from "@/features/workouts/hooks/useStartWorkoutFlow";
import type { StartWorkoutResult } from "@/features/workouts/services/startWorkout";
import type { WorkoutHomeState } from "@/features/workouts/services/workoutApplication";
import type { Workout } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type HomeScreenProps = {
  discardActiveWorkout: (workoutId: string) => Promise<void>;
  loadHome: () => Promise<WorkoutHomeState>;
  onCreateTemplate?: () => void;
  onOpenHistoryWorkout: (workoutId: string) => void;
  onOpenWorkout: (workoutId: string) => void;
  refreshKey?: number;
  startWorkout: (templateId: string) => Promise<StartWorkoutResult>;
};

export function HomeScreen({
  discardActiveWorkout,
  loadHome,
  onCreateTemplate,
  onOpenHistoryWorkout,
  onOpenWorkout,
  refreshKey = 0,
  startWorkout,
}: HomeScreenProps) {
  const [state, setState] = useState<WorkoutHomeState>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { start, startError, startingTemplateId } = useStartWorkoutFlow({
    discardActiveWorkout,
    onOpenWorkout,
    startWorkout,
  });

  useEffect(() => {
    let active = true;
    void loadHome().then(
      (loaded) => { if (active) { setState(loaded); setLoadError(false); } },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [attempt, loadHome, refreshKey]);

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
        <RecentTraining
          onOpenWorkout={onOpenHistoryWorkout}
          workouts={state.recentWorkouts}
        />
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
      <RecentTraining onOpenWorkout={onOpenHistoryWorkout} workouts={state.recentWorkouts} />
    </Screen>
  );
}

function RecentTraining({
  onOpenWorkout,
  workouts,
}: {
  onOpenWorkout: (workoutId: string) => void;
  workouts: Workout[];
}) {
  const recent = [...workouts]
    .filter((workout) => workout.status === "completed" && workout.completedAt)
    .sort((left, right) => (
      right.completedAt!.localeCompare(left.completedAt!) || right.id.localeCompare(left.id)
    ))
    .slice(0, 3);

  return (
    <View style={styles.section}>
      <SectionHeader color="secondary" title="RECENT TRAINING" />
      {recent.length === 0 ? (
        <GroupedSurface>
          <EmptyState
            message="Completed workouts will appear here as your training history grows."
            title="No completed sessions yet"
          />
        </GroupedSurface>
      ) : (
        <GroupedSurface>
          {recent.map((workout, index) => (
            <View key={workout.id}>
              {index > 0 ? <GroupedSeparator /> : null}
              <ListRow
                accessibilityLabel={`View ${workout.name} workout history`}
                onPress={() => onOpenWorkout(workout.id)}
                subtitle={recentWorkoutSummary(workout)}
                title={workout.name}
              />
            </View>
          ))}
        </GroupedSurface>
      )}
    </View>
  );
}

function recentWorkoutSummary(workout: Workout): string {
  const completedAt = workout.completedAt!;
  const completed = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(completedAt));
  const durationSeconds = Math.max(0, Math.floor(
    (new Date(completedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000,
  ));
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const setCount = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const exerciseLabel = `${workout.exercises.length} ${workout.exercises.length === 1 ? "exercise" : "exercises"}`;
  const setLabel = `${setCount} ${setCount === 1 ? "set" : "sets"}`;
  return `${completed} · ${duration} · ${exerciseLabel} · ${setLabel}`;
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
