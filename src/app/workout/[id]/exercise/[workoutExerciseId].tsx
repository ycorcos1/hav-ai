import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import {
  completeCurrentUserSet,
  deleteCurrentUserSet,
  editCurrentUserSet,
  loadCurrentUserActiveWorkoutExercise,
} from "@/features/workouts/services/workoutApplication";

export default function ActiveExerciseLoggingRoute() {
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
    <ActiveExerciseLoggingScreen
      completeSet={completeCurrentUserSet}
      deleteSet={deleteCurrentUserSet}
      editSet={editCurrentUserSet}
      loadExercise={loadExercise}
      onOpenExercise={(nextWorkoutExerciseId) => {
        router.replace(`/workout/${id}/exercise/${nextWorkoutExerciseId}`);
      }}
      onOverview={() => router.replace(`/workout/${id}`)}
    />
  );
}
