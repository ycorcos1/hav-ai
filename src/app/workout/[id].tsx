import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { ActiveWorkoutOverviewScreen } from "@/features/workouts/screens/ActiveWorkoutOverviewScreen";
import {
  finishCurrentUserWorkout,
  updateCurrentUserActiveWorkoutNote,
} from "@/features/workouts/services/workoutApplication";
import { loadRecoveryWorkoutOverview } from "@/features/workouts/services/workoutRecoveryContext";

export default function ActiveWorkoutOverviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loadWorkout = useCallback(() => loadRecoveryWorkoutOverview(id), [id]);
  return (
    <ActiveWorkoutOverviewScreen
      loadWorkout={loadWorkout}
      finishWorkout={() => finishCurrentUserWorkout({
        workoutId: id,
        completedAt: new Date().toISOString(),
      })}
      onOpenExercise={(workoutExerciseId) => {
        router.push(`/workout/${id}/exercise/${workoutExerciseId}`);
      }}
      onWorkoutFinished={() => router.replace(`/workout/${id}/summary`)}
      saveWorkoutNote={(notes) => updateCurrentUserActiveWorkoutNote({ workoutId: id, notes })}
    />
  );
}
