import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { WorkoutHistoryDetailScreen } from "@/features/workouts/screens/WorkoutHistoryDetailScreen";
import {
  deleteCurrentUserHistoricalWorkout,
  editCurrentUserHistoricalSet,
  loadCurrentUserWorkoutHistoryDetail,
} from "@/features/workouts/services/workoutApplication";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function WorkoutHistoryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSafeBack('/workout/history');
  const loadWorkout = useCallback(() => loadCurrentUserWorkoutHistoryDetail(id), [id]);
  return (
    <WorkoutHistoryDetailScreen
      deleteWorkout={() => deleteCurrentUserHistoricalWorkout(id)}
      editSet={editCurrentUserHistoricalSet}
      loadWorkout={loadWorkout}
      onBack={goBack}
      onDeleted={() => router.replace("/workout/history")}
    />
  );
}
