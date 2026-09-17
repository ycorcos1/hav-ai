import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { WorkoutHistoryDetailScreen } from "@/features/workouts/screens/WorkoutHistoryDetailScreen";
import { loadCurrentUserWorkoutHistoryDetail } from "@/features/workouts/services/workoutApplication";

export default function WorkoutHistoryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loadWorkout = useCallback(() => loadCurrentUserWorkoutHistoryDetail(id), [id]);
  return <WorkoutHistoryDetailScreen loadWorkout={loadWorkout} />;
}
