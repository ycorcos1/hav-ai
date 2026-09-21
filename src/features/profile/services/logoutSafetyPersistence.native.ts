import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteLocalSyncEntityStore,
  SQLiteSyncDependencyResolver,
  SQLiteSyncQueueRepository,
} from "@/db/repositories";
import { networkStatusService } from "@/features/network/networkStatusService";
import { PushSyncEngine, SyncEngineLock } from "@/features/sync/services";
import { authService, SupabaseRemoteSyncGateway } from "@/lib/supabase/services";
import type { SyncResult, UUID } from "@/shared/contracts";

const syncLock = new SyncEngineLock<SyncResult>();

export async function countPendingSyncItems(userId: UUID): Promise<number> {
  const database = await bootstrapLocalDatabase();
  return (await new SQLiteSyncQueueRepository(database, userId).getPending()).length;
}

export async function synchronizePendingItems(userId: UUID): Promise<SyncResult> {
  const database = await bootstrapLocalDatabase();
  const queue = new SQLiteSyncQueueRepository(database, userId);
  return new PushSyncEngine(
    userId,
    {
      canAttemptRequest: async () => await networkStatusService.getCurrentStatus() === "online",
      getAuthenticatedUserId: async () => (await authService.getSession())?.user.id ?? null,
    },
    queue,
    new SQLiteSyncDependencyResolver(database, userId),
    new SQLiteLocalSyncEntityStore(database, userId),
    new SupabaseRemoteSyncGateway(),
    syncLock,
  ).synchronize();
}
