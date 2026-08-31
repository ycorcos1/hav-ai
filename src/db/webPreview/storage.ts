import type { Exercise, UserExercisePreference } from "@/shared/contracts";

export const webPreviewStoragePrefix = "havai:dev:";
export const exerciseWebPreviewStorageKey = `${webPreviewStoragePrefix}exercise-persistence:v1`;

export interface WebPreviewStorage {
  getItem(key: string): string | null;
  key(index: number): string | null;
  readonly length: number;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export type ExerciseWebPreviewState = {
  exercises: Exercise[];
  preferences: UserExercisePreference[];
  version: 1;
};

const emptyState = (): ExerciseWebPreviewState => ({
  exercises: [],
  preferences: [],
  version: 1,
});

export function browserWebPreviewStorage(): WebPreviewStorage {
  if (typeof globalThis.localStorage === "undefined") {
    throw new Error("The development web preview requires browser localStorage.");
  }

  return globalThis.localStorage;
}

export function readExerciseWebPreviewState(
  storage: WebPreviewStorage,
): ExerciseWebPreviewState {
  const serialized = storage.getItem(exerciseWebPreviewStorageKey);
  if (!serialized) return emptyState();

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isExerciseWebPreviewState(parsed)) throw new Error("Invalid preview state.");
    return parsed;
  } catch {
    throw new Error("The development exercise preview data could not be read.");
  }
}

export function writeExerciseWebPreviewState(
  storage: WebPreviewStorage,
  state: ExerciseWebPreviewState,
): void {
  try {
    storage.setItem(exerciseWebPreviewStorageKey, JSON.stringify(state));
  } catch {
    throw new Error("The development exercise preview data could not be saved.");
  }
}

export function resetHavAIWebPreviewData(
  storage: WebPreviewStorage = browserWebPreviewStorage(),
): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(webPreviewStoragePrefix)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

function isExerciseWebPreviewState(value: unknown): value is ExerciseWebPreviewState {
  if (!isRecord(value) || value.version !== 1) return false;
  if (!Array.isArray(value.exercises) || !value.exercises.every(isExercise)) return false;
  return Array.isArray(value.preferences) && value.preferences.every(isPreference);
}

function isExercise(value: unknown): value is Exercise {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.primaryMuscleGroup === "string"
    && Array.isArray(value.secondaryMuscleGroups)
    && value.secondaryMuscleGroups.every((group) => typeof group === "string")
    && typeof value.equipmentType === "string"
    && typeof value.measurementType === "string"
    && typeof value.isSystem === "boolean"
    && typeof value.isArchived === "boolean"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && (value.ownerUserId === undefined || typeof value.ownerUserId === "string");
}

function isPreference(value: unknown): value is UserExercisePreference {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.userId === "string"
    && typeof value.exerciseId === "string"
    && typeof value.isFavorite === "boolean"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && (value.notes === undefined || typeof value.notes === "string")
    && (value.restDurationSeconds === undefined
      || (typeof value.restDurationSeconds === "number" && value.restDurationSeconds > 0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
