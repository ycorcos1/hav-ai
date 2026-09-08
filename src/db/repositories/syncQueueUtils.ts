import type { SyncEntityType, UUID } from "@/shared/contracts";

import type { LocalDatabaseConnection } from "../types";

export async function enqueueSyncUpsert(
  database: LocalDatabaseConnection,
  entityType: SyncEntityType,
  entityId: UUID,
  createdAt: string,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO sync_queue (
       id, entity_type, entity_id, operation, attempt_count,
       last_error, last_attempt_at, created_at
     ) VALUES (?, ?, ?, 'upsert', 0, NULL, NULL, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       operation='upsert', attempt_count=0, last_error=NULL, last_attempt_at=NULL;`,
    createUuid(),
    entityType,
    entityId,
    createdAt,
  );
}

export async function enqueueSyncDelete(
  database: LocalDatabaseConnection,
  entityType: SyncEntityType,
  entityId: UUID,
  createdAt: string,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO sync_queue (
       id, entity_type, entity_id, operation, attempt_count,
       last_error, last_attempt_at, created_at
     ) VALUES (?, ?, ?, 'delete', 0, NULL, NULL, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       operation='delete', attempt_count=0, last_error=NULL, last_attempt_at=NULL;`,
    createUuid(),
    entityType,
    entityId,
    createdAt,
  );
}

export async function removeSyncMutation(
  database: LocalDatabaseConnection,
  entityType: SyncEntityType,
  entityId: UUID,
): Promise<void> {
  await database.runAsync(
    "DELETE FROM sync_queue WHERE entity_type = ? AND entity_id = ?;",
    entityType,
    entityId,
  );
}

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
