import { WebPreviewLocalExerciseRepository } from "@/db/webPreview/WebPreviewLocalExerciseRepository";
import { WebPreviewLocalUserExercisePreferenceRepository } from "@/db/webPreview/WebPreviewLocalUserExercisePreferenceRepository";
import type {
  LocalExerciseRepository,
  LocalUserExercisePreferenceRepository,
} from "@/db/repositories/types";

export type ExercisePersistence = {
  exerciseRepository: LocalExerciseRepository;
  preferenceRepository: LocalUserExercisePreferenceRepository;
};

export async function createExercisePersistence(): Promise<ExercisePersistence> {
  return {
    exerciseRepository: new WebPreviewLocalExerciseRepository(),
    preferenceRepository: new WebPreviewLocalUserExercisePreferenceRepository(),
  };
}
