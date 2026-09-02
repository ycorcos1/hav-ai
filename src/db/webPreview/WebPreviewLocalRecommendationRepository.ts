import type { LocalRecommendationRepository } from "@/db/repositories/types";
import type { ProgressionRecommendation } from "@/shared/contracts";

import { browserWebPreviewStorage, type WebPreviewStorage } from "./storage";
import { readWorkoutWebPreviewState, writeWorkoutWebPreviewState } from "./workoutStorage";

export class WebPreviewLocalRecommendationRepository implements LocalRecommendationRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async getById(userId: string, id: string): Promise<ProgressionRecommendation | null> {
    return readWorkoutWebPreviewState(this.storage).recommendations.find((item) =>
      item.id === id && item.userId === userId) ?? null;
  }

  async getActiveForExercise(userId: string, exerciseId: string): Promise<ProgressionRecommendation | null> {
    return readWorkoutWebPreviewState(this.storage).recommendations
      .filter((item) => item.userId === userId && item.exerciseId === exerciseId && item.status === "active")
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
  }

  async upsert(recommendation: ProgressionRecommendation): Promise<void> {
    const state = readWorkoutWebPreviewState(this.storage);
    const index = state.recommendations.findIndex(({ id }) => id === recommendation.id);
    if (index >= 0 && state.recommendations[index].userId !== recommendation.userId) return;
    if (index >= 0) state.recommendations[index] = recommendation;
    else state.recommendations.push(recommendation);
    writeWorkoutWebPreviewState(this.storage, state);
  }

  async markConsumed(userId: string, id: string, consumedAt: string): Promise<void> {
    await this.updateStatus(userId, id, "consumed", consumedAt);
  }

  async supersede(userId: string, id: string): Promise<void> {
    await this.updateStatus(userId, id, "superseded", new Date().toISOString());
  }

  private async updateStatus(
    userId: string,
    id: string,
    status: "consumed" | "superseded",
    updatedAt: string,
  ): Promise<void> {
    const state = readWorkoutWebPreviewState(this.storage);
    const index = state.recommendations.findIndex((item) => item.id === id && item.userId === userId);
    if (index < 0) return;
    state.recommendations[index] = {
      ...state.recommendations[index],
      status,
      ...(status === "consumed" ? { consumedAt: updatedAt } : {}),
      updatedAt,
    };
    writeWorkoutWebPreviewState(this.storage, state);
  }
}
