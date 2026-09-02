import type { ExerciseHistoryRepository } from "@/db/repositories/types";
import { WebPreviewExerciseHistoryRepository } from "@/db/webPreview/WebPreviewExerciseHistoryRepository";
import { WebPreviewLocalRecommendationRepository } from "@/db/webPreview/WebPreviewLocalRecommendationRepository";
import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";

import type { StartWorkoutDependencies } from "./startWorkout";

export type WorkoutPersistence = StartWorkoutDependencies & {
  exerciseHistoryRepository: ExerciseHistoryRepository;
};

export async function createWorkoutPersistence(): Promise<WorkoutPersistence> {
  return {
    exerciseHistoryRepository: new WebPreviewExerciseHistoryRepository(),
    recommendationRepository: new WebPreviewLocalRecommendationRepository(),
    templateRepository: new WebPreviewLocalTemplateRepository(),
    workoutRepository: new WebPreviewLocalWorkoutRepository(),
  };
}
