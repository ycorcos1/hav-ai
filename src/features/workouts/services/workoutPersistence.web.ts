import type {
  ExerciseHistoryRepository,
  LocalExerciseRepository,
  LocalProfileCacheRepository,
  WorkoutHistoryRepository,
  ProgressHistoryRepository,
} from "@/db/repositories/types";
import { WebPreviewExerciseHistoryRepository } from "@/db/webPreview/WebPreviewExerciseHistoryRepository";
import { WebPreviewLocalExerciseRepository } from "@/db/webPreview/WebPreviewLocalExerciseRepository";
import { WebPreviewLocalProfileCacheRepository } from "@/db/webPreview/WebPreviewLocalProfileCacheRepository";
import { WebPreviewLocalRecommendationRepository } from "@/db/webPreview/WebPreviewLocalRecommendationRepository";
import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";

import type { StartWorkoutDependencies } from "./startWorkout";
import type { ActiveWorkoutStructureRepository } from "./activeWorkoutMutations";

export type WorkoutPersistence = StartWorkoutDependencies & {
  exerciseHistoryRepository: ExerciseHistoryRepository;
  exerciseRepository: LocalExerciseRepository;
  profileCacheRepository: LocalProfileCacheRepository;
  workoutHistoryRepository: WorkoutHistoryRepository;
  progressHistoryRepository: ProgressHistoryRepository;
  workoutRepository: ActiveWorkoutStructureRepository;
};

export async function createWorkoutPersistence(): Promise<WorkoutPersistence> {
  return {
    exerciseHistoryRepository: new WebPreviewExerciseHistoryRepository(),
    exerciseRepository: new WebPreviewLocalExerciseRepository(),
    profileCacheRepository: new WebPreviewLocalProfileCacheRepository(),
    recommendationRepository: new WebPreviewLocalRecommendationRepository(),
    templateRepository: new WebPreviewLocalTemplateRepository(),
    workoutRepository: new WebPreviewLocalWorkoutRepository(),
    workoutHistoryRepository: new WebPreviewLocalWorkoutRepository(),
    progressHistoryRepository: new WebPreviewExerciseHistoryRepository(),
  };
}
