import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { AppText } from "@/components/AppText";
import {
  elapsedWorkoutSeconds,
  formatWorkoutElapsedTime,
} from "@/features/workouts/services/workoutTimer";

export type WorkoutElapsedTimeProps = {
  startedAt: string;
};

export function WorkoutElapsedTime({ startedAt }: WorkoutElapsedTimeProps) {
  const [nowMilliseconds, setNowMilliseconds] = useState(Date.now);
  const elapsedTime = formatWorkoutElapsedTime(
    elapsedWorkoutSeconds(startedAt, nowMilliseconds),
  );

  useEffect(() => {
    const refresh = () => setNowMilliseconds(Date.now());
    const interval = setInterval(refresh, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return (
    <AppText accessibilityLabel={`Elapsed time ${elapsedTime}`} variant="sectionHeading">
      {elapsedTime}
    </AppText>
  );
}
