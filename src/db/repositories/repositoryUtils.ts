import type { LocalSyncStatus } from "@/shared/contracts";

import type { LocalDatabaseConnection } from "../types";

type SyncRow = { sync_status: LocalSyncStatus; server_updated_at: string | null };

export async function metadataForUpsert(
  database: LocalDatabaseConnection,
  table: string,
  userColumn: string,
  userId: string,
  id: string,
) {
  const row = await database.getFirstAsync<SyncRow>(
    `SELECT sync_status, server_updated_at FROM ${table} WHERE id = ? AND ${userColumn} = ?;`,
    id,
    userId,
  );

  return {
    syncStatus: row?.sync_status === "pending_create" ? "pending_create" : row ? "pending_update" : "pending_create",
    serverUpdatedAt: row?.server_updated_at ?? undefined,
  } as const;
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}
