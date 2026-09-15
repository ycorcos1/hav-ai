import type { CloudExerciseSnapshot } from "@/db/repositories";

export interface ExerciseRepository {
  fetchAccessible(): Promise<CloudExerciseSnapshot[]>;
}

export type ExerciseRepositoryOperation = "fetchAccessible";

export class ExerciseRepositoryError extends Error {
  readonly code = "EXERCISE_REPOSITORY_ERROR";

  constructor(readonly operation: ExerciseRepositoryOperation) {
    super(`Exercise repository operation failed: ${operation}.`);
    this.name = "ExerciseRepositoryError";
  }
}
