import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { WorkoutHistoryDetailScreen } from "@/features/workouts/screens/WorkoutHistoryDetailScreen";
import {
  deleteCurrentUserHistoricalWorkout,
  editCurrentUserHistoricalSet,
  loadCurrentUserWorkoutHistoryDetail,
} from "@/features/workouts/services/workoutApplication";

export default function WorkoutHistoryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loadWorkout = useCallback(() => loadCurrentUserWorkoutHistoryDetail(id), [id]);
  return (
    <WorkoutHistoryDetailScreen
      deleteWorkout={() => deleteCurrentUserHistoricalWorkout(id)}
      editSet={editCurrentUserHistoricalSet}
      loadWorkout={loadWorkout}
      onDeleted={() => router.replace("/workout/history")}
    />
  );
}
