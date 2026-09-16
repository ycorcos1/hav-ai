import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalExerciseRepository,
  SQLiteLocalSyncEntityStore,
  SQLiteSyncDependencyResolver,
  SQLiteSyncQueueRepository,
} from "@/db";
import {
  PushSyncEngine,
  SyncEngineLock,
  type RemoteSyncGateway,
  type SyncMutation,
} from "@/features/sync/services";
import type { Exercise, RemoteMutationResult } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const createdAt = "2026-09-15T21:00:00.000Z";
const updatedAt = "2026-09-15T21:05:00.000Z";
const serverTime = "2026-09-15T21:10:00.000Z";
const systemExercise: Exercise = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Barbell Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt,
  updatedAt: createdAt,
};
const customExercise: Exercise = {
  ...systemExercise,
  id: "fa000000-0000-4000-8000-000000000001",
  ownerUserId: userId,
  name: "My Press",
  isSystem: false,
};

describe("custom exercise synchronization", () => {
  it("queues only the latest local custom exercise state and preserves its UUID remotely", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalExerciseRepository(database);
      await repository.upsert(systemExercise);
      await repository.upsert(customExercise);
      await repository.upsert({
        ...customExercise,
        name: "My Updated Press",
        secondaryMuscleGroups: ["shoulders", "triceps"],
        updatedAt,
      });

      await expect(database.getAllAsync(
        `SELECT entity_type, entity_id, operation
         FROM sync_queue ORDER BY entity_type, entity_id;`,
      )).resolves.toEqual([{
        entity_type: "custom_exercise",
        entity_id: customExercise.id,
        operation: "upsert",
      }]);

      const gateway = new ExerciseMemoryGateway();
      await expect(sync(database, gateway)).resolves.toMatchObject({
        success: true,
        succeeded: 1,
        remainingQueueSize: 0,
      });
      expect(gateway.exercise).toMatchObject({
        id: customExercise.id,
        ownerUserId: userId,
        name: "My Updated Press",
        secondaryMuscleGroups: ["shoulders", "triceps"],
      });
      await expect(database.getFirstAsync<{ sync_status: string }>(
        "SELECT sync_status FROM local_exercises WHERE id=?;",
        customExercise.id,
      )).resolves.toEqual({ sync_status: "synced" });
    } finally {
      database.close();
    }
  });

  it("queues and converges custom archive state without ever queuing system exercises", async () => {
    const database = await openDatabase();
    try {
      const repository = new SQLiteLocalExerciseRepository(database);
      const gateway = new ExerciseMemoryGateway();
      await repository.upsert(systemExercise);
      await repository.upsert(customExercise);
      await sync(database, gateway);

      await repository.archiveCustomExercise(userId, customExercise.id);
      await repository.archiveCustomExercise("foreign-user", customExercise.id);
      await expect(database.getAllAsync<{ entity_id: string; entity_type: string }>(
        "SELECT entity_type, entity_id FROM sync_queue;",
      )).resolves.toEqual([{
        entity_type: "custom_exercise",
        entity_id: customExercise.id,
      }]);

      await sync(database, gateway);
      expect(gateway.exercise).toMatchObject({ id: customExercise.id, isArchived: true });
      expect(gateway.calls).not.toContain(systemExercise.id);
    } finally {
      database.close();
    }
  });
});

async function openDatabase(): Promise<NodeSQLiteConnection> {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  return database;
}

async function sync(
  database: NodeSQLiteConnection,
  gateway: RemoteSyncGateway,
) {
  return new PushSyncEngine(
    userId,
    {
      canAttemptRequest: async () => true,
      getAuthenticatedUserId: async () => userId,
    },
    new SQLiteSyncQueueRepository(database, userId),
    new SQLiteSyncDependencyResolver(database, userId),
    new SQLiteLocalSyncEntityStore(database, userId),
    gateway,
    new SyncEngineLock(),
  ).synchronize();
}

class ExerciseMemoryGateway implements RemoteSyncGateway {
  readonly calls: string[] = [];
  exercise: Exercise | undefined;

  async apply(mutation: SyncMutation): Promise<RemoteMutationResult> {
    if (mutation.operation !== "upsert" || mutation.entityType !== "custom_exercise") {
      throw new Error("Unexpected non-custom-exercise synchronization mutation.");
    }
    this.calls.push(mutation.entity.id);
    this.exercise = structuredClone(mutation.entity);
    return { serverUpdatedAt: serverTime };
  }
}
