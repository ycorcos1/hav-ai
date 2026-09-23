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
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function ActiveExerciseLoggingRoute() {
  const { id, workoutExerciseId } = useLocalSearchParams<{
    id: string;
    workoutExerciseId: string;
  }>();
  const router = useRouter();
  const goBack = useSafeBack(`/workout/${id}`);
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
      onOverview={goBack}
      parseWorkout={(request) => workoutParserApi.parse(request)}
      undoSet={undoCurrentUserSetCompletion}
    />
  );
}
