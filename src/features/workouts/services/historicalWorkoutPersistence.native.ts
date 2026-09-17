import { bootstrapLocalDatabase } from "@/db";
import {
  enqueueSyncDelete,
  removeSyncMutation,
} from "@/db/repositories/syncQueueUtils";
import type { TransactionalLocalDatabaseConnection } from "@/db/types";
import type { LocalSyncStatus } from "@/shared/contracts";

import type {
  HistoricalWorkoutDeleteResult,
  HistoricalWorkoutPersistence,
} from "./historicalWorkoutPersistenceTypes";

type WorkoutRow = {
  server_updated_at: string | null;
  status: string;
  sync_status: LocalSyncStatus;
  user_id: string;
};

export class SQLiteHistoricalWorkoutPersistence implements HistoricalWorkoutPersistence {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async deleteCompletedWorkout(
    userId: string,
    workoutId: string,
    deletedAt: string,
  ): Promise<HistoricalWorkoutDeleteResult> {
    let result: HistoricalWorkoutDeleteResult = { exerciseIds: [], status: "missing" };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const workout = await transaction.getFirstAsync<WorkoutRow>(
        "SELECT user_id, status, sync_status, server_updated_at FROM local_workouts WHERE id=?;",
        workoutId,
      );
      if (!workout || workout.user_id !== userId || workout.status !== "completed") return;
      const exercises = await transaction.getAllAsync<{ exercise_id: string; id: string }>(
        "SELECT id, exercise_id FROM local_workout_exercises WHERE workout_id=? AND user_id=?;",
        workoutId,
        userId,
      );
      const sets = await transaction.getAllAsync<{ id: string }>(
        "SELECT id FROM local_sets WHERE workout_id=? AND user_id=?;",
        workoutId,
        userId,
      );
      const cloudKnown = workout.server_updated_at !== null
        || workout.sync_status === "synced"
        || workout.sync_status === "pending_update"
        || workout.sync_status === "pending_delete";

      await transaction.runAsync(
        "DELETE FROM local_workouts WHERE id=? AND user_id=? AND status='completed';",
        workoutId,
        userId,
      );
      await transaction.runAsync(
        "DELETE FROM cached_recent_exercise_sessions WHERE workout_id=? AND user_id=?;",
        workoutId,
        userId,
      );
      for (const set of sets) {
        await removeSyncMutation(transaction, userId, "set", set.id);
      }
      for (const exercise of exercises) {
        await removeSyncMutation(transaction, userId, "workout_exercise", exercise.id);
      }
      await removeSyncMutation(transaction, userId, "workout", workoutId);
      if (cloudKnown) {
        await enqueueSyncDelete(transaction, userId, "workout", workoutId, deletedAt);
      }
      result = {
        exerciseIds: [...new Set(exercises.map(({ exercise_id }) => exercise_id))],
        status: cloudKnown ? "queued-delete" : "deleted-local",
      };
    });
    return result;
  }
}

export async function createHistoricalWorkoutPersistence(): Promise<HistoricalWorkoutPersistence> {
  return new SQLiteHistoricalWorkoutPersistence(await bootstrapLocalDatabase());
}
