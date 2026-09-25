import { useRef, useState } from "react";
import { Alert } from "react-native";

import type { StartWorkoutResult } from "@/features/workouts/services/startWorkout";

export type StartWorkoutFlowOptions = {
  discardActiveWorkout: (workoutId: string) => Promise<void>;
  onOpenWorkout: (workoutId: string) => void;
  startWorkout: (templateId: string) => Promise<StartWorkoutResult>;
};

export function useStartWorkoutFlow({
  discardActiveWorkout,
  onOpenWorkout,
  startWorkout,
}: StartWorkoutFlowOptions) {
  const [startError, setStartError] = useState(false);
  const [startingTemplateId, setStartingTemplateId] = useState<string>();
  const startPending = useRef(false);

  async function executeStart(templateId: string): Promise<StartWorkoutResult | undefined> {
    if (startPending.current) return;
    startPending.current = true;
    setStartError(false);
    setStartingTemplateId(templateId);
    try {
      const result = await startWorkout(templateId);
      if (result.status === "started") onOpenWorkout(result.workout.id);
      return result;
    } catch {
      setStartError(true);
      return undefined;
    } finally {
      startPending.current = false;
      setStartingTemplateId(undefined);
    }
  }

  function presentActiveWorkoutChoices(
    result: Extract<StartWorkoutResult, { status: "active_workout_exists" }>,
    templateId: string,
  ): void {
    showActiveWorkoutChoices(result, {
      discard: async () => {
        try {
          await discardActiveWorkout(result.activeWorkout.id);
          const retryResult = await executeStart(templateId);
          if (retryResult?.status === "active_workout_exists") {
            presentActiveWorkoutChoices(retryResult, templateId);
          }
        } catch {
          startPending.current = false;
          setStartError(true);
          setStartingTemplateId(undefined);
        }
      },
      resume: () => onOpenWorkout(result.activeWorkout.id),
    });
  }

  async function start(templateId: string): Promise<void> {
    const result = await executeStart(templateId);
    if (result?.status === "active_workout_exists") {
      presentActiveWorkoutChoices(result, templateId);
    }
  }

  return { start, startError, startingTemplateId };
}

function showActiveWorkoutChoices(
  result: Extract<StartWorkoutResult, { status: "active_workout_exists" }>,
  actions: { discard: () => Promise<void>; resume: () => void },
): void {
  Alert.alert("Workout in progress", `${result.activeWorkout.name} is already active.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Resume", onPress: actions.resume },
    {
      text: "Discard", style: "destructive", onPress: () => Alert.alert(
        "Discard current workout?",
        "Unsaved active workout data will be discarded.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Discard Workout", style: "destructive", onPress: () => { void actions.discard(); } },
        ],
      ),
    },
  ]);
}
