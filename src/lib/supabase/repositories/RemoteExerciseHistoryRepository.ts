import type { CachedRecentExerciseSession } from "@/db/repositories";

export interface RemoteExerciseHistoryRepository {
  fetchOwnCompletedSessions(): Promise<CachedRecentExerciseSession[]>;
}

export class RemoteExerciseHistoryRepositoryError extends Error {
  readonly code = "REMOTE_EXERCISE_HISTORY_REPOSITORY_ERROR";

  constructor() {
    super("Remote exercise history operation failed: fetchOwnCompletedSessions.");
    this.name = "RemoteExerciseHistoryRepositoryError";
  }
}
