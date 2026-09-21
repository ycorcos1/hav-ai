import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { recommendationExplanationApi } from "@/features/ai/api";
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
      loadAIExplanation={(recommendationId) => recommendationExplanationApi.explain({
        recommendationId,
      })}
      loadSummary={loadSummary}
      onDone={() => router.replace("/home")}
    />
  );
}
