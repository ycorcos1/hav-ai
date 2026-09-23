import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { ActiveWorkoutCoachScreen } from "@/features/coach/screens/ActiveWorkoutCoachScreen";
import { loadCurrentUserActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function ActiveWorkoutCoachRoute() {
  const { id, workoutExerciseId } = useLocalSearchParams<{
    id: string;
    workoutExerciseId: string;
  }>();
  const goBack = useSafeBack(
    workoutExerciseId
      ? `/workout/${id}/exercise/${workoutExerciseId}`
      : `/workout/${id}`,
  );
  const loadExercise = useCallback(
    () => loadCurrentUserActiveWorkoutExercise(id, workoutExerciseId),
    [id, workoutExerciseId],
  );

  return (
    <ActiveWorkoutCoachScreen
      loadExercise={loadExercise}
      onClose={goBack}
    />
  );
}
