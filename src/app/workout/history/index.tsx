import { useRouter } from "expo-router";

import { WorkoutHistoryScreen } from "@/features/workouts/screens/WorkoutHistoryScreen";
import { loadCurrentUserWorkoutHistory } from "@/features/workouts/services/workoutApplication";

export default function WorkoutHistoryRoute() {
  const router = useRouter();
  return (
    <WorkoutHistoryScreen
      loadPage={(cursor) => loadCurrentUserWorkoutHistory(cursor)}
      onOpenWorkout={(id) => router.push(`/workout/history/${id}`)}
    />
  );
}
