import { WebPreviewLocalRecommendationRepository } from "@/db/webPreview/WebPreviewLocalRecommendationRepository";
import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";

import type { StartWorkoutDependencies } from "./startWorkout";

export type WorkoutPersistence = StartWorkoutDependencies;

export async function createWorkoutPersistence(): Promise<WorkoutPersistence> {
  return {
    recommendationRepository: new WebPreviewLocalRecommendationRepository(),
    templateRepository: new WebPreviewLocalTemplateRepository(),
    workoutRepository: new WebPreviewLocalWorkoutRepository(),
  };
}
