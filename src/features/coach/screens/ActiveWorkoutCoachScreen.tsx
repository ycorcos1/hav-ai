import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";

import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { type CoachApi } from "@/features/ai/api";
import { buildActiveWorkoutCoachContext } from "@/features/coach/services/activeWorkoutCoachContext";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import { colors } from "@/theme";

import { CoachScreen } from "./CoachScreen";

export type ActiveWorkoutCoachScreenProps = {
  api?: CoachApi;
  loadExercise: () => Promise<ActiveWorkoutExercise | null>;
  onClose: () => void;
};

export function ActiveWorkoutCoachScreen({
  api,
  loadExercise,
  onClose,
}: ActiveWorkoutCoachScreenProps) {
  const [activeExercise, setActiveExercise] = useState<ActiveWorkoutExercise | null>();

  useEffect(() => {
    let active = true;
    void loadExercise().then(
      (loaded) => { if (active) setActiveExercise(loaded); },
      () => { if (active) setActiveExercise(null); },
    );
    return () => { active = false; };
  }, [loadExercise]);

  if (activeExercise === undefined) {
    return (
      <Screen accessibilityLabel="Loading workout Coach" contentContainerStyle={styles.centered} navigationAction={{ onBack: onClose }}>
        <ActivityIndicator color={colors.accent.primary} />
      </Screen>
    );
  }
  if (activeExercise === null) {
    return (
      <Screen contentContainerStyle={styles.centered} navigationAction={{ onBack: onClose }}>
        <ErrorState
          message="Your active exercise context could not be loaded. Your workout was not changed."
          title="Unable to open Coach"
        />
      </Screen>
    );
  }

  return (
    <CoachScreen
      activeContext={buildActiveWorkoutCoachContext(activeExercise)}
      activeContextLabel={`${activeExercise.exercise?.name ?? "Current exercise"} · Current Workout`}
      api={api}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
});
