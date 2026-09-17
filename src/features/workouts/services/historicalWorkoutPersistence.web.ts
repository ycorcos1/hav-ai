import { browserWebPreviewStorage, type WebPreviewStorage } from "@/db/webPreview/storage";
import {
  enqueueWorkoutWebPreviewDelete,
  readWorkoutWebPreviewState,
  removeWorkoutWebPreviewMutation,
  writeWorkoutWebPreviewState,
} from "@/db/webPreview/workoutStorage";

import type {
  HistoricalWorkoutDeleteResult,
  HistoricalWorkoutPersistence,
} from "./historicalWorkoutPersistenceTypes";

export class WebPreviewHistoricalWorkoutPersistence implements HistoricalWorkoutPersistence {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async deleteCompletedWorkout(
    userId: string,
    workoutId: string,
    deletedAt: string,
  ): Promise<HistoricalWorkoutDeleteResult> {
    const state = readWorkoutWebPreviewState(this.storage);
    const workout = state.workouts.find(({ id }) => id === workoutId);
    if (!workout || workout.userId !== userId || workout.status !== "completed") {
      return { exerciseIds: [], status: "missing" };
    }
    const cloudKnown = state.workoutSyncMetadata?.[workoutId]?.cloudKnown ?? true;
    state.workouts = state.workouts.filter(({ id }) => id !== workoutId);
    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        removeWorkoutWebPreviewMutation(state, "set", set.id);
        delete state.setSyncMetadata[set.id];
      });
      removeWorkoutWebPreviewMutation(state, "workout_exercise", exercise.id);
    });
    removeWorkoutWebPreviewMutation(state, "workout", workoutId);
    if (cloudKnown) enqueueWorkoutWebPreviewDelete(state, "workout", workoutId, deletedAt);
    if (state.workoutSyncMetadata) delete state.workoutSyncMetadata[workoutId];
    state.recommendations = state.recommendations.map((recommendation) => ({
      ...recommendation,
      ...(recommendation.sourceWorkoutId === workoutId ? { sourceWorkoutId: undefined } : {}),
      ...(workout.exercises.some(({ id }) => id === recommendation.sourceWorkoutExerciseId)
        ? { sourceWorkoutExerciseId: undefined }
        : {}),
    }));
    writeWorkoutWebPreviewState(this.storage, state);
    return {
      exerciseIds: [...new Set(workout.exercises.map(({ exerciseId }) => exerciseId))],
      status: cloudKnown ? "queued-delete" : "deleted-local",
    };
  }
}

export async function createHistoricalWorkoutPersistence(): Promise<HistoricalWorkoutPersistence> {
  return new WebPreviewHistoricalWorkoutPersistence();
}
