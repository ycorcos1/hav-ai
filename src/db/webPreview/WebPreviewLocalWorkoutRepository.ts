import type { LocalWorkoutRepository } from "@/db/repositories/types";
import type { Workout } from "@/shared/contracts";

import { browserWebPreviewStorage, type WebPreviewStorage } from "./storage";
import {
  readWorkoutWebPreviewState,
  enqueueWorkoutWebPreviewMutation,
  writeWorkoutWebPreviewState,
  type WorkoutWebPreviewState,
} from "./workoutStorage";

export class WebPreviewLocalWorkoutRepository implements LocalWorkoutRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async getById(userId: string, id: string): Promise<Workout | null> {
    return readWorkoutWebPreviewState(this.storage).workouts.find((item) =>
      item.id === id && item.userId === userId) ?? null;
  }

  async getActiveForUser(userId: string): Promise<Workout | null> {
    return readWorkoutWebPreviewState(this.storage).workouts
      .filter((item) => item.userId === userId && item.status === "active")
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ?? null;
  }

  async create(workout: Workout): Promise<void> {
    this.validateAggregate(workout);
    const state = readWorkoutWebPreviewState(this.storage);
    const active = state.workouts.find((item) => item.userId === workout.userId && item.status === "active");
    if (active && active.id !== workout.id) {
      throw new Error("An active workout already exists for this user.");
    }
    const existing = state.workouts.find(({ id }) => id === workout.id);
    if (existing && existing.userId !== workout.userId) return;
    this.consumeRecommendations(state, workout);
    if (existing) state.workouts[state.workouts.indexOf(existing)] = workout;
    else state.workouts.push(workout);
    enqueueWorkoutWebPreviewMutation(state, "workout", workout.id, workout.createdAt);
    workout.exercises.forEach((exercise) => {
      enqueueWorkoutWebPreviewMutation(state, "workout_exercise", exercise.id, exercise.createdAt);
      if (exercise.sourceRecommendationId) {
        enqueueWorkoutWebPreviewMutation(state, "progression_recommendation", exercise.sourceRecommendationId, workout.createdAt);
      }
    });
    writeWorkoutWebPreviewState(this.storage, state);
  }

  async update(workout: Workout): Promise<void> {
    this.validateAggregate(workout);
    const state = readWorkoutWebPreviewState(this.storage);
    const index = state.workouts.findIndex(({ id }) => id === workout.id);
    if (index < 0 || state.workouts[index].userId !== workout.userId) return;
    state.workouts[index] = workout;
    enqueueWorkoutWebPreviewMutation(state, "workout", workout.id, workout.updatedAt);
    workout.exercises.forEach((exercise) => enqueueWorkoutWebPreviewMutation(
      state,
      "workout_exercise",
      exercise.id,
      workout.updatedAt,
    ));
    writeWorkoutWebPreviewState(this.storage, state);
  }

  async delete(userId: string, id: string): Promise<void> {
    const state = readWorkoutWebPreviewState(this.storage);
    state.workouts = state.workouts.filter((item) => item.id !== id || item.userId !== userId);
    writeWorkoutWebPreviewState(this.storage, state);
  }

  private consumeRecommendations(state: WorkoutWebPreviewState, workout: Workout): void {
    workout.exercises.forEach((exercise) => {
      if (!exercise.sourceRecommendationId) return;
      const index = state.recommendations.findIndex(({ id }) => id === exercise.sourceRecommendationId);
      const recommendation = state.recommendations[index];
      if (
        !recommendation
        || recommendation.userId !== workout.userId
        || recommendation.exerciseId !== exercise.exerciseId
        || recommendation.status !== "active"
      ) {
        throw new Error("Workout recommendation snapshot is not active or accessible.");
      }
      state.recommendations[index] = {
        ...recommendation,
        status: "consumed",
        consumedAt: workout.startedAt,
        updatedAt: workout.startedAt,
      };
    });
  }

  private validateAggregate(workout: Workout): void {
    if (workout.exercises.some((exercise) =>
      exercise.userId !== workout.userId || exercise.workoutId !== workout.id)) {
      throw new Error("Workout exercise ownership or ancestry does not match its workout.");
    }
  }
}
