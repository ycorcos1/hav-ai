import type {
  LocalExerciseRepository,
  LocalTemplateRepository,
} from "@/db/repositories/types";
import { WebPreviewLocalExerciseRepository } from "@/db/webPreview/WebPreviewLocalExerciseRepository";
import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";

export type TemplatePersistence = {
  exerciseRepository: LocalExerciseRepository;
  templateRepository: LocalTemplateRepository;
};

export async function createTemplatePersistence(): Promise<TemplatePersistence> {
  return {
    exerciseRepository: new WebPreviewLocalExerciseRepository(),
    templateRepository: new WebPreviewLocalTemplateRepository(),
  };
}
