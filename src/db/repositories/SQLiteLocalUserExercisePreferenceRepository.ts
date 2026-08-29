import type { ISODateTime, UserExercisePreference } from "@/shared/contracts";

import { userExercisePreferenceFromRow, userExercisePreferenceToRow } from "../mappers";
import type { LocalUserExercisePreferenceRow } from "../mappers";
import type { TransactionalLocalDatabaseConnection } from "../types";
import { metadataForUpsert, placeholders } from "./repositoryUtils";
import type { LocalUserExercisePreferenceRepository } from "./types";

const columns = ["id", "user_id", "exercise_id", "is_favorite", "notes", "rest_duration_seconds", "sync_status", "deleted_at", "created_at", "updated_at", "server_updated_at"];

export class SQLiteLocalUserExercisePreferenceRepository
implements LocalUserExercisePreferenceRepository {
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
    const accessibleExercise = await this.database.getFirstAsync<{ id: string }>(
      `SELECT id FROM local_exercises
       WHERE id=? AND (is_system=1 OR owner_user_id=?);`,
      preference.exerciseId, preference.userId,
    );
    if (!accessibleExercise) throw new Error("Exercise preference references an inaccessible exercise.");
    const metadata = await metadataForUpsert(this.database, "local_user_exercise_preferences", "user_id", preference.userId, preference.id);
    const row = userExercisePreferenceToRow(preference, metadata);
    await this.database.runAsync(
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
    await this.database.runAsync(
      `UPDATE local_user_exercise_preferences SET ${column}=?, updated_at=?, deleted_at=NULL,
       sync_status=CASE WHEN sync_status='pending_create' THEN 'pending_create' ELSE 'pending_update' END
       WHERE id=? AND user_id=?;`, value, updatedAt, id, userId,
    );
  }

  async deleteOrTombstone(userId: string, id: string): Promise<void> {
    const row = await this.database.getFirstAsync<{ sync_status: string }>(
      "SELECT sync_status FROM local_user_exercise_preferences WHERE id=? AND user_id=?;", id, userId,
    );
    if (!row) return;
    if (row.sync_status === "pending_create") {
      await this.database.runAsync("DELETE FROM local_user_exercise_preferences WHERE id=? AND user_id=?;", id, userId);
      return;
    }
    const deletedAt = new Date().toISOString();
    await this.database.runAsync(
      `UPDATE local_user_exercise_preferences SET deleted_at=?, updated_at=?, sync_status='pending_delete'
       WHERE id=? AND user_id=?;`, deletedAt, deletedAt, id, userId,
    );
  }
}
