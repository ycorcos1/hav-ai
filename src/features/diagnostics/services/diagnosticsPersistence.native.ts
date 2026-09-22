import {
  bootstrapLocalDatabase,
  getLocalSchemaVersion,
  SQLiteLocalWorkoutRepository,
  SQLiteSyncQueueRepository,
} from "@/db";
import type { SyncQueueItem, UUID } from "@/shared/contracts";

export type PersistenceDiagnostics = {
  activeWorkoutId?: UUID;
  pendingItems: SyncQueueItem[];
  schemaVersion: string;
};

export async function loadPersistenceDiagnostics(
  userId: UUID,
): Promise<PersistenceDiagnostics> {
  const database = await bootstrapLocalDatabase();
  const [schemaVersion, activeWorkout, pendingItems] = await Promise.all([
    getLocalSchemaVersion(database),
    new SQLiteLocalWorkoutRepository(database).getActiveForUser(userId),
    new SQLiteSyncQueueRepository(database, userId).getPending(),
  ]);
  return {
    ...(activeWorkout ? { activeWorkoutId: activeWorkout.id } : {}),
    pendingItems,
    schemaVersion: String(schemaVersion),
  };
}
