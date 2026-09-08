import type {
  ProgressionRecommendation,
  SyncEntityType,
  SyncQueueItem,
  Workout,
  WorkoutSet,
} from "@/shared/contracts";

import {
  browserWebPreviewStorage,
  type WebPreviewStorage,
  webPreviewStoragePrefix,
} from "./storage";

export const workoutWebPreviewStorageKey = `${webPreviewStoragePrefix}workout-persistence:v1`;

export type WorkoutWebPreviewState = {
  deletedSets: WorkoutSet[];
  queue: SyncQueueItem[];
  recommendations: ProgressionRecommendation[];
  setSyncMetadata: Record<string, WebPreviewSetSyncMetadata>;
  version: 1;
  workouts: Workout[];
};

export type WebPreviewSetSyncMetadata = {
  cloudKnown: boolean;
};

export function readWorkoutWebPreviewState(
  storage: WebPreviewStorage = browserWebPreviewStorage(),
): WorkoutWebPreviewState {
  const serialized = storage.getItem(workoutWebPreviewStorageKey);
  if (!serialized) {
    return {
      deletedSets: [],
      queue: [],
      recommendations: [],
      setSyncMetadata: {},
      version: 1,
      workouts: [],
    };
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isWorkoutState(parsed)) throw new Error("Invalid preview state.");
    const state: WorkoutWebPreviewState = {
      ...parsed,
      deletedSets: parsed.deletedSets ?? [],
      setSyncMetadata: parsed.setSyncMetadata ?? {},
    };
    normalizeLegacySetSyncMetadata(state);
    return state;
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

export function enqueueWorkoutWebPreviewMutation(
  state: WorkoutWebPreviewState,
  entityType: SyncEntityType,
  entityId: string,
  createdAt: string,
): void {
  const existing = state.queue.find(
    (item) => item.entityType === entityType && item.entityId === entityId,
  );
  if (existing) {
    existing.operation = "upsert";
    existing.attemptCount = 0;
    delete existing.lastAttemptAt;
    delete existing.lastError;
    return;
  }
  state.queue.push({
    id: createUuid(),
    entityType,
    entityId,
    operation: "upsert",
    attemptCount: 0,
    createdAt,
  });
}

export function enqueueWorkoutWebPreviewDelete(
  state: WorkoutWebPreviewState,
  entityType: SyncEntityType,
  entityId: string,
  createdAt: string,
): void {
  const existing = state.queue.find(
    (item) => item.entityType === entityType && item.entityId === entityId,
  );
  if (existing) {
    existing.operation = "delete";
    existing.attemptCount = 0;
    delete existing.lastAttemptAt;
    delete existing.lastError;
    return;
  }
  state.queue.push({
    id: createUuid(),
    entityType,
    entityId,
    operation: "delete",
    attemptCount: 0,
    createdAt,
  });
}

export function removeWorkoutWebPreviewMutation(
  state: WorkoutWebPreviewState,
  entityType: SyncEntityType,
  entityId: string,
): void {
  state.queue = state.queue.filter(
    (item) => item.entityType !== entityType || item.entityId !== entityId,
  );
}

export function markWorkoutWebPreviewSetCloudKnown(
  state: WorkoutWebPreviewState,
  setId: string,
): void {
  if (!hasSet(state, setId)) return;
  state.setSyncMetadata[setId] = { cloudKnown: true };
}

function isWorkoutState(value: unknown): value is WorkoutWebPreviewState {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.workouts)
    && value.workouts.every(isWorkout)
    && (value.deletedSets === undefined
      || (Array.isArray(value.deletedSets) && value.deletedSets.every(isSet)))
    && (value.setSyncMetadata === undefined || isSetSyncMetadata(value.setSyncMetadata))
    && Array.isArray(value.recommendations)
    && value.recommendations.every(isRecommendation)
    && Array.isArray(value.queue)
    && value.queue.every(isQueueItem);
}

function normalizeLegacySetSyncMetadata(state: WorkoutWebPreviewState): void {
  for (const workout of state.workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        state.setSyncMetadata[set.id] ??= { cloudKnown: true };
      }
    }
  }
  for (const set of state.deletedSets) {
    state.setSyncMetadata[set.id] ??= { cloudKnown: true };
  }
}

function hasSet(state: WorkoutWebPreviewState, setId: string): boolean {
  return state.deletedSets.some(({ id }) => id === setId)
    || state.workouts.some(({ exercises }) => exercises.some(({ sets }) => (
      sets.some(({ id }) => id === setId)
    )));
}

function isSetSyncMetadata(value: unknown): value is Record<string, WebPreviewSetSyncMetadata> {
  return isRecord(value) && Object.values(value).every(
    (metadata) => isRecord(metadata) && typeof metadata.cloudKnown === "boolean",
  );
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
      && Array.isArray(exercise.sets)
      && exercise.sets.every(isSet));
}

function isSet(value: unknown): value is WorkoutSet {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.userId === "string"
    && typeof value.workoutId === "string"
    && typeof value.workoutExerciseId === "string"
    && typeof value.exerciseId === "string"
    && typeof value.position === "number"
    && (value.setType === "working" || value.setType === "warmup")
    && (value.weightKg === undefined || typeof value.weightKg === "number")
    && typeof value.reps === "number"
    && (value.rpe === undefined || typeof value.rpe === "number")
    && (value.notes === undefined || typeof value.notes === "string")
    && typeof value.completedAt === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
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

function createUuid(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
