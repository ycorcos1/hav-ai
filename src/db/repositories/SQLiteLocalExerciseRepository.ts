import type { Exercise } from "@/shared/contracts";

import { exerciseFromRow, exerciseToRow } from "../mappers";
import type { LocalExerciseRow } from "../mappers";
import type { TransactionalLocalDatabaseConnection } from "../types";
import { metadataForUpsert, placeholders } from "./repositoryUtils";
import type {
  CloudExerciseSnapshot,
  CloudHydrationResult,
  LocalExerciseHydrationRepository,
  LocalExerciseRepository,
} from "./types";

const columns = ["id", "owner_user_id", "name", "primary_muscle_group", "secondary_muscle_groups_json", "equipment_type", "measurement_type", "is_system", "is_archived", "sync_status", "created_at", "updated_at", "server_updated_at"];

export class SQLiteLocalExerciseRepository
implements LocalExerciseRepository, LocalExerciseHydrationRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async getById(userId: string, id: string): Promise<Exercise | null> {
    const row = await this.database.getFirstAsync<LocalExerciseRow>(
      "SELECT * FROM local_exercises WHERE id=? AND (is_system=1 OR owner_user_id=?);", id, userId,
    );
    return row ? exerciseFromRow(row) : null;
  }

  async listAccessible(userId: string): Promise<Exercise[]> {
    const rows = await this.database.getAllAsync<LocalExerciseRow>(
      "SELECT * FROM local_exercises WHERE (is_system=1 OR owner_user_id=?) AND is_archived=0 ORDER BY name COLLATE NOCASE;", userId,
    );
    return rows.map(exerciseFromRow);
  }

  async search(userId: string, query: string): Promise<Exercise[]> {
    const rows = await this.database.getAllAsync<LocalExerciseRow>(
      `SELECT * FROM local_exercises WHERE (is_system=1 OR owner_user_id=?)
       AND is_archived=0 AND instr(lower(name), lower(?)) > 0 ORDER BY name COLLATE NOCASE;`,
      userId, query,
    );
    return rows.map(exerciseFromRow);
  }

  async upsert(exercise: Exercise): Promise<void> {
    const metadata = exercise.isSystem
      ? { syncStatus: "synced" as const }
      : await metadataForUpsert(this.database, "local_exercises", "owner_user_id", exercise.ownerUserId ?? "", exercise.id);
    const row = exerciseToRow(exercise, metadata);
    await this.database.runAsync(
      `INSERT INTO local_exercises (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
       ON CONFLICT(id) DO UPDATE SET name=excluded.name,
         primary_muscle_group=excluded.primary_muscle_group,
         secondary_muscle_groups_json=excluded.secondary_muscle_groups_json,
         equipment_type=excluded.equipment_type, measurement_type=excluded.measurement_type,
         is_archived=excluded.is_archived, sync_status=excluded.sync_status,
         updated_at=excluded.updated_at
       WHERE (local_exercises.is_system=1 AND excluded.is_system=1)
          OR (local_exercises.is_system=0 AND excluded.is_system=0
              AND local_exercises.owner_user_id=excluded.owner_user_id);`,
      ...columns.map((column) => row[column as keyof LocalExerciseRow]),
    );
  }

  async archiveCustomExercise(userId: string, id: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE local_exercises SET is_archived=1,
       sync_status=CASE WHEN sync_status='pending_create' THEN 'pending_create' ELSE 'pending_update' END
       WHERE id=? AND owner_user_id=? AND is_system=0;`, id, userId,
    );
  }

  async hydrateFromCloud(
    userId: string,
    snapshot: CloudExerciseSnapshot,
  ): Promise<CloudHydrationResult> {
    const { exercise, serverUpdatedAt } = snapshot;
    if ((!exercise.isSystem && exercise.ownerUserId !== userId)
      || (exercise.isSystem && exercise.ownerUserId !== undefined)) {
      throw new Error("Cloud exercise ownership does not match the hydration user.");
    }

    let result: CloudHydrationResult = "hydrated";
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const existing = await transaction.getFirstAsync<Pick<
        LocalExerciseRow,
        "is_system" | "owner_user_id" | "sync_status"
      >>("SELECT is_system, owner_user_id, sync_status FROM local_exercises WHERE id=?;", exercise.id);

      if (existing) {
        const sameIdentity = existing.is_system === Number(exercise.isSystem)
          && existing.owner_user_id === (exercise.ownerUserId ?? null);
        if (!sameIdentity) {
          throw new Error("Cloud exercise identity does not match the local exercise.");
        }
        if (!exercise.isSystem && existing.sync_status !== "synced") {
          result = "preserved_dirty";
          return;
        }
      }

      const row = exerciseToRow(exercise, { syncStatus: "synced", serverUpdatedAt });
      await transaction.runAsync(
        `INSERT INTO local_exercises (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
         ON CONFLICT(id) DO UPDATE SET owner_user_id=excluded.owner_user_id,
           name=excluded.name, primary_muscle_group=excluded.primary_muscle_group,
           secondary_muscle_groups_json=excluded.secondary_muscle_groups_json,
           equipment_type=excluded.equipment_type, measurement_type=excluded.measurement_type,
           is_system=excluded.is_system, is_archived=excluded.is_archived,
           sync_status='synced', created_at=excluded.created_at,
           updated_at=excluded.updated_at, server_updated_at=excluded.server_updated_at;`,
        ...columns.map((column) => row[column as keyof LocalExerciseRow]),
      );
    });
    return result;
  }
}
