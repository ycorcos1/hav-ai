import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { HomeScreen } from '@/features/home/screens/HomeScreen';
import {
  discardCurrentUserActiveWorkout,
  loadCurrentUserWorkoutHome,
  requestCurrentUserWorkoutStart,
} from "@/features/workouts/services/workoutApplication";

export default function HomeRoute() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const hasFocused = useRef(false);

  useFocusEffect(useCallback(() => {
    if (hasFocused.current) {
      setRefreshKey((current) => current + 1);
    } else {
      hasFocused.current = true;
    }
  }, []));

  return (
    <HomeScreen
      discardActiveWorkout={discardCurrentUserActiveWorkout}
      loadHome={loadCurrentUserWorkoutHome}
      onCreateTemplate={() => router.push('/template/new')}
      onOpenHistoryWorkout={(workoutId) => router.push(`/workout/history/${workoutId}`)}
      onOpenWorkout={(workoutId) => router.push(`/workout/${workoutId}`)}
      refreshKey={refreshKey}
      startWorkout={requestCurrentUserWorkoutStart}
    />
  );
}
