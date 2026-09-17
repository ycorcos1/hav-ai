import type { ExerciseHistoryRepository, ProgressHistoryRepository } from "@/db/repositories/types";
import { calculateEpleyOneRepMax } from "@/features/metrics";
import type { ExerciseSessionPerformance, WorkoutSet } from "@/shared/contracts";

import { browserWebPreviewStorage, type WebPreviewStorage } from "./storage";
import { readWorkoutWebPreviewState } from "./workoutStorage";

export class WebPreviewExerciseHistoryRepository implements ExerciseHistoryRepository, ProgressHistoryRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async getRecentSessions({
    userId,
    exerciseId,
    limit,
  }: Parameters<ExerciseHistoryRepository["getRecentSessions"]>[0]): Promise<ExerciseSessionPerformance[]> {
    if (limit <= 0) return [];
    return readWorkoutWebPreviewState(this.storage).workouts
      .filter((workout) => workout.userId === userId
        && workout.status === "completed"
        && workout.completedAt !== undefined)
      .sort((left, right) => right.completedAt!.localeCompare(left.completedAt!))
      .map((workout) => ({
        workoutId: workout.id,
        completedAt: workout.completedAt!,
        sets: workout.exercises
          .filter((exercise) => exercise.exerciseId === exerciseId)
          .sort((left, right) => left.position - right.position)
          .flatMap((exercise) => [...exercise.sets]
            .filter((set) => set.setType === "working")
            .sort((left, right) => left.position - right.position)
            .map((set) => ({
              ...(set.weightKg !== undefined ? { weightKg: set.weightKg } : {}),
              reps: set.reps,
              ...(set.rpe !== undefined ? { rpe: set.rpe } : {}),
            }))),
      }))
      .filter(({ sets }) => sets.length > 0)
      .slice(0, limit);
  }

  async getBestSet({
    userId,
    exerciseId,
  }: Parameters<ExerciseHistoryRepository["getBestSet"]>[0]): Promise<WorkoutSet | null> {
    const candidates = readWorkoutWebPreviewState(this.storage).workouts
      .filter((workout) => workout.userId === userId && workout.status === "completed")
      .flatMap((workout) => workout.exercises)
      .filter((exercise) => exercise.exerciseId === exerciseId)
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.setType === "working")
      .sort(compareSets);
    return candidates[0] ?? null;
  }

  async getBestEstimatedOneRepMaxSet({
    userId,
    exerciseId,
  }: Parameters<ProgressHistoryRepository["getBestEstimatedOneRepMaxSet"]>[0]): Promise<WorkoutSet | null> {
    return this.completedWorkingSets(userId, exerciseId)
      .filter(({ weightKg, reps }) => (
        weightKg !== undefined && calculateEpleyOneRepMax(weightKg, reps) !== null
      ))
      .sort((left, right) => (
        estimate(right) - estimate(left)
        || right.completedAt.localeCompare(left.completedAt)
        || left.id.localeCompare(right.id)
      ))[0] ?? null;
  }

  async getCurrentPersonalRecordCandidates({
    userId,
    exerciseIds,
  }: Parameters<ProgressHistoryRepository["getCurrentPersonalRecordCandidates"]>[0]): Promise<WorkoutSet[]> {
    const candidates: WorkoutSet[] = [];
    for (const exerciseId of [...new Set(exerciseIds)]) {
      const [bestWeight, bestEstimated] = await Promise.all([
        this.getBestSet({ userId, exerciseId }),
        this.getBestEstimatedOneRepMaxSet({ userId, exerciseId }),
      ]);
      if (bestWeight) candidates.push(bestWeight);
      if (bestEstimated && bestEstimated.id !== bestWeight?.id) candidates.push(bestEstimated);
    }
    return candidates;
  }

  async getCompletedSetsForExercises({
    userId,
    exerciseIds,
    excludeWorkoutId,
  }: Parameters<ExerciseHistoryRepository["getCompletedSetsForExercises"]>[0]): Promise<WorkoutSet[]> {
    const allowedExercises = new Set(exerciseIds);
    return readWorkoutWebPreviewState(this.storage).workouts
      .filter((workout) => workout.userId === userId
        && workout.status === "completed"
        && workout.id !== excludeWorkoutId)
      .sort((left, right) => (
        (left.completedAt ?? "").localeCompare(right.completedAt ?? "")
        || left.id.localeCompare(right.id)
      ))
      .flatMap((workout) => workout.exercises
        .filter(({ exerciseId }) => allowedExercises.has(exerciseId))
        .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
        .flatMap(({ sets }) => [...sets]
          .filter(({ setType }) => setType === "working")
          .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))));
  }

  private completedWorkingSets(userId: string, exerciseId: string): WorkoutSet[] {
    return readWorkoutWebPreviewState(this.storage).workouts
      .filter((workout) => workout.userId === userId && workout.status === "completed")
      .flatMap((workout) => workout.exercises)
      .filter((exercise) => exercise.exerciseId === exerciseId)
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.setType === "working");
  }
}

function compareSets(left: WorkoutSet, right: WorkoutSet): number {
  return (right.weightKg ?? 0) - (left.weightKg ?? 0)
    || right.reps - left.reps
    || right.completedAt.localeCompare(left.completedAt);
}

function estimate(set: WorkoutSet): number {
  return set.weightKg === undefined
    ? 0
    : calculateEpleyOneRepMax(set.weightKg, set.reps)?.estimated1RMKg ?? 0;
}
