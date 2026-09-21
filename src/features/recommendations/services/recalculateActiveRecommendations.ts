import type {
  LocalRecommendationRepository,
  WorkoutHistoryRepository,
} from "@/db/repositories";
import type { UUID, Workout, WorkoutExercise } from "@/shared/contracts";

import {
  generateExerciseRecommendation,
  type GenerateWorkoutRecommendationsDependencies,
} from "./generateWorkoutRecommendations";

export type RecalculateActiveRecommendationsDependencies =
  GenerateWorkoutRecommendationsDependencies & {
    recommendationRepository: LocalRecommendationRepository;
    workoutHistoryRepository: WorkoutHistoryRepository;
  };

export async function recalculateActiveRecommendations(
  dependencies: RecalculateActiveRecommendationsDependencies,
  userId: UUID,
  now: string = new Date().toISOString(),
): Promise<void> {
  const latestByExercise = await loadLatestCompletedExercises(
    dependencies.workoutHistoryRepository,
    userId,
  );

  for (const { workout, workoutExercise } of latestByExercise.values()) {
    const recommendation = await generateExerciseRecommendation(
      dependencies,
      workout,
      workoutExercise,
    );
    if (recommendation) {
      await dependencies.recommendationRepository.upsert({
        ...recommendation,
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    const active = await dependencies.recommendationRepository.getActiveForExercise(
      userId,
      workoutExercise.exerciseId,
    );
    if (active) await dependencies.recommendationRepository.supersede(userId, active.id);
  }
}

async function loadLatestCompletedExercises(
  repository: WorkoutHistoryRepository,
  userId: UUID,
): Promise<Map<UUID, { workout: Workout; workoutExercise: WorkoutExercise }>> {
  const latest = new Map<UUID, { workout: Workout; workoutExercise: WorkoutExercise }>();
  let cursor: Awaited<ReturnType<WorkoutHistoryRepository["listCompleted"]>>["nextCursor"];

  do {
    const page = await repository.listCompleted({ userId, limit: 100, cursor });
    for (const workout of page.items) {
      for (const workoutExercise of workout.exercises) {
        if (!latest.has(workoutExercise.exerciseId)) {
          latest.set(workoutExercise.exerciseId, { workout, workoutExercise });
        }
      }
    }
    cursor = page.nextCursor;
  } while (cursor);

  return latest;
}
