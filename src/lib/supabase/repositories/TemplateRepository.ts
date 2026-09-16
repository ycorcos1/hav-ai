import type { CloudTemplateSnapshot } from "@/db/repositories";
import type {
  RemoteMutationResult,
  UUID,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "@/shared/contracts";

export interface TemplateRepository {
  archiveOwnTemplate(id: UUID): Promise<RemoteMutationResult>;
  deleteOwnTemplateExercise(id: UUID): Promise<void>;
  fetchOwnTemplates(): Promise<CloudTemplateSnapshot[]>;
  upsertOwnTemplate(template: WorkoutTemplate): Promise<RemoteMutationResult>;
  upsertOwnTemplateExercise(
    exercise: WorkoutTemplateExercise,
  ): Promise<RemoteMutationResult>;
}

export type TemplateRepositoryOperation =
  | "archiveOwnTemplate"
  | "deleteOwnTemplateExercise"
  | "fetchOwnTemplates"
  | "upsertOwnTemplate"
  | "upsertOwnTemplateExercise";

export class TemplateRepositoryError extends Error {
  readonly code = "TEMPLATE_REPOSITORY_ERROR";

  constructor(readonly operation: TemplateRepositoryOperation) {
    super(`Template repository operation failed: ${operation}.`);
    this.name = "TemplateRepositoryError";
  }
}
