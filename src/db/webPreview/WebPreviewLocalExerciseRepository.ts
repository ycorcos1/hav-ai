import type { LocalExerciseRepository } from "@/db/repositories/types";
import type { Exercise } from "@/shared/contracts";

import {
  browserWebPreviewStorage,
  readExerciseWebPreviewState,
  type WebPreviewStorage,
  writeExerciseWebPreviewState,
} from "./storage";

export class WebPreviewLocalExerciseRepository implements LocalExerciseRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async getById(userId: string, id: string): Promise<Exercise | null> {
    return this.accessibleExercises(userId).find((exercise) => exercise.id === id) ?? null;
  }

  async listAccessible(userId: string): Promise<Exercise[]> {
    return this.accessibleExercises(userId)
      .filter((exercise) => !exercise.isArchived)
      .sort(compareExerciseNames);
  }

  async search(userId: string, query: string): Promise<Exercise[]> {
    const normalizedQuery = query.toLocaleLowerCase();
    return (await this.listAccessible(userId)).filter((exercise) =>
      exercise.name.toLocaleLowerCase().includes(normalizedQuery));
  }

  async upsert(exercise: Exercise): Promise<void> {
    const state = readExerciseWebPreviewState(this.storage);
    const index = state.exercises.findIndex((stored) => stored.id === exercise.id);

    if (index >= 0 && !mayReplace(state.exercises[index], exercise)) return;
    if (index >= 0) state.exercises[index] = exercise;
    else state.exercises.push(exercise);

    writeExerciseWebPreviewState(this.storage, state);
  }

  async archiveCustomExercise(userId: string, id: string): Promise<void> {
    const state = readExerciseWebPreviewState(this.storage);
    const index = state.exercises.findIndex((exercise) =>
      exercise.id === id && exercise.ownerUserId === userId && !exercise.isSystem);
    if (index < 0) return;

    state.exercises[index] = { ...state.exercises[index], isArchived: true };
    writeExerciseWebPreviewState(this.storage, state);
  }

  private accessibleExercises(userId: string): Exercise[] {
    return readExerciseWebPreviewState(this.storage).exercises.filter((exercise) =>
      exercise.isSystem || exercise.ownerUserId === userId);
  }
}

function mayReplace(current: Exercise, replacement: Exercise): boolean {
  if (current.isSystem || replacement.isSystem) return current.isSystem && replacement.isSystem;
  return current.ownerUserId === replacement.ownerUserId;
}

function compareExerciseNames(left: Exercise, right: Exercise): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}
