import {
  exerciseFromRow,
  progressionRecommendationFromRow,
  userExercisePreferenceFromRow,
  workoutSetFromRow,
  workoutTemplateExerciseFromRow,
} from "@/db/mappers";
import type {
  LocalExerciseRow,
  LocalProgressionRecommendationRow,
  LocalUserExercisePreferenceRow,
  LocalWorkoutSetRow,
  LocalWorkoutTemplateExerciseRow,
} from "@/db/mappers";
import type {
  LocalSyncEntityStore,
  SyncMutation,
  SyncUpsertMutation,
} from "@/features/sync/services";
import type {
  RemoteMutationResult,
  SyncEntityType,
  SyncQueueItem,
  UUID,
} from "@/shared/contracts";

import type { TransactionalLocalDatabaseConnection } from "../types";
import { SQLiteLocalTemplateRepository } from "./SQLiteLocalTemplateRepository";
import { SQLiteLocalWorkoutRepository } from "./SQLiteLocalWorkoutRepository";

export class SQLiteLocalSyncEntityStore implements LocalSyncEntityStore {
  constructor(
    private readonly database: TransactionalLocalDatabaseConnection,
    private readonly userId: UUID,
  ) {}

  async loadLatest(item: SyncQueueItem): Promise<SyncMutation | null> {
    if (item.operation === "delete") {
      return { entityType: item.entityType, entityId: item.entityId, operation: "delete" };
    }

    switch (item.entityType) {
      case "workout_template": {
        const entity = await new SQLiteLocalTemplateRepository(this.database)
          .getById(this.userId, item.entityId);
        return entity ? { entityType: item.entityType, operation: "upsert", entity } : null;
      }
      case "workout_template_exercise": {
        const row = await this.ownedRow<LocalWorkoutTemplateExerciseRow>(
          "local_workout_template_exercises", "user_id", item.entityId,
        );
        return row
          ? { entityType: item.entityType, operation: "upsert", entity: workoutTemplateExerciseFromRow(row) }
          : null;
      }
      case "custom_exercise": {
        const row = await this.ownedRow<LocalExerciseRow>(
          "local_exercises", "owner_user_id", item.entityId, " AND is_system = 0",
        );
        return row
          ? { entityType: item.entityType, operation: "upsert", entity: exerciseFromRow(row) }
          : null;
      }
      case "workout": {
        const entity = await new SQLiteLocalWorkoutRepository(this.database)
          .getById(this.userId, item.entityId);
        return entity ? { entityType: item.entityType, operation: "upsert", entity } : null;
      }
      case "workout_exercise": {
        const row = await this.ownedRow<{ workout_id: UUID }>(
          "local_workout_exercises", "user_id", item.entityId,
        );
        const workout = row
          ? await new SQLiteLocalWorkoutRepository(this.database).getById(this.userId, row.workout_id)
          : null;
        const entity = workout?.exercises.find(({ id }) => id === item.entityId);
        return entity ? { entityType: item.entityType, operation: "upsert", entity } : null;
      }
      case "set": {
        const row = await this.ownedRow<LocalWorkoutSetRow>(
          "local_sets", "user_id", item.entityId, " AND deleted_at IS NULL",
        );
        return row
          ? { entityType: item.entityType, operation: "upsert", entity: workoutSetFromRow(row) }
          : null;
      }
      case "user_exercise_preference": {
        const row = await this.ownedRow<LocalUserExercisePreferenceRow>(
          "local_user_exercise_preferences", "user_id", item.entityId,
          " AND deleted_at IS NULL",
        );
        return row
          ? { entityType: item.entityType, operation: "upsert", entity: userExercisePreferenceFromRow(row) }
          : null;
      }
      case "progression_recommendation": {
        const row = await this.ownedRow<LocalProgressionRecommendationRow>(
          "local_progression_recommendations", "user_id", item.entityId,
        );
        return row
          ? { entityType: item.entityType, operation: "upsert", entity: progressionRecommendationFromRow(row) }
          : null;
      }
    }
  }

  async confirmUpsert(
    item: SyncQueueItem,
    mutation: SyncUpsertMutation,
    result: RemoteMutationResult,
  ): Promise<boolean> {
    const lookup = tableLookup(item.entityType);
    let confirmed = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE ${lookup.table}
         SET sync_status = 'synced', server_updated_at = COALESCE(?, server_updated_at)
         WHERE id = ? AND ${lookup.ownerColumn} = ? AND updated_at = ?;`,
        result.serverUpdatedAt ?? null,
        item.entityId,
        this.userId,
        mutation.entity.updatedAt,
      );
      const row = await transaction.getFirstAsync<{ sync_status: string }>(
        `SELECT sync_status FROM ${lookup.table}
         WHERE id = ? AND ${lookup.ownerColumn} = ? AND updated_at = ?;`,
        item.entityId,
        this.userId,
        mutation.entity.updatedAt,
      );
      confirmed = row?.sync_status === "synced";
    });
    return confirmed;
  }

  async confirmDelete(item: SyncQueueItem): Promise<boolean> {
    const table = deletableTable(item.entityType);
    let confirmed = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<{ sync_status: string }>(
        `SELECT sync_status FROM ${table} WHERE id = ? AND user_id = ?;`,
        item.entityId,
        this.userId,
      );
      if (!row) {
        confirmed = true;
        return;
      }
      if (row.sync_status !== "pending_delete") return;
      await transaction.runAsync(
        `DELETE FROM ${table} WHERE id = ? AND user_id = ? AND sync_status = 'pending_delete';`,
        item.entityId,
        this.userId,
      );
      confirmed = true;
    });
    return confirmed;
  }

  private ownedRow<Row>(
    table: string,
    ownerColumn: "owner_user_id" | "user_id",
    id: UUID,
    additionalPredicate = "",
  ): Promise<Row | null> {
    return this.database.getFirstAsync<Row>(
      `SELECT * FROM ${table}
       WHERE id = ? AND ${ownerColumn} = ?${additionalPredicate};`,
      id,
      this.userId,
    );
  }
}

function tableLookup(entityType: SyncEntityType): {
  ownerColumn: "owner_user_id" | "user_id";
  table: string;
} {
  switch (entityType) {
    case "workout_template":
      return ownedTable("local_workout_templates");
    case "workout_template_exercise":
      return ownedTable("local_workout_template_exercises");
    case "custom_exercise":
      return { table: "local_exercises", ownerColumn: "owner_user_id" };
    case "workout":
      return ownedTable("local_workouts");
    case "workout_exercise":
      return ownedTable("local_workout_exercises");
    case "set":
      return ownedTable("local_sets");
    case "user_exercise_preference":
      return ownedTable("local_user_exercise_preferences");
    case "progression_recommendation":
      return ownedTable("local_progression_recommendations");
  }
}

function deletableTable(entityType: SyncEntityType): string {
  switch (entityType) {
    case "workout_template_exercise":
      return "local_workout_template_exercises";
    case "set":
      return "local_sets";
    case "user_exercise_preference":
      return "local_user_exercise_preferences";
    default:
      throw new Error("Sync delete confirmation is not supported for this entity type.");
  }
}

function ownedTable(table: string): {
  ownerColumn: "user_id";
  table: string;
} {
  return { table, ownerColumn: "user_id" };
}
