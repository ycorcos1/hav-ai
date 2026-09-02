import type { ProgressionRecommendation, SyncQueueItem, Workout } from "@/shared/contracts";

import {
  browserWebPreviewStorage,
  type WebPreviewStorage,
  webPreviewStoragePrefix,
} from "./storage";

export const workoutWebPreviewStorageKey = `${webPreviewStoragePrefix}workout-persistence:v1`;

export type WorkoutWebPreviewState = {
  queue: SyncQueueItem[];
  recommendations: ProgressionRecommendation[];
  version: 1;
  workouts: Workout[];
};

export function readWorkoutWebPreviewState(
  storage: WebPreviewStorage = browserWebPreviewStorage(),
): WorkoutWebPreviewState {
  const serialized = storage.getItem(workoutWebPreviewStorageKey);
  if (!serialized) return { queue: [], recommendations: [], version: 1, workouts: [] };
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isWorkoutState(parsed)) throw new Error("Invalid preview state.");
    return parsed;
  } catch {
    throw new Error("The development workout preview data could not be read.");
  }
}

export function writeWorkoutWebPreviewState(
  storage: WebPreviewStorage,
  state: WorkoutWebPreviewState,
): void {
  try {
    storage.setItem(workoutWebPreviewStorageKey, JSON.stringify(state));
  } catch {
    throw new Error("The development workout preview data could not be saved.");
  }
}

function isWorkoutState(value: unknown): value is WorkoutWebPreviewState {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.workouts)
    && value.workouts.every(isWorkout)
    && Array.isArray(value.recommendations)
    && value.recommendations.every(isRecommendation)
    && Array.isArray(value.queue)
    && value.queue.every(isQueueItem);
}

function isWorkout(value: unknown): value is Workout {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.userId === "string"
    && typeof value.name === "string"
    && value.status !== undefined
    && typeof value.startedAt === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && Array.isArray(value.exercises)
    && value.exercises.every((exercise) => isRecord(exercise)
      && typeof exercise.id === "string"
      && typeof exercise.userId === "string"
      && typeof exercise.workoutId === "string"
      && typeof exercise.exerciseId === "string"
      && typeof exercise.position === "number"
      && Array.isArray(exercise.sets));
}

function isRecommendation(value: unknown): value is ProgressionRecommendation {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.userId === "string"
    && typeof value.exerciseId === "string"
    && typeof value.recommendationType === "string"
    && typeof value.confidence === "string"
    && Array.isArray(value.reasonCodes)
    && typeof value.status === "string"
    && typeof value.engineVersion === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}

function isQueueItem(value: unknown): value is SyncQueueItem {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.entityType === "string"
    && typeof value.entityId === "string"
    && typeof value.operation === "string"
    && typeof value.attemptCount === "number"
    && typeof value.createdAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
