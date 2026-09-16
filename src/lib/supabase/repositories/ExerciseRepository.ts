import type { CloudExerciseSnapshot } from "@/db/repositories";
import type { Exercise, RemoteMutationResult } from "@/shared/contracts";

export interface ExerciseRepository {
  fetchAccessible(): Promise<CloudExerciseSnapshot[]>;
  upsertOwnCustomExercise(exercise: Exercise): Promise<RemoteMutationResult>;
}

export type ExerciseRepositoryOperation = "fetchAccessible" | "upsertOwnCustomExercise";

export class ExerciseRepositoryError extends Error {
  readonly code = "EXERCISE_REPOSITORY_ERROR";

  constructor(readonly operation: ExerciseRepositoryOperation) {
    super(`Exercise repository operation failed: ${operation}.`);
    this.name = "ExerciseRepositoryError";
  }
}
