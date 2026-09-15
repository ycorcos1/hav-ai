import type {
  SyncEntityType,
  SyncQueueItem,
  UUID,
} from "@/shared/contracts";

import type { LocalDatabaseConnection } from "../types";
import type { SyncQueueRepository } from "./types";

type SyncQueueRow = {
  id: UUID;
  user_id: UUID;
  entity_type: SyncEntityType;
  entity_id: UUID;
  operation: SyncQueueItem["operation"];
  attempt_count: number;
  last_error: string | null;
  last_attempt_at: string | null;
  created_at: string;
};

export class SQLiteSyncQueueRepository implements SyncQueueRepository {
  constructor(
    private readonly database: LocalDatabaseConnection,
    private readonly userId: UUID,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async enqueueOrCoalesce(item: SyncQueueItem): Promise<void> {
    if (!await ownsEntity(this.database, this.userId, item.entityType, item.entityId)) {
      throw new Error("Sync queue entity is not accessible to its user.");
    }
    await this.database.runAsync(
      `INSERT INTO sync_queue (
         id, user_id, entity_type, entity_id, operation, attempt_count,
         last_error, last_attempt_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET
         operation=excluded.operation,
         attempt_count=0,
         last_error=NULL,
         last_attempt_at=NULL;`,
      item.id,
      this.userId,
      item.entityType,
      item.entityId,
      item.operation,
      item.attemptCount,
      item.lastError ?? null,
      item.lastAttemptAt ?? null,
      item.createdAt,
    );
  }

  async getPending(): Promise<SyncQueueItem[]> {
    const rows = await this.database.getAllAsync<SyncQueueRow>(
      `SELECT * FROM sync_queue
       WHERE user_id = ?
       ORDER BY created_at ASC, id ASC;`,
      this.userId,
    );
    return rows.map(queueItemFromRow);
  }

  async markAttempt(id: UUID, error?: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE sync_queue
       SET attempt_count=attempt_count + 1, last_error=?, last_attempt_at=?
       WHERE id=? AND user_id=?;`,
      error ?? null,
      this.now(),
      id,
      this.userId,
    );
  }

  async remove(id: UUID): Promise<void> {
    await this.database.runAsync(
      "DELETE FROM sync_queue WHERE id=? AND user_id=?;",
      id,
      this.userId,
    );
  }
}

async function ownsEntity(
  database: LocalDatabaseConnection,
  userId: UUID,
  entityType: SyncEntityType,
  entityId: UUID,
): Promise<boolean> {
  const lookup = entityOwnerLookup(entityType);
  const row = await database.getFirstAsync<{ owner_id: string | null }>(
    `SELECT ${lookup.ownerColumn} AS owner_id
     FROM ${lookup.table}
     WHERE id = ?${lookup.additionalPredicate};`,
    entityId,
  );
  return row?.owner_id === userId;
}

function entityOwnerLookup(entityType: SyncEntityType): {
  additionalPredicate: string;
  ownerColumn: "owner_user_id" | "user_id";
  table: string;
} {
  switch (entityType) {
    case "workout_template":
      return tableOwner("local_workout_templates");
    case "workout_template_exercise":
      return tableOwner("local_workout_template_exercises");
    case "custom_exercise":
      return {
        table: "local_exercises",
        ownerColumn: "owner_user_id",
        additionalPredicate: " AND is_system = 0",
      };
    case "workout":
      return tableOwner("local_workouts");
    case "workout_exercise":
      return tableOwner("local_workout_exercises");
    case "set":
      return tableOwner("local_sets");
    case "user_exercise_preference":
      return tableOwner("local_user_exercise_preferences");
    case "progression_recommendation":
      return tableOwner("local_progression_recommendations");
  }
}

function tableOwner(table: string) {
  return { table, ownerColumn: "user_id" as const, additionalPredicate: "" };
}

function queueItemFromRow(row: SyncQueueRow): SyncQueueItem {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
    lastAttemptAt: row.last_attempt_at ?? undefined,
    lastError: row.last_error ?? undefined,
  };
}
