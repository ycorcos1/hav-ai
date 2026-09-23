import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { ExerciseProgressScreen } from "@/features/progress/screens/ExerciseProgressScreen";
import { loadCurrentUserExerciseProgress } from "@/features/progress/services/progressApplication";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function ExerciseProgressRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useSafeBack('/progress');
  const loadProgress = useCallback(() => loadCurrentUserExerciseProgress(id), [id]);
  return <ExerciseProgressScreen loadProgress={loadProgress} onBack={goBack} />;
}
