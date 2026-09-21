import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import { workoutParserApi } from "@/features/ai/api";
import {
  completeCurrentUserSet,
  deleteCurrentUserSet,
  editCurrentUserSet,
  undoCurrentUserSetCompletion,
} from "@/features/workouts/services/workoutApplication";
import { loadAndRememberActiveExercise } from "@/features/workouts/services/workoutRecoveryContext";

export default function ActiveExerciseLoggingRoute() {
  const { id, workoutExerciseId } = useLocalSearchParams<{
    id: string;
    workoutExerciseId: string;
  }>();
  const router = useRouter();
  const loadExercise = useCallback(
    () => loadAndRememberActiveExercise(id, workoutExerciseId),
    [id, workoutExerciseId],
  );
  return (
    <ActiveExerciseLoggingScreen
      completeSet={completeCurrentUserSet}
      deleteSet={deleteCurrentUserSet}
      editSet={editCurrentUserSet}
      loadExercise={loadExercise}
      onAskCoach={() => router.push(`/workout/${id}/coach?workoutExerciseId=${workoutExerciseId}`)}
      onOpenExercise={(nextWorkoutExerciseId) => {
        router.replace(`/workout/${id}/exercise/${nextWorkoutExerciseId}`);
      }}
      onOverview={() => router.replace(`/workout/${id}`)}
      parseWorkout={(request) => workoutParserApi.parse(request)}
      undoSet={undoCurrentUserSetCompletion}
    />
  );
}
