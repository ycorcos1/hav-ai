import type { LocalUserExercisePreferenceRepository } from "@/db/repositories/types";
import type { UserExercisePreference } from "@/shared/contracts";

import {
  browserWebPreviewStorage,
  readExerciseWebPreviewState,
  type WebPreviewStorage,
  writeExerciseWebPreviewState,
} from "./storage";

export class WebPreviewLocalUserExercisePreferenceRepository
implements LocalUserExercisePreferenceRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async get(userId: string, exerciseId: string): Promise<UserExercisePreference | null> {
    return readExerciseWebPreviewState(this.storage).preferences.find((preference) =>
      preference.userId === userId && preference.exerciseId === exerciseId) ?? null;
  }

  async listFavorites(userId: string): Promise<UserExercisePreference[]> {
    return readExerciseWebPreviewState(this.storage).preferences
      .filter((preference) => preference.userId === userId && preference.isFavorite)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async upsert(preference: UserExercisePreference): Promise<void> {
    const state = readExerciseWebPreviewState(this.storage);
    const exerciseIsAccessible = state.exercises.some((exercise) =>
      exercise.id === preference.exerciseId
      && (exercise.isSystem || exercise.ownerUserId === preference.userId));
    if (!exerciseIsAccessible) {
      throw new Error("Exercise preference references an inaccessible exercise.");
    }

    const index = state.preferences.findIndex((stored) =>
      stored.userId === preference.userId && stored.exerciseId === preference.exerciseId);
    if (index >= 0) state.preferences[index] = preference;
    else state.preferences.push(preference);
    writeExerciseWebPreviewState(this.storage, state);
  }

  async deleteOrTombstone(userId: string, id: string): Promise<void> {
    const state = readExerciseWebPreviewState(this.storage);
    state.preferences = state.preferences.filter((preference) =>
      preference.id !== id || preference.userId !== userId);
    writeExerciseWebPreviewState(this.storage, state);
  }
}
