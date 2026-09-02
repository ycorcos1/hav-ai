import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { ActiveWorkoutOverviewScreen } from "@/features/workouts/screens/ActiveWorkoutOverviewScreen";
import { loadCurrentUserWorkoutOverview } from "@/features/workouts/services/workoutApplication";

export default function ActiveWorkoutOverviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loadWorkout = useCallback(() => loadCurrentUserWorkoutOverview(id), [id]);
  return (
    <ActiveWorkoutOverviewScreen
      loadWorkout={loadWorkout}
      onOpenExercise={(workoutExerciseId) => {
        router.push(`/workout/${id}/exercise/${workoutExerciseId}`);
      }}
    />
  );
}
