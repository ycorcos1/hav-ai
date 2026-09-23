import { useRouter } from "expo-router";

import { WorkoutHistoryScreen } from "@/features/workouts/screens/WorkoutHistoryScreen";
import { loadCurrentUserWorkoutHistory } from "@/features/workouts/services/workoutApplication";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function WorkoutHistoryRoute() {
  const router = useRouter();
  const goBack = useSafeBack('/workouts');
  return (
    <WorkoutHistoryScreen
      loadPage={(cursor) => loadCurrentUserWorkoutHistory(cursor)}
      onBack={goBack}
      onOpenWorkout={(id) => router.push(`/workout/history/${id}`)}
    />
  );
}
