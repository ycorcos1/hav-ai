import type { WorkoutSet } from "@/shared/contracts";

import { workoutSetFromRow, workoutSetToRow } from "../mappers";
import type { LocalWorkoutSetRow } from "../mappers";
import type { TransactionalLocalDatabaseConnection } from "../types";
import { metadataForUpsert, placeholders } from "./repositoryUtils";
import type { LocalSetRepository } from "./types";

const columns = [
  "id", "user_id", "workout_id", "workout_exercise_id", "exercise_id", "position",
  "set_type", "weight_kg", "reps", "rpe", "notes", "completed_at", "sync_status",
  "deleted_at", "created_at", "updated_at", "server_updated_at",
];

export class SQLiteLocalSetRepository implements LocalSetRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async getById(userId: string, id: string): Promise<WorkoutSet | null> {
    const row = await this.database.getFirstAsync<LocalWorkoutSetRow>(
      "SELECT * FROM local_sets WHERE id = ? AND user_id = ? AND deleted_at IS NULL;", id, userId,
    );
    return row ? workoutSetFromRow(row) : null;
  }

  async getForWorkoutExercise(userId: string, workoutExerciseId: string): Promise<WorkoutSet[]> {
    const rows = await this.database.getAllAsync<LocalWorkoutSetRow>(
      `SELECT * FROM local_sets WHERE user_id = ? AND workout_exercise_id = ?
       AND deleted_at IS NULL ORDER BY position ASC;`, userId, workoutExerciseId,
    );
    return rows.map(workoutSetFromRow);
  }

  async create(set: WorkoutSet): Promise<void> { await this.save(set); }
  async update(set: WorkoutSet): Promise<void> { await this.save(set); }

  private async save(set: WorkoutSet): Promise<void> {
    const parent = await this.database.getFirstAsync<{ user_id: string }>(
      `SELECT user_id FROM local_workout_exercises
       WHERE id=? AND workout_id=? AND exercise_id=? AND user_id=?;`,
      set.workoutExerciseId, set.workoutId, set.exerciseId, set.userId,
    );
    if (!parent) throw new Error("Set ancestry is not accessible to its user.");
    const metadata = await metadataForUpsert(this.database, "local_sets", "user_id", set.userId, set.id);
    const row = workoutSetToRow(set, metadata);
    const values = columns.map((column) => row[column as keyof LocalWorkoutSetRow]);
    await this.database.runAsync(
      `INSERT INTO local_sets (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
       ON CONFLICT(id) DO UPDATE SET
         workout_id=excluded.workout_id, workout_exercise_id=excluded.workout_exercise_id,
         exercise_id=excluded.exercise_id, position=excluded.position, set_type=excluded.set_type,
         weight_kg=excluded.weight_kg, reps=excluded.reps, rpe=excluded.rpe, notes=excluded.notes,
         completed_at=excluded.completed_at, sync_status=excluded.sync_status,
         deleted_at=NULL, updated_at=excluded.updated_at
       WHERE local_sets.user_id=excluded.user_id;`, ...values,
    );
  }

  async deleteOrTombstone(userId: string, id: string): Promise<void> {
    const row = await this.database.getFirstAsync<{ sync_status: string }>(
      "SELECT sync_status FROM local_sets WHERE id = ? AND user_id = ?;", id, userId,
    );
    if (!row) return;
    if (row.sync_status === "pending_create") {
      await this.database.runAsync("DELETE FROM local_sets WHERE id = ? AND user_id = ?;", id, userId);
      return;
    }
    const deletedAt = new Date().toISOString();
    await this.database.runAsync(
      `UPDATE local_sets SET sync_status='pending_delete', deleted_at=?, updated_at=?
       WHERE id=? AND user_id=?;`, deletedAt, deletedAt, id, userId,
    );
  }
}
