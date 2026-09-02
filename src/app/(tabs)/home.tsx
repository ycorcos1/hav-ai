import { useRouter } from "expo-router";

import { HomeScreen } from '@/features/home/screens/HomeScreen';
import {
  discardCurrentUserActiveWorkout,
  loadCurrentUserWorkoutHome,
  requestCurrentUserWorkoutStart,
} from "@/features/workouts/services/workoutApplication";

export default function HomeRoute() {
  const router = useRouter();
  return (
    <HomeScreen
      discardActiveWorkout={discardCurrentUserActiveWorkout}
      loadHome={loadCurrentUserWorkoutHome}
      onOpenWorkout={(workoutId) => router.push(`/workout/${workoutId}`)}
      startWorkout={requestCurrentUserWorkoutStart}
    />
  );
}
