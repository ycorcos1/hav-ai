import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { WorkoutSummaryScreen } from "@/features/workouts/screens/WorkoutSummaryScreen";
import { loadCurrentUserCompletedWorkoutSummary } from "@/features/workouts/services/workoutApplication";

export default function WorkoutSummaryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loadSummary = useCallback(
    () => loadCurrentUserCompletedWorkoutSummary(id),
    [id],
  );
  return (
    <WorkoutSummaryScreen
      loadSummary={loadSummary}
      onDone={() => router.replace("/home")}
    />
  );
}
