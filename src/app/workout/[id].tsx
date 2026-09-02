import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { ActiveWorkoutOverviewScreen } from "@/features/workouts/screens/ActiveWorkoutOverviewScreen";
import { loadCurrentUserWorkoutOverview } from "@/features/workouts/services/workoutApplication";

export default function ActiveWorkoutOverviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loadWorkout = useCallback(() => loadCurrentUserWorkoutOverview(id), [id]);
  return <ActiveWorkoutOverviewScreen loadWorkout={loadWorkout} />;
}
