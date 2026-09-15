import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteLocalSetRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";
import {
  enqueueSyncDelete,
  enqueueSyncUpsert,
  removeSyncMutation,
} from "@/db/repositories/syncQueueUtils";
import type { TransactionalLocalDatabaseConnection } from "@/db/types";
import type { LocalSyncStatus, WorkoutSet } from "@/shared/contracts";

import type { SetDeleteResult, SetPersistence } from "./setPersistenceTypes";

type SetSyncRow = {
  deleted_at: string | null;
  server_updated_at: string | null;
  sync_status: LocalSyncStatus;
  user_id: string;
};

export class SQLiteSetPersistence implements SetPersistence {
  readonly setRepository: SQLiteLocalSetRepository;
  readonly workoutRepository: SQLiteLocalWorkoutRepository;

  constructor(private readonly database: TransactionalLocalDatabaseConnection) {
    this.setRepository = new SQLiteLocalSetRepository(database);
    this.workoutRepository = new SQLiteLocalWorkoutRepository(database);
  }

  async commitCompletedSet(set: WorkoutSet): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new SQLiteLocalSetRepository(transaction).create(set);
      await enqueueSyncUpsert(transaction, set.userId, "set", set.id, set.completedAt);
    });
  }

  async commitEditedSet(set: WorkoutSet): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new SQLiteLocalSetRepository(transaction).update(set);
      await enqueueSyncUpsert(transaction, set.userId, "set", set.id, set.updatedAt);
    });
  }

  async deleteCompletedSet(
    userId: string,
    setId: string,
    deletedAt: string,
  ): Promise<SetDeleteResult> {
    let result: SetDeleteResult = "missing";
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<SetSyncRow>(
        `SELECT user_id, sync_status, deleted_at, server_updated_at
         FROM local_sets WHERE id = ?;`,
        setId,
      );
      if (!row || row.deleted_at) return;
      if (row.user_id !== userId) {
        throw new Error("Set ancestry is not accessible to its user.");
      }

      const cloudKnown = row.server_updated_at !== null
        || row.sync_status === "synced"
        || row.sync_status === "pending_update"
        || row.sync_status === "pending_delete";
      if (!cloudKnown) {
        await transaction.runAsync(
          "DELETE FROM local_sets WHERE id = ? AND user_id = ?;",
          setId,
          userId,
        );
        await removeSyncMutation(transaction, userId, "set", setId);
        result = "deleted-local";
        return;
      }

      await transaction.runAsync(
        `UPDATE local_sets SET sync_status='pending_delete', deleted_at=?, updated_at=?
         WHERE id=? AND user_id=?;`,
        deletedAt,
        deletedAt,
        setId,
        userId,
      );
      await enqueueSyncDelete(transaction, userId, "set", setId, deletedAt);
      result = "tombstoned";
    });
    return result;
  }
}

export async function createSetPersistence(): Promise<SetPersistence> {
  return new SQLiteSetPersistence(await bootstrapLocalDatabase());
}
