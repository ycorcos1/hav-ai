import type { ISODateTime, UserExercisePreference } from "@/shared/contracts";

import { userExercisePreferenceFromRow, userExercisePreferenceToRow } from "../mappers";
import type { LocalUserExercisePreferenceRow } from "../mappers";
import type { TransactionalLocalDatabaseConnection } from "../types";
import { metadataForUpsert, placeholders } from "./repositoryUtils";
import { enqueueSyncDelete, enqueueSyncUpsert, removeSyncMutation } from "./syncQueueUtils";
import type {
  CloudUserExercisePreferenceSnapshot,
  LocalUserExercisePreferenceHydrationRepository,
  LocalUserExercisePreferenceRepository,
  UserExercisePreferenceReconciliationResult,
} from "./types";

const columns = ["id", "user_id", "exercise_id", "is_favorite", "notes", "rest_duration_seconds", "sync_status", "deleted_at", "created_at", "updated_at", "server_updated_at"];

export class SQLiteLocalUserExercisePreferenceRepository
implements LocalUserExercisePreferenceRepository, LocalUserExercisePreferenceHydrationRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async get(userId: string, exerciseId: string): Promise<UserExercisePreference | null> {
    const row = await this.database.getFirstAsync<LocalUserExercisePreferenceRow>(
      `SELECT * FROM local_user_exercise_preferences
       WHERE user_id=? AND exercise_id=? AND deleted_at IS NULL;`, userId, exerciseId,
    );
    return row ? userExercisePreferenceFromRow(row) : null;
  }

  async listFavorites(userId: string): Promise<UserExercisePreference[]> {
    const rows = await this.database.getAllAsync<LocalUserExercisePreferenceRow>(
      `SELECT * FROM local_user_exercise_preferences
       WHERE user_id=? AND is_favorite=1 AND deleted_at IS NULL ORDER BY updated_at DESC;`, userId,
    );
    return rows.map(userExercisePreferenceFromRow);
  }

  async upsert(preference: UserExercisePreference): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const accessibleExercise = await transaction.getFirstAsync<{ id: string }>(
        `SELECT id FROM local_exercises
         WHERE id=? AND (is_system=1 OR owner_user_id=?);`,
        preference.exerciseId, preference.userId,
      );
      if (!accessibleExercise) {
        throw new Error("Exercise preference references an inaccessible exercise.");
      }
      const existing = await transaction.getFirstAsync<LocalUserExercisePreferenceRow>(
        `SELECT * FROM local_user_exercise_preferences
         WHERE user_id=? AND exercise_id=?;`,
        preference.userId,
        preference.exerciseId,
      );
      const metadata = await metadataForUpsert(
        transaction,
        "local_user_exercise_preferences",
        "user_id",
        preference.userId,
        existing?.id ?? preference.id,
      );
      const row = userExercisePreferenceToRow({
        ...preference,
        id: existing?.id ?? preference.id,
        createdAt: existing?.created_at ?? preference.createdAt,
      }, metadata);
      await transaction.runAsync(
        `INSERT INTO local_user_exercise_preferences (${columns.join(", ")})
         VALUES (${placeholders(columns.length)})
         ON CONFLICT(user_id, exercise_id) DO UPDATE SET
           is_favorite=excluded.is_favorite, notes=excluded.notes,
           rest_duration_seconds=excluded.rest_duration_seconds,
           sync_status=CASE WHEN local_user_exercise_preferences.sync_status='pending_create'
             THEN 'pending_create' ELSE 'pending_update' END,
           deleted_at=NULL, updated_at=excluded.updated_at
         WHERE local_user_exercise_preferences.user_id=excluded.user_id;`,
        ...columns.map((column) => row[column as keyof LocalUserExercisePreferenceRow]),
      );
      await enqueueSyncUpsert(
        transaction,
        preference.userId,
        "user_exercise_preference",
        row.id,
        preference.updatedAt,
      );
    });
  }

  async setFavorite(userId: string, id: string, isFavorite: boolean, updatedAt: ISODateTime) {
    await this.updateOneField(userId, id, "is_favorite", isFavorite ? 1 : 0, updatedAt);
  }

  async setNotes(userId: string, id: string, notes: string | undefined, updatedAt: ISODateTime) {
    await this.updateOneField(userId, id, "notes", notes ?? null, updatedAt);
  }

  async setRestDuration(
    userId: string,
    id: string,
    seconds: number | undefined,
    updatedAt: ISODateTime,
  ) {
    if (seconds !== undefined && seconds <= 0) throw new Error("Rest duration must be positive.");
    await this.updateOneField(userId, id, "rest_duration_seconds", seconds ?? null, updatedAt);
  }

  private async updateOneField(
    userId: string,
    id: string,
    column: "is_favorite" | "notes" | "rest_duration_seconds",
    value: number | string | null,
    updatedAt: ISODateTime,
  ) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE local_user_exercise_preferences SET ${column}=?, updated_at=?, deleted_at=NULL,
         sync_status=CASE WHEN sync_status='pending_create'
           THEN 'pending_create' ELSE 'pending_update' END
         WHERE id=? AND user_id=?;`,
        value,
        updatedAt,
        id,
        userId,
      );
      const row = await transaction.getFirstAsync<{ id: string }>(
        "SELECT id FROM local_user_exercise_preferences WHERE id=? AND user_id=?;",
        id,
        userId,
      );
      if (row) {
        await enqueueSyncUpsert(
          transaction,
          userId,
          "user_exercise_preference",
          id,
          updatedAt,
        );
      }
    });
  }

  async deleteOrTombstone(userId: string, id: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<{ sync_status: string }>(
        "SELECT sync_status FROM local_user_exercise_preferences WHERE id=? AND user_id=?;",
        id,
        userId,
      );
      if (!row) return;
      if (row.sync_status === "pending_create") {
        await removeSyncMutation(transaction, userId, "user_exercise_preference", id);
        await transaction.runAsync(
          "DELETE FROM local_user_exercise_preferences WHERE id=? AND user_id=?;",
          id,
          userId,
        );
        return;
      }
      const deletedAt = new Date().toISOString();
      await transaction.runAsync(
        `UPDATE local_user_exercise_preferences
         SET deleted_at=?, updated_at=?, sync_status='pending_delete'
         WHERE id=? AND user_id=?;`,
        deletedAt,
        deletedAt,
        id,
        userId,
      );
      await enqueueSyncDelete(
        transaction,
        userId,
        "user_exercise_preference",
        id,
        deletedAt,
      );
    });
  }

  async reconcileFromCloud(
    userId: string,
    snapshots: readonly CloudUserExercisePreferenceSnapshot[],
  ): Promise<UserExercisePreferenceReconciliationResult> {
    validateCloudSnapshots(userId, snapshots);
    const result: UserExercisePreferenceReconciliationResult = {
      hydrated: 0,
      removed: 0,
      preservedDirty: 0,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const existingRows = await transaction.getAllAsync<LocalUserExercisePreferenceRow>(
        "SELECT * FROM local_user_exercise_preferences WHERE user_id=?;",
        userId,
      );
      const cloudKeys = new Set(snapshots.map(({ preference }) => preference.exerciseId));
      for (const snapshot of snapshots) {
        const accessibleExercise = await transaction.getFirstAsync<{ id: string }>(
          `SELECT id FROM local_exercises
           WHERE id=? AND (is_system=1 OR owner_user_id=?);`,
          snapshot.preference.exerciseId,
          userId,
        );
        if (!accessibleExercise) {
          throw new Error("Cloud exercise preference references an inaccessible exercise.");
        }
        const existing = existingRows.find((row) =>
          row.exercise_id === snapshot.preference.exerciseId);
        if (existing && existing.sync_status !== "synced") {
          result.preservedDirty += 1;
          continue;
        }
        if (existing && existing.id !== snapshot.preference.id) {
          await transaction.runAsync(
            "DELETE FROM local_user_exercise_preferences WHERE id=? AND user_id=?;",
            existing.id,
            userId,
          );
        }
        const row = userExercisePreferenceToRow(snapshot.preference, {
          syncStatus: "synced",
          serverUpdatedAt: snapshot.serverUpdatedAt,
        });
        await transaction.runAsync(
          `INSERT INTO local_user_exercise_preferences (${columns.join(", ")})
           VALUES (${placeholders(columns.length)})
           ON CONFLICT(user_id, exercise_id) DO UPDATE SET
             id=excluded.id, is_favorite=excluded.is_favorite, notes=excluded.notes,
             rest_duration_seconds=excluded.rest_duration_seconds, sync_status='synced',
             deleted_at=NULL, created_at=excluded.created_at, updated_at=excluded.updated_at,
             server_updated_at=excluded.server_updated_at
           WHERE local_user_exercise_preferences.user_id=excluded.user_id;`,
          ...columns.map((column) => row[column as keyof LocalUserExercisePreferenceRow]),
        );
        result.hydrated += 1;
      }
      for (const existing of existingRows) {
        if (cloudKeys.has(existing.exercise_id)) continue;
        if (existing.sync_status !== "synced") {
          result.preservedDirty += 1;
          continue;
        }
        await transaction.runAsync(
          "DELETE FROM local_user_exercise_preferences WHERE id=? AND user_id=?;",
          existing.id,
          userId,
        );
        result.removed += 1;
      }
    });
    return result;
  }
}

function validateCloudSnapshots(
  userId: string,
  snapshots: readonly CloudUserExercisePreferenceSnapshot[],
): void {
  const ids = snapshots.map(({ preference }) => preference.id);
  const exerciseIds = snapshots.map(({ preference }) => preference.exerciseId);
  if (snapshots.some(({ preference }) => preference.userId !== userId)
    || new Set(ids).size !== ids.length
    || new Set(exerciseIds).size !== exerciseIds.length) {
    throw new Error("Cloud exercise preference ownership or identity is invalid.");
  }
}
