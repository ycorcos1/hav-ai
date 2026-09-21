import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { ActiveWorkoutCoachScreen } from "@/features/coach/screens/ActiveWorkoutCoachScreen";
import { loadCurrentUserActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";

export default function ActiveWorkoutCoachRoute() {
  const { id, workoutExerciseId } = useLocalSearchParams<{
    id: string;
    workoutExerciseId: string;
  }>();
  const router = useRouter();
  const loadExercise = useCallback(
    () => loadCurrentUserActiveWorkoutExercise(id, workoutExerciseId),
    [id, workoutExerciseId],
  );

  return (
    <ActiveWorkoutCoachScreen
      loadExercise={loadExercise}
      onClose={() => router.back()}
    />
  );
}
