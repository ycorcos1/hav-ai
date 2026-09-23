import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { ActiveWorkoutOverviewScreen } from "@/features/workouts/screens/ActiveWorkoutOverviewScreen";
import {
  addCurrentUserActiveWorkoutExercise,
  finishCurrentUserWorkout,
  moveCurrentUserActiveWorkoutExercise,
  removeCurrentUserActiveWorkoutExercise,
  updateCurrentUserActiveWorkoutNote,
} from "@/features/workouts/services/workoutApplication";
import { loadExerciseLibrary } from "@/features/exercises/services/loadExerciseLibrary";
import { loadExercisePreferences } from "@/features/exercises/services/loadExercisePreferences";
import { loadRecoveryWorkoutOverview } from "@/features/workouts/services/workoutRecoveryContext";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function ActiveWorkoutOverviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSafeBack('/home');
  const loadWorkout = useCallback(() => loadRecoveryWorkoutOverview(id), [id]);
  return (
    <ActiveWorkoutOverviewScreen
      addExercise={(exerciseId) => addCurrentUserActiveWorkoutExercise(id, exerciseId)}
      loadWorkout={loadWorkout}
      loadExercises={loadExerciseLibrary}
      loadPreferences={loadExercisePreferences}
      finishWorkout={() => finishCurrentUserWorkout({
        workoutId: id,
        completedAt: new Date().toISOString(),
      })}
      onOpenExercise={(workoutExerciseId) => {
        router.push(`/workout/${id}/exercise/${workoutExerciseId}`);
      }}
      onBack={goBack}
      onWorkoutFinished={() => router.replace(`/workout/${id}/summary`)}
      moveExercise={(workoutExerciseId, direction) => (
        moveCurrentUserActiveWorkoutExercise(id, workoutExerciseId, direction)
      )}
      removeExercise={(workoutExerciseId) => (
        removeCurrentUserActiveWorkoutExercise(id, workoutExerciseId)
      )}
      saveWorkoutNote={(notes) => updateCurrentUserActiveWorkoutNote({ workoutId: id, notes })}
    />
  );
}
